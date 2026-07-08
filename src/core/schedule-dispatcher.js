import { runContentLoop } from "./pipeline.js";
import { runAllAdapters } from "../integrations/live-adapters.js";
import { saveExecution } from "../storage/execution-store.js";
import { saveModelArtifacts } from "../storage/model-artifact-store.js";
import { savePublishPackage } from "../storage/package-store.js";
import { saveRun } from "../storage/run-store.js";
import { listScheduleJobs, writeScheduleJobs } from "../storage/schedule-store.js";

const closedStatuses = new Set([
  "cancelled",
  "dispatched-dry-run",
  "dispatched-live",
  "published"
]);

export async function dispatchDueJobs(options = {}) {
  const now = parseDate(options.now) || new Date();
  const limit = Number.isFinite(Number(options.limit)) ? Number(options.limit) : 5;
  const queue = await listScheduleJobs();
  const dispatched = [];
  const updated = [];

  for (const job of queue) {
    if (dispatched.length >= limit || !isDue(job, now)) {
      updated.push(job);
      continue;
    }

    const run = await saveRun(runContentLoop(jobToInput(job)));
    const adapterId = "scheduled-all";
    const output = await runAllAdapters(run);
    const execution = await saveExecution(run, output, { adapterId });
    const modelArtifacts = await saveModelArtifacts(run, execution);
    const pkg = await savePublishPackage(run, { modelArtifacts });
    const modes = [...new Set(output.results.map((result) => result.mode).filter(Boolean))];
    const ok = output.results.every((result) => result.ok !== false);
    const dispatchedJob = {
      ...job,
      status: modes.includes("live") && ok ? "dispatched-live" : "dispatched-dry-run",
      dispatchedAt: new Date().toISOString(),
      runContentId: run.contentId,
      packagePath: pkg.path,
      executionId: execution.id,
      executionPath: execution.path,
      modelArtifactId: modelArtifacts.artifactId,
      modelArtifactPath: modelArtifacts.path,
      dispatchAdapterId: adapterId,
      dispatchMode: modes.join(", ") || "unknown",
      dispatchOk: ok
    };

    updated.push(dispatchedJob);
    dispatched.push({
      job: dispatchedJob,
      package: pkg,
      execution,
      modelArtifacts
    });
  }

  await writeScheduleJobs(updated);

  return {
    dispatchedAt: new Date().toISOString(),
    now: now.toISOString(),
    scanned: queue.length,
    dispatchedCount: dispatched.length,
    dispatched,
    queue: updated
  };
}

function isDue(job, now) {
  if (closedStatuses.has(job.status)) return false;
  const publishAt = parseDate(job.publishAt);
  return publishAt ? publishAt <= now : false;
}

function parseDate(value) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
}

function jobToInput(job) {
  return {
    channel: job.channel || "owned-blog",
    category: job.category || "ax-trends",
    primaryKeyword: job.primaryKeyword || "AI 에이전트 도입 전략",
    brandName: job.brandName || "The Moonlight",
    productName: job.productName || "AX 컨설팅 및 AI 에이전트 구축",
    leadGoal: job.leadGoal || "도입 상담 신청"
  };
}
