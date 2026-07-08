import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const executionsDir = join(root, "outputs", "executions");

export async function saveExecution(run, output, meta = {}) {
  await mkdir(executionsDir, { recursive: true });
  const executedAt = output.executedAt || new Date().toISOString();
  const safeTime = executedAt.replace(/[:.]/g, "-");
  const adapterKey = meta.adapterId || (output.adapterId ? output.adapterId : "all");
  const filename = `${safeTime}-${run.contentId}-${adapterKey}.json`;
  const path = join(executionsDir, filename);
  const results = Array.isArray(output.results) ? output.results : [output];
  const stored = {
    id: filename.replace(/\.json$/, ""),
    contentId: run.contentId,
    primaryKeyword: run.input?.primaryKeyword,
    category: run.input?.category,
    adapterId: adapterKey,
    executedAt,
    resultCount: results.length,
    ok: results.every((result) => result.ok !== false),
    modes: [...new Set(results.map((result) => result.mode).filter(Boolean))],
    results,
    storagePath: path
  };
  await writeFile(path, JSON.stringify(stored, null, 2), "utf8");
  return summarizeExecution(stored);
}

export async function listExecutions() {
  await mkdir(executionsDir, { recursive: true });
  const files = (await readdir(executionsDir))
    .filter((file) => file.endsWith(".json"))
    .sort()
    .reverse();
  const executions = [];
  for (const file of files.slice(0, 50)) {
    const path = join(executionsDir, file);
    try {
      const stored = JSON.parse(await readFile(path, "utf8"));
      executions.push(summarizeExecution(stored));
    } catch {
      executions.push({ path, error: "Could not read execution JSON" });
    }
  }
  return executions;
}

function summarizeExecution(stored) {
  return {
    id: stored.id,
    contentId: stored.contentId,
    primaryKeyword: stored.primaryKeyword,
    category: stored.category,
    adapterId: stored.adapterId,
    executedAt: stored.executedAt,
    resultCount: stored.resultCount,
    ok: stored.ok,
    modes: stored.modes,
    results: stored.results,
    path: stored.storagePath
  };
}
