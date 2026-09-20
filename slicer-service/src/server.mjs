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
const TEMPLATE_PATH = "/app/templates/a2l_template.3mf";

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
    let bambuProjectFile = null;

    for (let i = 0; i < fileUrls.length; i++) {
      const url = fileUrls[i];
      const ext = (url.split("?")[0].split(".").pop() ?? "stl").toLowerCase();
      const dlRes = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!dlRes.ok)
        throw new Error(`Model download failed: HTTP ${dlRes.status}`);
      const modelBuf = Buffer.from(await dlRes.arrayBuffer());
      const localPath = path.join(tmpDir, `model_${i}.${ext}`);
      await fs.writeFile(localPath, modelBuf);

      if (ext === "3mf" && !bambuProjectFile) {
        try {
          const zip = new AdmZip(localPath);
          if (zip.getEntry("Metadata/project_settings.config")) {
            bambuProjectFile = localPath;
          } else {
            localFiles.push(localPath);
          }
        } catch {
          localFiles.push(localPath);
        }
      } else {
        localFiles.push(localPath);
      }
    }

    let jobProject = path.join(tmpDir, "job.3mf");
    const templateSource = bambuProjectFile || TEMPLATE_PATH;

    await patchTemplate(templateSource, jobProject, {
      layerHeight,
      infill,
      numColors,
    });

    let slicerArgs = [
      "--auto-servernum",
      "orca-slicer",
      "--slice",
      "0",
      "--arrange",
      "1",
    ];
    slicerArgs.push(jobProject);
    for (const file of localFiles) {
      slicerArgs.push("--load", file);
    }
    slicerArgs.push("--export-3mf", path.join(outputDir, "result.gcode.3mf"));

    await execFileAsync("xvfb-run", slicerArgs, {
      timeout: 180_000,
      env: { ...process.env, DISPLAY: ":99" },
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
      const gcodeHeader = zip.readAsText(entry).slice(0, 32_768);
      const stats = parseGcodeHeader(gcodeHeader);
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
    console.error(`[slicer] ${jobId} failed:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});

async function patchTemplate(
  templatePath,
  outputPath,
  { layerHeight, infill, numColors },
) {
  const zip = new AdmZip(templatePath);
  const settingsEntry = zip.getEntry("Metadata/project_settings.config");
  if (!settingsEntry)
    throw new Error("Template missing project_settings.config");

  const settings = JSON.parse(zip.readAsText(settingsEntry));
  settings.layer_height = String(layerHeight);
  settings.sparse_infill_density = `${infill}%`;

  if (numColors > 1 && settings.default_filament_profile) {
    const baseProfile = settings.default_filament_profile[0];
    settings.default_filament_profile = Array(numColors).fill(baseProfile);
    if (settings.filament_type) {
      settings.filament_type = Array(numColors).fill(
        settings.filament_type[0] ?? "PLA",
      );
    }
  }

  zip.updateFile(
    "Metadata/project_settings.config",
    Buffer.from(JSON.stringify(settings)),
  );
  zip.writeZip(outputPath);
}

function parseGcodeHeader(header) {
  const weightLine = header.match(/;\s*filament used \[g\] = (.+)/);
  const modelWeightLine = header.match(/;\s*model weight \[g\] = ([0-9.]+)/);
  const flushWeightLine = header.match(/;\s*flush weight \[g\] = ([0-9.]+)/);
  const wipeTowerWeightLine = header.match(
    /;\s*wipe tower weight \[g\] = ([0-9.]+)/,
  );
  const timeLine = header.match(
    /;\s*estimated printing time \(normal mode\) = (.+)/,
  );
  const layerLine = header.match(/;\s*total layers count = (\d+)/);

  const weightsPerColor = weightLine
    ? weightLine[1]
        .split(",")
        .map((s) => parseFloat(s.trim()))
        .filter((n) => !isNaN(n))
    : [0];

  const totalWeightGrams =
    Math.round(weightsPerColor.reduce((a, b) => a + b, 0) * 100) / 100;
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

  const timeStr = timeLine?.[1] ?? "";
  const hours = parseInt(timeStr.match(/(\d+)h/)?.[1] ?? "0");
  const mins = parseInt(timeStr.match(/(\d+)m/)?.[1] ?? "0");
  const estimatedMinutes = hours * 60 + mins;

  return {
    totalWeightGrams,
    modelWeightGrams,
    wasteWeightGrams,
    weightsPerColor,
    estimatedMinutes,
    layerCount: parseInt(layerLine?.[1] ?? "0"),
  };
}

app.listen(8080, "0.0.0.0", () => console.log("flux3d-slicer-api :8080 ready"));
