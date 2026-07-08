import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPublishPackage } from "../core/package-exporter.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const packageRoot = join(root, "outputs", "packages");

export async function savePublishPackage(run, options = {}) {
  const pkg = buildPublishPackage(run, options);
  const dir = join(packageRoot, run.contentId);
  await mkdir(dir, { recursive: true });
  pkg.files["manifest.json"] = pkg.manifest;

  for (const [filename, content] of Object.entries(pkg.files)) {
    const path = join(dir, filename);
    const body =
      typeof content === "string" ? content : JSON.stringify(content, null, 2);
    await writeFile(path, body, "utf8");
  }

  return {
    ...pkg.manifest,
    path: dir,
    files: pkg.manifest.packageFiles.map((filename) => ({
      filename,
      path: join(dir, filename),
      url: `/packages/${run.contentId}/${filename}`
    }))
  };
}

export async function listPublishPackages() {
  await mkdir(packageRoot, { recursive: true });
  const dirs = (await readdir(packageRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse();
  const packages = [];
  for (const dirName of dirs.slice(0, 30)) {
    try {
      const manifest = JSON.parse(
        await readFile(join(packageRoot, dirName, "manifest.json"), "utf8")
      );
      packages.push({
        ...manifest,
        path: join(packageRoot, dirName),
        url: `/packages/${dirName}/manifest.json`
      });
    } catch {
      packages.push({ contentId: dirName, error: "Could not read package manifest" });
    }
  }
  return packages;
}

export async function readPackageFile(contentId, filename) {
  return readFile(join(packageRoot, contentId, filename), "utf8");
}
