/**
 * Content hash of a skill directory.
 *
 * Mirrors agentic-hub-skills/tools/catalog/hash.mjs exactly, so this plugin's
 * change-detection matches the source repo's own notion of "a skill changed".
 * Returns `sha256:<hex>` folded over every file under `dirPath`
 * (sorted forward-slash relative path + file bytes).
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

function listFilesRecursive(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listFilesRecursive(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

function digestOf(bytes) {
  return createHash("sha256").update(bytes).digest();
}

export function hashDirectory(dirPath) {
  const relativePaths = listFilesRecursive(dirPath)
    .map((file) => relative(dirPath, file).split(sep).join("/"))
    .sort();

  const hash = createHash("sha256");
  for (const relativePath of relativePaths) {
    hash.update(digestOf(relativePath));
    hash.update(digestOf(readFileSync(join(dirPath, relativePath))));
  }
  return `sha256:${hash.digest("hex")}`;
}
