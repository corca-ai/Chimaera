import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildModelArtifactBundle } from "../core/model-artifacts.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const artifactRoot = join(root, "outputs", "model-artifacts");

export async function saveModelArtifacts(run, execution) {
  const bundle = buildModelArtifactBundle(run, execution);
  const artifactId = bundle.manifest.artifactId;
  const dir = join(artifactRoot, run.contentId, artifactId);
  await mkdir(dir, { recursive: true });

  const files = [];
  for (const [filename, file] of Object.entries(bundle.files)) {
    const path = join(dir, filename);
    if (file.encoding === "base64") {
      await writeFile(path, Buffer.from(file.body, "base64"));
    } else {
      const body = typeof file.body === "string" ? file.body : JSON.stringify(file.body, null, 2);
      await writeFile(path, body, "utf8");
    }
    files.push({
      filename,
      path,
      url: `/model-artifacts/${run.contentId}/${artifactId}/${filename}`,
      mimeType: file.mimeType || mimeTypeFor(filename)
    });
  }

  const manifest = {
    ...bundle.manifest,
    path: dir,
    url: `/model-artifacts/${run.contentId}/${artifactId}/manifest.json`,
    files
  };
  await writeFile(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  return manifest;
}

export async function listModelArtifacts() {
  await mkdir(artifactRoot, { recursive: true });
  const contentDirs = (await readdir(artifactRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const artifacts = [];

  for (const contentId of contentDirs) {
    const contentDir = join(artifactRoot, contentId);
    const artifactDirs = (await readdir(contentDir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    for (const artifactId of artifactDirs) {
      try {
        const manifest = JSON.parse(
          await readFile(join(contentDir, artifactId, "manifest.json"), "utf8")
        );
        artifacts.push(summarizeArtifact(manifest));
      } catch {
        artifacts.push({
          contentId,
          artifactId,
          path: join(contentDir, artifactId),
          error: "Could not read model artifact manifest"
        });
      }
    }
  }

  return artifacts
    .sort((a, b) => String(b.generatedAt || "").localeCompare(String(a.generatedAt || "")))
    .slice(0, 50);
}

export async function readModelArtifactFile(contentId, artifactId, filename) {
  return readFile(join(artifactRoot, contentId, artifactId, filename));
}

export function modelArtifactMimeType(filename) {
  return mimeTypeFor(filename);
}

function summarizeArtifact(manifest) {
  return {
    artifactId: manifest.artifactId,
    contentId: manifest.contentId,
    executionId: manifest.executionId,
    generatedAt: manifest.generatedAt,
    primaryKeyword: manifest.primaryKeyword,
    category: manifest.category,
    title: manifest.title,
    itemCount: manifest.itemCount,
    items: manifest.items,
    files: manifest.files,
    path: manifest.path,
    url: manifest.url
  };
}

function mimeTypeFor(filename) {
  const extension = extname(filename);
  if (extension === ".md") return "text/markdown; charset=utf-8";
  if (extension === ".json") return "application/json; charset=utf-8";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}
