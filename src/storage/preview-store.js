import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderPreviewHtml } from "../core/article-renderer.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const previewDir = join(root, "outputs", "previews");

export async function savePreview(run) {
  await mkdir(previewDir, { recursive: true });
  const filename = `${run.contentId}.html`;
  const path = join(previewDir, filename);
  await writeFile(path, renderPreviewHtml(run), "utf8");
  return {
    contentId: run.contentId,
    filename,
    path,
    url: `/previews/${filename}`
  };
}

export async function readPreview(filename) {
  return readFile(join(previewDir, filename), "utf8");
}

export async function listPreviews() {
  await mkdir(previewDir, { recursive: true });
  const files = (await readdir(previewDir)).filter((file) => file.endsWith(".html"));
  return files.sort().reverse().map((filename) => ({
    filename,
    contentId: filename.replace(/\.html$/, ""),
    url: `/previews/${filename}`,
    path: join(previewDir, filename)
  }));
}
