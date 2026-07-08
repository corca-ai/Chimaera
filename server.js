import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { applyClaudeOutline, runContentLoop, runOutlineLoop } from "./src/core/pipeline.js";
import { agentNodes, agentEdges, dataTables } from "./src/core/agents.js";
import { articleTemplates } from "./src/core/templates.js";
import { analyzeBenchmarkUrls } from "./src/core/benchmark-analyzer.js";
import { simulatePerformanceLoop } from "./src/core/performance.js";
import { suggestKeywords } from "./src/core/keyword-research.js";
import { proposeSchedule } from "./src/core/scheduler.js";
import { dispatchDueJobs } from "./src/core/schedule-dispatcher.js";
import { polishGeneratedMarkdown } from "./src/core/humanization.js";
import {
  enhanceInputField,
  generateClaudeOutline,
  getIntegrationStatus,
  rewriteSelectedText,
  runAllAdapters,
  runLiveAdapter,
  summarizeArticleRevision
} from "./src/integrations/live-adapters.js";
import { integrationAdapters } from "./src/integrations/adapters.js";
import { listRuns, saveRun } from "./src/storage/run-store.js";
import { listScheduleJobs, saveScheduleJobs } from "./src/storage/schedule-store.js";
import { listPreviews, readPreview, savePreview } from "./src/storage/preview-store.js";
import { listPublishPackages, readPackageFile, savePublishPackage } from "./src/storage/package-store.js";
import { listExecutions, saveExecution } from "./src/storage/execution-store.js";
import { listPerformanceSnapshots, savePerformanceSnapshot } from "./src/storage/performance-store.js";
import { listHistory, readHistoryItem } from "./src/storage/history-store.js";
import { listRevisions, readRevision, saveRevision } from "./src/storage/revision-store.js";
import {
  listModelArtifacts,
  modelArtifactMimeType,
  readModelArtifactFile,
  saveModelArtifacts
} from "./src/storage/model-artifact-store.js";

const root = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(root, "public");
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || "127.0.0.1";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function sendJson(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload, null, 2));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function safePublicPath(urlPath) {
  const pathname = decodeURIComponent(new URL(urlPath, "http://localhost").pathname);
  const requested = pathname === "/" ? "/index.html" : pathname;
  const fullPath = normalize(join(publicDir, requested));
  if (!fullPath.startsWith(publicDir)) return null;
  return fullPath;
}

function runForExport(input) {
  const sourceRun = input.run || runContentLoop(input.runInput || input);
  const bodyMarkdown = polishGeneratedMarkdown(input.bodyMarkdown || "");
  if (!bodyMarkdown) return sourceRun;

  const run = JSON.parse(JSON.stringify(sourceRun));
  run.humanized = {
    ...(run.humanized || {}),
    markdown: bodyMarkdown
  };
  run.publishing = {
    ...(run.publishing || {}),
    ownedBlog: {
      ...(run.publishing?.ownedBlog || {}),
      bodyMarkdown,
      status: "draft-ready"
    }
  };
  run.contentStage = "claude-body";
  run.writerStatus = "body-generated-by-claude";
  return run;
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || "/", "http://localhost");
    if (req.method === "GET" && req.url === "/api/system") {
      return sendJson(res, 200, {
        agentNodes,
        agentEdges,
        dataTables,
        articleTemplates,
        integrationAdapters
      });
    }

    if (req.method === "POST" && req.url === "/api/generate") {
      const input = await readBody(req);
      const run = await saveRun(runContentLoop(input));
      return sendJson(res, 200, run);
    }

    if (req.method === "POST" && req.url === "/api/outline") {
      const input = await readBody(req);
      const seedRun = runOutlineLoop(input);
      const claudeOutline = await generateClaudeOutline(seedRun);
      if (!claudeOutline.ok) {
        return sendJson(res, 502, {
          error: "Claude outline generation failed",
          details: {
            mode: claudeOutline.mode,
            status: claudeOutline.status,
            model: claudeOutline.model,
            message:
              typeof claudeOutline.error === "string"
                ? claudeOutline.error
                : claudeOutline.error?.message || "Unknown Claude outline error"
          }
        });
      }
      const run = await saveRun(applyClaudeOutline(seedRun, claudeOutline));
      return sendJson(res, 200, run);
    }

    if (req.method === "POST" && req.url === "/api/input/enhance") {
      const input = await readBody(req);
      const result = await enhanceInputField(input.input || input.runInput || input, input.fieldName);
      return sendJson(res, result.ok ? 200 : 400, result);
    }

    if (req.method === "POST" && req.url === "/api/editor/rewrite") {
      const input = await readBody(req);
      const result = await rewriteSelectedText(input);
      return sendJson(res, result.ok ? 200 : 400, result);
    }

    if (req.method === "POST" && req.url === "/api/editor/revision/save") {
      const input = await readBody(req);
      const summaryResult = input.summary
        ? { ok: true, summary: input.summary, model: input.model || "", mode: input.mode || "" }
        : await summarizeArticleRevision(input);
      const revision = await saveRevision({
        ...input,
        summary: summaryResult.summary,
        model: input.model || summaryResult.model,
        mode: input.mode || summaryResult.mode
      });
      return sendJson(res, 200, { revision, summary: summaryResult });
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/editor/revision/list") {
      return sendJson(res, 200, {
        revisions: await listRevisions({
          contentId: requestUrl.searchParams.get("contentId") || ""
        })
      });
    }

    if (req.method === "POST" && req.url === "/api/editor/revision/read") {
      const input = await readBody(req);
      return sendJson(res, 200, { revision: await readRevision(input) });
    }

    if (req.method === "GET" && req.url === "/api/runs") {
      return sendJson(res, 200, { runs: await listRuns() });
    }

    if (req.method === "POST" && req.url === "/api/preview/create") {
      const input = await readBody(req);
      const run = runForExport(input);
      const preview = await savePreview(run);
      return sendJson(res, 200, { preview, schemaValidation: run.schemaValidation });
    }

    if (req.method === "GET" && req.url === "/api/preview/list") {
      return sendJson(res, 200, { previews: await listPreviews() });
    }

    if (req.method === "POST" && req.url === "/api/package/create") {
      const input = await readBody(req);
      const run = runForExport(input);
      return sendJson(res, 200, { package: await savePublishPackage(run) });
    }

    if (req.method === "GET" && req.url === "/api/package/list") {
      return sendJson(res, 200, { packages: await listPublishPackages() });
    }

    if (req.method === "GET" && req.url?.startsWith("/packages/")) {
      const [, , contentId, filename] = req.url.split("/");
      const body = await readPackageFile(decodeURIComponent(contentId), decodeURIComponent(filename));
      const type = mimeTypes[extname(filename)] || "text/plain; charset=utf-8";
      res.writeHead(200, { "content-type": type });
      return res.end(body);
    }

    if (req.method === "GET" && req.url?.startsWith("/model-artifacts/")) {
      const [, , contentId, artifactId, filename] = req.url.split("/");
      const body = await readModelArtifactFile(
        decodeURIComponent(contentId),
        decodeURIComponent(artifactId),
        decodeURIComponent(filename)
      );
      res.writeHead(200, { "content-type": modelArtifactMimeType(filename) });
      return res.end(body);
    }

    if (req.method === "GET" && req.url?.startsWith("/previews/")) {
      const filename = decodeURIComponent(req.url.replace("/previews/", ""));
      const body = await readPreview(filename);
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(body);
    }

    if (req.method === "GET" && req.url === "/api/integrations/status") {
      return sendJson(res, 200, { integrations: getIntegrationStatus() });
    }

    if (req.method === "POST" && req.url === "/api/integrations/run") {
      const input = await readBody(req);
      const run =
        input.adapterId === "claude-writing"
          ? runOutlineLoop(input.runInput || input)
          : runContentLoop(input.runInput || input);
      const output = input.adapterId
        ? await runLiveAdapter(input.adapterId, run)
        : await runAllAdapters(run);
      const execution = await saveExecution(run, output, {
        adapterId: input.adapterId || "all"
      });
      const modelArtifacts = await saveModelArtifacts(run, execution);
      return sendJson(res, 200, { ...output, execution, modelArtifacts });
    }

    if (req.method === "GET" && req.url === "/api/integrations/executions") {
      return sendJson(res, 200, { executions: await listExecutions() });
    }

    if (req.method === "GET" && req.url === "/api/model-artifacts") {
      return sendJson(res, 200, { artifacts: await listModelArtifacts() });
    }

    if (req.method === "POST" && req.url === "/api/benchmark") {
      const input = await readBody(req);
      const urls = Array.isArray(input.urls) ? input.urls : String(input.urls || "").split(/\s+/);
      return sendJson(res, 200, await analyzeBenchmarkUrls(urls));
    }

    if (req.method === "POST" && req.url === "/api/keywords/suggest") {
      const input = await readBody(req);
      return sendJson(res, 200, suggestKeywords(input));
    }

    if (req.method === "POST" && req.url === "/api/schedule/propose") {
      const input = await readBody(req);
      return sendJson(res, 200, proposeSchedule(input));
    }

    if (req.method === "POST" && req.url === "/api/schedule/create") {
      const input = await readBody(req);
      const proposal = input.jobs ? { jobs: input.jobs } : proposeSchedule(input);
      const queue = await saveScheduleJobs(proposal.jobs);
      return sendJson(res, 200, { queue });
    }

    if (req.method === "GET" && req.url === "/api/schedule/list") {
      return sendJson(res, 200, { queue: await listScheduleJobs() });
    }

    if (req.method === "POST" && req.url === "/api/schedule/dispatch") {
      const input = await readBody(req);
      return sendJson(res, 200, await dispatchDueJobs(input));
    }

    if (req.method === "POST" && req.url === "/api/performance/simulate") {
      const input = await readBody(req);
      return sendJson(res, 200, simulatePerformanceLoop(input));
    }

    if (req.method === "POST" && req.url === "/api/performance/record") {
      const input = await readBody(req);
      const run = input.runInput ? runContentLoop(input.runInput) : null;
      const snapshot = await savePerformanceSnapshot({
        run,
        contentId: input.contentId,
        metrics: input.metrics || input,
        source: input.source || "manual-ui"
      });
      return sendJson(res, 200, { snapshot });
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/performance/list") {
      return sendJson(res, 200, {
        snapshots: await listPerformanceSnapshots({
          contentId: requestUrl.searchParams.get("contentId") || ""
        })
      });
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/history/list") {
      return sendJson(res, 200, {
        items: await listHistory({
          contentId: requestUrl.searchParams.get("contentId") || ""
        })
      });
    }

    if (req.method === "POST" && req.url === "/api/history/read") {
      const input = await readBody(req);
      return sendJson(res, 200, { item: await readHistoryItem(input) });
    }

    if (req.method === "GET" || req.method === "HEAD") {
      const path = safePublicPath(req.url || "/");
      if (!path) return sendJson(res, 403, { error: "Forbidden" });
      const body = await readFile(path);
      const type = mimeTypes[extname(path)] || "application/octet-stream";
      res.writeHead(200, { "content-type": type });
      if (req.method === "HEAD") return res.end();
      return res.end(body);
    }

    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    if (error.code === "ENOENT") {
      return sendJson(res, 404, { error: "Not found" });
    }
    return sendJson(res, 500, { error: error.message });
  }
});

server.listen(port, host, () => {
  console.log(`SEO Loop Harness running at http://${host}:${port}`);
});
