import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { simulatePerformanceLoop } from "../core/performance.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const performanceDir = join(root, "outputs", "performance");

export async function savePerformanceSnapshot({ run, contentId, metrics, source = "manual" }) {
  await mkdir(performanceDir, { recursive: true });
  const recordedAt = new Date().toISOString();
  const safeTime = recordedAt.replace(/[:.]/g, "-");
  const snapshotContentId = contentId || run?.contentId || "unassigned";
  const filename = `${safeTime}-${snapshotContentId}.json`;
  const path = join(performanceDir, filename);
  const simulation = simulatePerformanceLoop(metrics);
  const stored = {
    id: filename.replace(/\.json$/, ""),
    contentId: snapshotContentId,
    primaryKeyword: run?.input?.primaryKeyword || "",
    category: run?.input?.category || "",
    templateId: run?.selectedTemplate?.id || "",
    templateName: run?.selectedTemplate?.name || "",
    source,
    recordedAt,
    metrics: simulation.metrics,
    derived: simulation.derived,
    signals: simulation.signals,
    actions: simulation.actions,
    summary: simulation.summary,
    simulation,
    storagePath: path
  };
  await writeFile(path, JSON.stringify(stored, null, 2), "utf8");
  return summarizeSnapshot(stored);
}

export async function listPerformanceSnapshots(options = {}) {
  const contentId = String(options.contentId || "").trim();
  await mkdir(performanceDir, { recursive: true });
  const files = (await readdir(performanceDir))
    .filter((file) => file.endsWith(".json"))
    .sort()
    .reverse();
  const snapshots = [];
  for (const file of files.slice(0, 60)) {
    const path = join(performanceDir, file);
    try {
      const stored = JSON.parse(await readFile(path, "utf8"));
      if (contentId && stored.contentId !== contentId) continue;
      snapshots.push(summarizeSnapshot(stored));
    } catch {
      snapshots.push({ path, error: "Could not read performance JSON" });
    }
  }
  return snapshots;
}

function summarizeSnapshot(stored) {
  return {
    id: stored.id,
    contentId: stored.contentId,
    primaryKeyword: stored.primaryKeyword,
    category: stored.category,
    templateId: stored.templateId,
    templateName: stored.templateName,
    source: stored.source,
    recordedAt: stored.recordedAt,
    metrics: stored.metrics,
    derived: stored.derived,
    signals: stored.signals,
    actions: stored.actions,
    summary: stored.summary,
    simulation: stored.simulation,
    path: stored.storagePath
  };
}
