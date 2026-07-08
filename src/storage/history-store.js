import { mkdir, readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const outputDir = join(root, "outputs");
const dirs = {
  run: join(outputDir, "runs"),
  performance: join(outputDir, "performance"),
  preview: join(outputDir, "previews"),
  package: join(outputDir, "packages"),
  model: join(outputDir, "model-artifacts"),
  revision: join(outputDir, "revisions")
};

export async function listHistory(options = {}) {
  const contentId = String(options.contentId || "").trim();
  const items = [
    ...(await listRunHistory(contentId)),
    ...(await listPerformanceHistory(contentId)),
    ...(await listPreviewHistory(contentId)),
    ...(await listPackageHistory(contentId)),
    ...(await listModelHistory(contentId)),
    ...(await listRevisionHistory(contentId))
  ];

  return items
    .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")))
    .slice(0, 120);
}

export async function readHistoryItem({ type, id }) {
  const safeType = String(type || "");
  const safeId = basenameOnly(id);
  if (!dirs[safeType] || !safeId) throw new Error("Invalid history item");

  if (safeType === "package") {
    const manifestPath = join(dirs.package, safeId, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    return {
      type: safeType,
      id: safeId,
      title: manifest.title,
      contentId: manifest.contentId,
      path: join(dirs.package, safeId),
      payload: manifest
    };
  }

  if (safeType === "model") {
    const [contentId, artifactId] = safeId.split("__");
    if (!contentId || !artifactId) throw new Error("Invalid model artifact item");
    const manifestPath = join(dirs.model, contentId, artifactId, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    return {
      type: safeType,
      id: safeId,
      title: manifest.title,
      contentId: manifest.contentId,
      path: join(dirs.model, contentId, artifactId),
      payload: manifest
    };
  }

  if (safeType === "revision") {
    const [contentId, revisionId] = safeId.split("__");
    if (!contentId || !revisionId) throw new Error("Invalid revision item");
    const path = join(dirs.revision, contentId, revisionId);
    const payload = JSON.parse(await readFile(path, "utf8"));
    return {
      type: safeType,
      id: safeId,
      contentId: payload.contentId,
      title: payload.title || payload.contentId,
      path,
      payload
    };
  }

  const path = join(dirs[safeType], safeId);
  const text = await readFile(path, "utf8");
  const payload = safeId.endsWith(".json") ? JSON.parse(text) : text;
  return {
    type: safeType,
    id: safeId,
    contentId: payload?.contentId || safeId.replace(/\.html$/, ""),
    title: payload?.publishing?.ownedBlog?.title || payload?.primaryKeyword || safeId,
    path,
    payload
  };
}

async function listRunHistory(contentId) {
  await mkdir(dirs.run, { recursive: true });
  const files = (await readdir(dirs.run)).filter((file) => file.endsWith(".json"));
  const items = [];
  for (const file of files) {
    try {
      const path = join(dirs.run, file);
      const run = JSON.parse(await readFile(path, "utf8"));
      if (contentId && run.contentId !== contentId) continue;
      items.push({
        type: "run",
        id: file,
        contentId: run.contentId,
        title: run.publishing?.ownedBlog?.title || run.input?.primaryKeyword || run.contentId,
        subtitle: run.selectedTemplate?.name || run.writerStatus || "",
        category: run.input?.category || "",
        createdAt: run.generatedAt || run.storedAt || "",
        qualityScore: run.qualityReport?.score,
        path
      });
    } catch {
      items.push({ type: "run", id: file, title: file, error: "Could not read run JSON" });
    }
  }
  return items;
}

async function listPerformanceHistory(contentId) {
  await mkdir(dirs.performance, { recursive: true });
  const files = (await readdir(dirs.performance)).filter((file) => file.endsWith(".json"));
  const items = [];
  for (const file of files) {
    try {
      const path = join(dirs.performance, file);
      const snapshot = JSON.parse(await readFile(path, "utf8"));
      if (contentId && snapshot.contentId !== contentId) continue;
      items.push({
        type: "performance",
        id: file,
        contentId: snapshot.contentId,
        title: snapshot.primaryKeyword || snapshot.contentId,
        subtitle: snapshot.summary || "",
        category: snapshot.category || "",
        createdAt: snapshot.recordedAt || "",
        path
      });
    } catch {
      items.push({ type: "performance", id: file, title: file, error: "Could not read performance JSON" });
    }
  }
  return items;
}

async function listPreviewHistory(contentId) {
  await mkdir(dirs.preview, { recursive: true });
  const files = (await readdir(dirs.preview)).filter((file) => file.endsWith(".html"));
  const items = [];
  for (const file of files) {
    const itemContentId = file.replace(/\.html$/, "");
    if (contentId && itemContentId !== contentId) continue;
    const path = join(dirs.preview, file);
    const info = await stat(path);
    items.push({
      type: "preview",
      id: file,
      contentId: itemContentId,
      title: "HTML 미리보기",
      subtitle: `/previews/${file}`,
      category: "preview",
      createdAt: info.mtime.toISOString(),
      path,
      url: `/previews/${file}`
    });
  }
  return items;
}

async function listPackageHistory(contentId) {
  await mkdir(dirs.package, { recursive: true });
  const entries = (await readdir(dirs.package, { withFileTypes: true })).filter((entry) => entry.isDirectory());
  const items = [];
  for (const entry of entries) {
    try {
      const manifestPath = join(dirs.package, entry.name, "manifest.json");
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      if (contentId && manifest.contentId !== contentId) continue;
      items.push({
        type: "package",
        id: entry.name,
        contentId: manifest.contentId,
        title: manifest.title || manifest.contentId,
        subtitle: `${manifest.packageFiles?.length || 0} files`,
        category: "package",
        createdAt: manifest.generatedAt || "",
        path: join(dirs.package, entry.name),
        url: `/packages/${entry.name}/manifest.json`
      });
    } catch {
      items.push({ type: "package", id: entry.name, title: entry.name, error: "Could not read package manifest" });
    }
  }
  return items;
}

async function listModelHistory(contentId) {
  await mkdir(dirs.model, { recursive: true });
  const contentDirs = (await readdir(dirs.model, { withFileTypes: true })).filter((entry) => entry.isDirectory());
  const items = [];
  for (const contentEntry of contentDirs) {
    if (contentId && contentEntry.name !== contentId) continue;
    const contentDir = join(dirs.model, contentEntry.name);
    const artifactDirs = (await readdir(contentDir, { withFileTypes: true })).filter((entry) => entry.isDirectory());
    for (const artifactEntry of artifactDirs) {
      try {
        const manifestPath = join(contentDir, artifactEntry.name, "manifest.json");
        const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
        items.push({
          type: "model",
          id: `${contentEntry.name}__${artifactEntry.name}`,
          contentId: manifest.contentId,
          title: manifest.title || manifest.primaryKeyword || manifest.contentId,
          subtitle: `${manifest.itemCount || 0} model artifacts`,
          category: manifest.category || "model",
          createdAt: manifest.generatedAt || "",
          path: join(contentDir, artifactEntry.name),
          url: manifest.url
        });
      } catch {
        items.push({
          type: "model",
          id: `${contentEntry.name}__${artifactEntry.name}`,
          contentId: contentEntry.name,
          title: artifactEntry.name,
          error: "Could not read model artifact manifest"
        });
      }
    }
  }
  return items;
}

async function listRevisionHistory(contentId) {
  await mkdir(dirs.revision, { recursive: true });
  const contentDirs = (await readdir(dirs.revision, { withFileTypes: true })).filter((entry) =>
    entry.isDirectory()
  );
  const items = [];
  for (const contentEntry of contentDirs) {
    if (contentId && contentEntry.name !== contentId.toLowerCase()) continue;
    const contentDir = join(dirs.revision, contentEntry.name);
    const files = (await readdir(contentDir)).filter((file) => file.endsWith(".json"));
    for (const file of files) {
      try {
        const path = join(contentDir, file);
        const revision = JSON.parse(await readFile(path, "utf8"));
        items.push({
          type: "revision",
          id: `${contentEntry.name}__${file}`,
          contentId: revision.contentId,
          title: revision.title || revision.contentId,
          subtitle: revision.summary || revision.instruction || "",
          category: revision.heading || "본문 편집",
          createdAt: revision.createdAt || "",
          path
        });
      } catch {
        items.push({
          type: "revision",
          id: `${contentEntry.name}__${file}`,
          contentId: contentEntry.name,
          title: file,
          error: "Could not read revision JSON"
        });
      }
    }
  }
  return items;
}

function basenameOnly(value) {
  const text = String(value || "");
  if (!text || text.includes("/") || text.includes("\\") || text.includes("..")) return "";
  return text;
}
