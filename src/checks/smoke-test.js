import { runContentLoop, runOutlineLoop } from "../core/pipeline.js";
import { getIntegrationStatus, runAllAdapters } from "../integrations/live-adapters.js";
import { buildPublishPackage } from "../core/package-exporter.js";
import { listExecutions, saveExecution } from "../storage/execution-store.js";
import { listModelArtifacts, saveModelArtifacts } from "../storage/model-artifact-store.js";
import { listPerformanceSnapshots, savePerformanceSnapshot } from "../storage/performance-store.js";
import { saveScheduleJobs } from "../storage/schedule-store.js";
import { dispatchDueJobs } from "../core/schedule-dispatcher.js";

const result = runContentLoop({
  channel: "owned-blog",
  category: "medical",
  primaryKeyword: "마운자로 처방 조건",
  brandName: "테스트 클리닉",
  productName: "비만 치료 상담",
  leadGoal: "상담 신청"
});

const techResult = runContentLoop({
  channel: "owned-blog",
  category: "ax-trends",
  primaryKeyword: "AI 에이전트 도입 전략",
  brandName: "The Moonlight",
  productName: "AX 컨설팅 및 AI 에이전트 구축",
  leadGoal: "도입 상담 신청",
  anthropicModel: "claude-opus-4-8"
});

const outlineResult = runOutlineLoop({
  channel: "owned-blog",
  category: "ax-trends",
  primaryKeyword: "AI 에이전트 도입 전략",
  brandName: "The Moonlight",
  productName: "AX 컨설팅 및 AI 에이전트 구축",
  leadGoal: "도입 상담 신청",
  anthropicModel: "claude-opus-4-8"
});

const failures = [];

if (!result.contentId) failures.push("missing contentId");
if (!result.selectedTemplate?.id) failures.push("missing selected template");
if (!result.architecture?.h1) failures.push("missing h1");
if (!result.humanized?.markdown?.includes("# ")) failures.push("missing markdown article");
if (!result.humanized?.audit?.grade) failures.push("missing humanization audit grade");
if (result.humanized?.audit?.after?.severityCounts?.S1 > 0) {
  failures.push("humanization audit has S1 residue");
}
if (!result.imageBriefs?.length) failures.push("missing image briefs");
if (!result.conversion?.dataLayerEvent?.event) failures.push("missing GTM event");
if (!result.seoGates?.some((gate) => gate.id === "structured-data")) {
  failures.push("missing structured-data SEO gate");
}
if (!result.qualityReport?.score) failures.push("missing quality score");
if (!result.performanceSimulation?.actions?.length) failures.push("missing performance actions");
if (!result.keywordResearch?.candidates?.length) failures.push("missing keyword candidates");
if (!result.scheduleProposal?.jobs?.length) failures.push("missing schedule proposal");
if (!result.schemaValidation?.score) failures.push("missing schema validation");
if (!getIntegrationStatus().length) failures.push("missing integration status");
if (!techResult.selectedTemplate?.bestFor?.includes("ax-trends")) {
  failures.push("tech category did not select AX/IT template");
}
if (/(복용|병력|병원|시술|검사\/시술)/.test(techResult.humanized.markdown)) {
  failures.push("tech article leaked medical copy");
}
if (!techResult.architecture?.tableOfContents?.length) failures.push("missing table of contents");
if (!techResult.architecture?.htmlStructure?.length) failures.push("missing html export structure");
if (!techResult.imageBriefs?.every((image) => image.sectionId && image.placementAfterH2)) {
  failures.push("missing image placement metadata");
}
if (outlineResult.contentStage !== "outline-only") failures.push("outline loop is not outline-only");
if (outlineResult.humanized.markdown) failures.push("outline loop generated article body");
if (outlineResult.publishing.ownedBlog.status !== "outline-ready") {
  failures.push("outline publishing status is not outline-ready");
}

const adapterRun = await runAllAdapters(result);
if (!adapterRun.results?.length) failures.push("missing adapter run results");

const savedExecution = await saveExecution(result, adapterRun, { adapterId: "all" });
if (!savedExecution?.path) failures.push("missing saved execution path");
const executionHistory = await listExecutions();
if (!executionHistory.some((execution) => execution.id === savedExecution.id)) {
  failures.push("missing execution history item");
}

const modelArtifacts = await saveModelArtifacts(result, savedExecution);
if (!modelArtifacts?.files?.some((file) => file.filename === "manifest.json")) {
  failures.push("missing model artifact manifest");
}
const artifactHistory = await listModelArtifacts();
if (!artifactHistory.some((artifact) => artifact.artifactId === modelArtifacts.artifactId)) {
  failures.push("missing model artifact history item");
}

const savedSnapshot = await savePerformanceSnapshot({
  run: result,
  contentId: result.contentId,
  metrics: result.performanceSimulation.metrics,
  source: "smoke-test"
});
if (!savedSnapshot?.simulation?.actions?.length) failures.push("missing saved performance simulation");
const performanceHistory = await listPerformanceSnapshots();
if (!performanceHistory.some((snapshot) => snapshot.id === savedSnapshot.id)) {
  failures.push("missing performance history item");
}

await saveScheduleJobs([
  {
    id: `smoke_${result.contentId}`,
    channel: "owned-blog",
    category: result.input.category,
    primaryKeyword: result.input.primaryKeyword,
    brandName: result.input.brandName,
    productName: result.input.productName,
    leadGoal: result.input.leadGoal,
    publishAt: "2000-01-01T00:00:00.000Z",
    localTime: "2000. 01. 01. 09:00",
    status: "scheduled-draft",
    reason: "Smoke test due job",
    requiredBeforePublish: ["quality score >= 85"]
  }
]);
const dispatch = await dispatchDueJobs({ now: "2099-01-01T00:00:00.000Z", limit: 1 });
if (dispatch.dispatchedCount !== 1) failures.push("missing dispatched schedule job");
if (!dispatch.dispatched?.[0]?.execution?.id) failures.push("missing dispatch execution record");
if (!dispatch.dispatched?.[0]?.modelArtifacts?.artifactId) failures.push("missing dispatch model artifacts");

const publishPackage = buildPublishPackage(result);
if (!publishPackage.files["naver-derivative.json"]) failures.push("missing naver derivative");
if (!publishPackage.files["nextjs-props.json"]) failures.push("missing nextjs props");
if (!publishPackage.files["model-artifacts.json"]) failures.push("missing model artifact contract");

if (failures.length) {
  console.error(`Smoke test failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log("Smoke test passed");
