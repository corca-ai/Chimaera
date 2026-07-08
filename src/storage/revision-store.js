import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const revisionRoot = join(root, "outputs", "revisions");

export async function saveRevision(input = {}) {
  const contentId = safeToken(input.contentId || "draft");
  const createdAt = new Date().toISOString();
  const revisionId = `${timestampToken(createdAt)}-${safeToken(input.action || "edit")}-${randomToken()}.json`;
  const dir = join(revisionRoot, contentId);
  const path = join(dir, revisionId);
  await mkdir(dir, { recursive: true });

  const revision = {
    id: revisionId,
    type: "revision",
    contentId,
    title: String(input.title || input.primaryKeyword || contentId),
    heading: String(input.heading || "본문 전체"),
    action: String(input.action || "manual-edit"),
    instruction: String(input.instruction || ""),
    selectedText: String(input.selectedText || ""),
    replacementText: String(input.replacementText || ""),
    summary: String(input.summary || "본문을 수정했습니다."),
    model: String(input.model || ""),
    mode: String(input.mode || ""),
    beforeMarkdown: String(input.beforeMarkdown || ""),
    afterMarkdown: String(input.afterMarkdown || ""),
    runInput: input.runInput || null,
    createdAt,
    path
  };

  await writeFile(path, JSON.stringify(revision, null, 2), "utf8");
  return revision;
}

export async function listRevisions(options = {}) {
  await mkdir(revisionRoot, { recursive: true });
  const requestedContentId = String(options.contentId || "").trim();
  const contentDirs = requestedContentId
    ? [{ name: safeToken(requestedContentId), isDirectory: () => true }]
    : (await readdir(revisionRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory());

  const items = [];
  for (const contentEntry of contentDirs) {
    const dir = join(revisionRoot, contentEntry.name);
    let files = [];
    try {
      files = (await readdir(dir)).filter((file) => file.endsWith(".json"));
    } catch {
      files = [];
    }
    for (const file of files) {
      try {
        const revision = JSON.parse(await readFile(join(dir, file), "utf8"));
        items.push({
          type: "revision",
          id: file,
          contentId: revision.contentId || contentEntry.name,
          title: revision.title || revision.contentId || file,
          heading: revision.heading || "본문 전체",
          action: revision.action || "edit",
          summary: revision.summary || "",
          instruction: revision.instruction || "",
          category: revision.runInput?.category || "",
          createdAt: revision.createdAt || "",
          path: revision.path || join(dir, file)
        });
      } catch {
        items.push({
          type: "revision",
          id: file,
          contentId: contentEntry.name,
          title: file,
          heading: "읽기 실패",
          action: "error",
          summary: "Revision JSON을 읽지 못했습니다.",
          createdAt: "",
          path: join(dir, file)
        });
      }
    }
  }

  return items.sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")));
}

export async function readRevision({ contentId, id } = {}) {
  const safeContentId = safeToken(contentId || "");
  const safeId = basenameOnly(id);
  if (!safeContentId || !safeId) throw new Error("Invalid revision item");
  const path = join(revisionRoot, safeContentId, safeId);
  const payload = JSON.parse(await readFile(path, "utf8"));
  return {
    ...payload,
    path
  };
}

export function revisionRootPath() {
  return revisionRoot;
}

function timestampToken(value) {
  return String(value).replace(/[:.]/g, "-");
}

function randomToken() {
  return Math.random().toString(16).slice(2, 8);
}

function basenameOnly(value) {
  const text = String(value || "");
  if (!text || text.includes("/") || text.includes("\\") || text.includes("..")) return "";
  return text;
}

function safeToken(value) {
  return String(value || "draft")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_-]+/giu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "draft";
}
