import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const runsDir = join(root, "outputs", "runs");

export async function saveRun(run) {
  await mkdir(runsDir, { recursive: true });
  const filename = `${run.generatedAt.replace(/[:.]/g, "-")}-${run.contentId}.json`;
  const path = join(runsDir, filename);
  const stored = {
    ...run,
    storedAt: new Date().toISOString(),
    storagePath: path
  };
  await writeFile(path, JSON.stringify(stored, null, 2), "utf8");
  return stored;
}

export async function listRuns() {
  await mkdir(runsDir, { recursive: true });
  const files = (await readdir(runsDir)).filter((file) => file.endsWith(".json")).sort().reverse();
  const runs = [];
  for (const file of files.slice(0, 30)) {
    const path = join(runsDir, file);
    try {
      const run = JSON.parse(await readFile(path, "utf8"));
      if (!String(run.contentId || "").startsWith("content_")) continue;
      runs.push({
        contentId: run.contentId,
        generatedAt: run.generatedAt,
        primaryKeyword: run.input?.primaryKeyword,
        category: run.input?.category,
        template: run.selectedTemplate?.name,
        qualityScore: run.qualityReport?.score,
        path
      });
    } catch {
      runs.push({ path, error: "Could not read run JSON" });
    }
  }
  return runs;
}
