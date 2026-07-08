import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const scheduleDir = join(root, "outputs");
const schedulePath = join(scheduleDir, "schedule-queue.json");

export async function saveScheduleJobs(jobs = []) {
  await mkdir(scheduleDir, { recursive: true });
  const existing = await listScheduleJobs();
  const merged = [...jobs, ...existing].filter(
    (job, index, array) => array.findIndex((item) => item.id === job.id) === index
  );
  await writeScheduleJobs(merged);
  return merged;
}

export async function writeScheduleJobs(jobs = []) {
  await mkdir(scheduleDir, { recursive: true });
  await writeFile(schedulePath, JSON.stringify(jobs, null, 2), "utf8");
  return jobs;
}

export async function listScheduleJobs() {
  try {
    return JSON.parse(await readFile(schedulePath, "utf8"));
  } catch {
    return [];
  }
}
