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

/**
 * POST /slice
 * Body: { fileUrl: string, layerHeight?: number, infill?: number, numColors?: number }
 * Returns: { totalWeightGrams, weightsPerColor[], estimatedMinutes, layerCount }
 */
app.post("/slice", async (req, res) => {
  const { fileUrl, layerHeight = 0.2, infill = 20, numColors = 1 } = req.body;
  if (!fileUrl) return res.status(400).json({ error: "fileUrl is required" });

  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const tmpDir = `/tmp/${jobId}`;
  const ext = (fileUrl.split("?")[0].split(".").pop() ?? "stl").toLowerCase();

  try {
    await fs.mkdir(tmpDir, { recursive: true });

    // 1. Download user's model from Supabase signed URL
    const dlRes = await fetch(fileUrl, { signal: AbortSignal.timeout(30_000) });
    if (!dlRes.ok)
      throw new Error(`Model download failed: HTTP ${dlRes.status}`);
    const modelBuf = Buffer.from(await dlRes.arrayBuffer());
    const modelFile = path.join(tmpDir, `model.${ext}`);
    await fs.writeFile(modelFile, modelBuf);

    // 2. Determine if the file is a Bambu Studio project or plain geometry
    const outputDir = path.join(tmpDir, "output");
    await fs.mkdir(outputDir, { recursive: true });

    let isBambuProject = false;
    let jobProject = path.join(tmpDir, "job.3mf");

    if (ext === "3mf") {
      try {
        const zip = new AdmZip(modelFile);
        if (zip.getEntry("Metadata/project_settings.config")) {
          isBambuProject = true;
        }
      } catch {
        // Invalid zip or just raw geometry
      }
    }

    let slicerArgs = ["--auto-servernum", "orca-slicer", "--slice", "1"];

    if (isBambuProject) {
      // Patch the user's uploaded Bambu project directly
      await patchTemplate(modelFile, jobProject, {
        layerHeight,
        infill,
        numColors,
      });
      slicerArgs.push(jobProject);
      slicerArgs.push("--export-3mf", path.join(outputDir, "result.gcode.3mf"));
    } else {
      // It's raw geometry (STL, OBJ, generic 3MF). Use A2L template.
      await patchTemplate(TEMPLATE_PATH, jobProject, {
        layerHeight,
        infill,
        numColors,
      });
      slicerArgs.push("--load", jobProject);
      slicerArgs.push("--export-3mf", path.join(outputDir, "result.gcode.3mf"));
      slicerArgs.push(modelFile);
    }

    // 3. Run OrcaSlicer headless with XVFB virtual display
    await execFileAsync("xvfb-run", slicerArgs, {
      timeout: 180_000,
      env: { ...process.env, DISPLAY: ":99" },
    });

    // 4. Find and read G-code from output ZIP
    const outputFiles = await fs.readdir(outputDir);
    const gcode3mf = outputFiles.find((f) => f.endsWith(".gcode.3mf"));
    if (!gcode3mf) throw new Error("No output .gcode.3mf found");

    const zip = new AdmZip(path.join(outputDir, gcode3mf));
    const gcodeEntry = zip
      .getEntries()
      .find((e) => e.entryName.endsWith(".gcode"));
    if (!gcodeEntry) throw new Error("No .gcode entry inside output ZIP");

    // Only need the first 32KB — all metadata lives in the G-code header
    const gcodeHeader = zip.readAsText(gcodeEntry).slice(0, 32_768);
    const result = parseGcodeHeader(gcodeHeader);

    res.json({ success: true, jobId, ...result });
  } catch (err) {
    console.error(`[slicer] ${jobId} failed:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});

/**
 * Patch template 3MF with job-specific layer height, infill, and color count.
 * Modifies project_settings.config inside the ZIP in-memory.
 */
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

  // Patch layer height
  settings.layer_height = String(layerHeight);

  // Patch infill (sparse_infill_density is a percentage string)
  settings.sparse_infill_density = `${infill}%`;

  // Patch filament count for AMS (replicate the first filament profile N times)
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

/**
 * Parse OrcaSlicer/Bambu Studio G-code header metadata.
 *
 * ; filament used [g]  = 14.21, 4.25, 2.63
 * ; estimated printing time (normal mode) = 2h 14m 33s
 */
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

  // If the slicer doesn't report explicit model/waste weights, fallback safely
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
    source: "orca-slicer-a2l",
  };
}

app.listen(8080, "0.0.0.0", () => console.log("flux3d-slicer-api :8080 ready"));
