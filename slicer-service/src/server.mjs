import express from "express";
import { execFile } from "child_process";
import AdmZip from "adm-zip";
import fs from "fs/promises";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const app = express();
app.use(express.json({ limit: "5mb" }));

const SLICER_SECRET = process.env.SLICER_SECRET ?? "";
// OrcaSlicer 2.3.0 ships these compatible system presets. The previous A2L
// template was created by a newer BambuStudio version and cannot be sliced by
// this Orca runtime.
const MACHINE_PROFILE =
  "/opt/orca-slicer/resources/profiles/BBL/machine/Bambu Lab X1 Carbon 0.4 nozzle.json";
const PROCESS_PROFILE =
  "/opt/orca-slicer/resources/profiles/BBL/process/0.20mm Standard @BBL X1C.json";
const FILAMENT_PROFILE =
  "/opt/orca-slicer/resources/profiles/BBL/filament/Bambu PLA Basic @BBL X1C.json";

// ── Auth middleware ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.path === "/health") return next();
  const auth = req.headers.authorization;
  if (!SLICER_SECRET || auth !== `Bearer ${SLICER_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

app.get("/health", (_req, res) =>
  res.json({ ok: true, engine: "orca-slicer" }),
);

app.post("/slice", async (req, res) => {
  let {
    fileUrl,
    fileUrls,
    layerHeight = 0.2,
    infill = 20,
    numColors = 1,
    scalePercent = 100,
    wallCount = 3,
    printSpeedMms,
    supports = false,
  } = req.body;
  if (!fileUrls && fileUrl) fileUrls = [fileUrl];
  if (!fileUrls || fileUrls.length === 0)
    return res.status(400).json({ error: "fileUrls is required" });

  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const tmpDir = `/tmp/${jobId}`;
  const outputDir = path.join(tmpDir, "output");

  try {
    await fs.mkdir(tmpDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });

    const localFiles = [];
    for (let i = 0; i < fileUrls.length; i++) {
      const url = fileUrls[i];
      const ext = (url.split("?")[0].split(".").pop() ?? "stl").toLowerCase();
      const dlRes = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!dlRes.ok)
        throw new Error(`Model download failed: HTTP ${dlRes.status}`);
      const modelBuf = Buffer.from(await dlRes.arrayBuffer());
      let localPath = path.join(tmpDir, `model_${i}.${ext}`);
      if (ext === "3mf") {
        try {
          const normalizedStl = convert3mfToStl(modelBuf);
          localPath = path.join(tmpDir, `model_${i}.stl`);
          await fs.writeFile(localPath, normalizedStl);
        } catch (conversionError) {
          console.warn(
            `[slicer] ${jobId}: 3MF normalization skipped:`,
            conversionError.message,
          );
          await fs.writeFile(localPath, modelBuf);
        }
      } else {
        await fs.writeFile(localPath, modelBuf);
      }

      localFiles.push(localPath);
    }

    await fs.mkdir("/tmp/orca-runtime", { recursive: true, mode: 0o700 });
    const processProfile = path.join(tmpDir, "process-profile.json");
    await createProcessProfile(processProfile, {
      layerHeight,
      infill,
      wallCount,
      printSpeedMms,
      supports,
    });

    let slicerArgs = [
      "--auto-servernum",
      "-s",
      "-screen 0 1280x1024x24",
      "orca-slicer",
      "--slice",
      "0",
      "--arrange",
      "1",
      "--load-settings",
      `${MACHINE_PROFILE};${processProfile}`,
      "--load-filaments",
      Array(Math.max(1, Math.min(4, Number(numColors) || 1)))
        .fill(FILAMENT_PROFILE)
        .join(";"),
    ];
    const safeScalePercent = Math.min(
      400,
      Math.max(25, Number(scalePercent) || 100),
    );
    if (safeScalePercent !== 100) {
      const scale = safeScalePercent / 100;
      // OrcaSlicer accepts one uniform scale factor (not an XYZ tuple).
      slicerArgs.push("--scale", String(scale));
    }
    // Model files are positional CLI arguments in OrcaSlicer 2.4.2.
    slicerArgs.push(...localFiles);
    slicerArgs.push("--export-3mf", path.join(outputDir, "result.gcode.3mf"));

    await execFileAsync("xvfb-run", slicerArgs, {
      timeout: 180_000,
      maxBuffer: 16 * 1024 * 1024,
      env: {
        ...process.env,
        DISPLAY: ":99",
        GDK_BACKEND: "x11",
        LIBGL_ALWAYS_SOFTWARE: "1",
        XDG_RUNTIME_DIR: "/tmp/orca-runtime",
      },
    });

    const outputFiles = await fs.readdir(outputDir);
    const gcode3mf = outputFiles.find((f) => f.endsWith(".gcode.3mf"));
    if (!gcode3mf) throw new Error("No output .gcode.3mf found");

    const zip = new AdmZip(path.join(outputDir, gcode3mf));

    const gcodeEntries = zip
      .getEntries()
      .filter(
        (e) =>
          e.entryName.startsWith("Metadata/plate_") &&
          e.entryName.endsWith(".gcode"),
      );

    // If no multi-plate found, fallback to any .gcode
    if (gcodeEntries.length === 0) {
      const anyGcode = zip
        .getEntries()
        .find((e) => e.entryName.endsWith(".gcode"));
      if (anyGcode) gcodeEntries.push(anyGcode);
    }

    if (gcodeEntries.length === 0)
      throw new Error("No .gcode entry inside output ZIP");

    let totalModelWeightGrams = 0;
    let totalWasteWeightGrams = 0;
    let totalEstimatedMinutes = 0;
    const plates = [];

    for (let i = 0; i < gcodeEntries.length; i++) {
      const entry = gcodeEntries[i];
      // Orca 2.3 writes material totals at the end of generated G-code.
      const stats = parseGcodeHeader(zip.readAsText(entry));
      plates.push({ plateIndex: i + 1, ...stats });

      totalModelWeightGrams += stats.modelWeightGrams;
      totalWasteWeightGrams += stats.wasteWeightGrams;
      totalEstimatedMinutes += stats.estimatedMinutes;
    }

    // Combine weights per color across plates
    const combinedWeightsPerColor = [];
    for (const plate of plates) {
      for (let c = 0; c < plate.weightsPerColor.length; c++) {
        combinedWeightsPerColor[c] =
          (combinedWeightsPerColor[c] || 0) + plate.weightsPerColor[c];
      }
    }

    const totalWeightGrams = totalModelWeightGrams + totalWasteWeightGrams;

    res.json({
      success: true,
      jobId,
      totalWeightGrams,
      modelWeightGrams: totalModelWeightGrams,
      wasteWeightGrams: totalWasteWeightGrams,
      estimatedMinutes: totalEstimatedMinutes,
      weightsPerColor: combinedWeightsPerColor,
      plates,
    });
  } catch (err) {
    const details = [err?.message, err?.stderr, err?.stdout]
      .filter(Boolean)
      .join("\n");
    console.error(`[slicer] ${jobId} failed:`, details);
    res.status(500).json({ success: false, error: details });
  } finally {
    fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});

async function createProcessProfile(
  outputPath,
  { layerHeight, infill, wallCount, printSpeedMms, supports },
) {
  const settings = JSON.parse(await fs.readFile(PROCESS_PROFILE, "utf8"));
  settings.layer_height = String(layerHeight);
  settings.sparse_infill_density = `${infill}%`;
  const safeWallCount = Math.min(
    8,
    Math.max(1, Math.round(Number(wallCount) || 3)),
  );
  settings.wall_loops = String(safeWallCount);
  if (Number.isFinite(Number(printSpeedMms)) && Number(printSpeedMms) > 0) {
    const speed = String(Number(printSpeedMms));
    settings.inner_wall_speed = Array.isArray(settings.inner_wall_speed)
      ? settings.inner_wall_speed.map(() => speed)
      : speed;
  }
  settings.enable_support = supports ? "1" : "0";
  // Required by Orca's relative-extrusion safety validation in headless mode.
  settings.layer_change_gcode = "G92 E0";
  await fs.writeFile(outputPath, JSON.stringify(settings));
}

function convert3mfToStl(modelBuffer) {
  const archive = new AdmZip(modelBuffer);
  const modelEntry = archive
    .getEntries()
    .find((entry) => /^3d\/[^/]+\.model$/i.test(entry.entryName));
  if (!modelEntry) throw new Error("3MF archive has no 3D model XML");

  const xml = modelEntry.getData().toString("utf8");
  const stl = ["solid flux3d"];
  const meshPattern = /<mesh\b[\s\S]*?<\/mesh>/gi;
  const meshes = xml.match(meshPattern) ?? [];
  for (const mesh of meshes) {
    const vertices = [
      ...mesh.matchAll(
        /<vertex\b[^>]*\bx="([^\"]+)"[^>]*\by="([^\"]+)"[^>]*\bz="([^\"]+)"[^>]*\/?\s*>/gi,
      ),
    ].map((match) => match.slice(1).map(Number));
    const triangles = [
      ...mesh.matchAll(
        /<triangle\b[^>]*\bv1="(\d+)"[^>]*\bv2="(\d+)"[^>]*\bv3="(\d+)"[^>]*\/?\s*>/gi,
      ),
    ].map((match) => match.slice(1).map(Number));
    for (const [a, b, c] of triangles) {
      const va = vertices[a];
      const vb = vertices[b];
      const vc = vertices[c];
      if (!va || !vb || !vc) continue;
      const ux = vb[0] - va[0];
      const uy = vb[1] - va[1];
      const uz = vb[2] - va[2];
      const vx = vc[0] - va[0];
      const vy = vc[1] - va[1];
      const vz = vc[2] - va[2];
      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;
      const length = Math.hypot(nx, ny, nz) || 1;
      stl.push(`facet normal ${nx / length} ${ny / length} ${nz / length}`);
      stl.push(" outer loop");
      stl.push(`  vertex ${va[0]} ${va[1]} ${va[2]}`);
      stl.push(`  vertex ${vb[0]} ${vb[1]} ${vb[2]}`);
      stl.push(`  vertex ${vc[0]} ${vc[1]} ${vc[2]}`);
      stl.push(" endloop", "endfacet");
    }
  }
  if (stl.length === 1)
    throw new Error("3MF model contains no renderable triangles");
  stl.push("endsolid flux3d");
  return Buffer.from(stl.join("\n"));
}

function parseGcodeHeader(header) {
  const weightLine = header.match(/;\s*filament used \[g\] = (.+)/);
  const volumeLine = header.match(/;\s*filament used \[cm3\] = ([0-9.]+)/);
  const modelWeightLine = header.match(/;\s*model weight \[g\] = ([0-9.]+)/);
  const flushWeightLine = header.match(/;\s*flush weight \[g\] = ([0-9.]+)/);
  const wipeTowerWeightLine = header.match(
    /;\s*wipe tower weight \[g\] = ([0-9.]+)/,
  );
  const timeLine = header.match(
    /;\s*estimated printing time \(normal mode\) = (.+)/,
  );
  const totalTimeLine = header.match(
    /;\s*model printing time:.*?total estimated time:\s*([^;\n]+)/,
  );
  const layerLine = header.match(
    /;\s*total (?:layers count|layer number): (\d+)/,
  );

  const weightsPerColor = weightLine
    ? weightLine[1]
        .split(",")
        .map((s) => parseFloat(s.trim()))
        .filter((n) => !isNaN(n))
    : [0];

  const reportedWeightGrams =
    Math.round(weightsPerColor.reduce((a, b) => a + b, 0) * 100) / 100;
  // The managed default is PLA (1.24g/cm3). Orca 2.3 reports exact volume
  // but omits grams when its system filament profile has no density value.
  const totalWeightGrams =
    reportedWeightGrams > 0
      ? reportedWeightGrams
      : Math.round(parseFloat(volumeLine?.[1] ?? "0") * 1.24 * 100) / 100;
  const reportedModelWeight = modelWeightLine
    ? parseFloat(modelWeightLine[1])
    : 0;
  const reportedFlushWeight = flushWeightLine
    ? parseFloat(flushWeightLine[1])
    : 0;
  const reportedWipeWeight = wipeTowerWeightLine
    ? parseFloat(wipeTowerWeightLine[1])
    : 0;

  const reportedWasteWeight =
    Math.round((reportedFlushWeight + reportedWipeWeight) * 100) / 100;

  const modelWeightGrams =
    reportedModelWeight > 0 ? reportedModelWeight : totalWeightGrams;
  const wasteWeightGrams =
    reportedWasteWeight > 0
      ? reportedWasteWeight
      : Math.max(0, totalWeightGrams - modelWeightGrams);

  const timeStr = totalTimeLine?.[1] ?? timeLine?.[1] ?? "";
  const hours = parseInt(timeStr.match(/(\d+)h/)?.[1] ?? "0");
  const mins = parseInt(timeStr.match(/(\d+)m/)?.[1] ?? "0");
  const estimatedMinutes = hours * 60 + mins;

  return {
    totalWeightGrams,
    modelWeightGrams,
    wasteWeightGrams,
    weightsPerColor:
      totalWeightGrams > 0 && weightsPerColor.every((weight) => weight === 0)
        ? [totalWeightGrams]
        : weightsPerColor,
    estimatedMinutes,
    layerCount: parseInt(layerLine?.[1] ?? "0"),
  };
}

app.listen(8080, "0.0.0.0", () => console.log("flux3d-slicer-api :8080 ready"));
