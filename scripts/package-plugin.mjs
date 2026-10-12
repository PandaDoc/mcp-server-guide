#!/usr/bin/env node
/**
 * package-plugin.mjs — build a distributable zip of the Claude or Antigravity plugin.
 *
 * Claude (default): this repo's root is the plugin, so the zip includes only the plugin's own
 * paths (.claude-plugin/, skills/, hooks/, .mcp.json) at the zip root — not the repo's other
 * platform manifests or tooling.
 * Antigravity: the contents of antigravity/ at the zip root.
 * Uses `git archive`, so only committed files are included.
 *
 * Usage:
 *   node scripts/package-plugin.mjs [ref] [--target claude|antigravity]
 *     ref defaults to HEAD; pass a tag e.g. v1.0.0
 *
 * Output: dist/pandadoc-<target>-plugin-v<version>.zip (Claude keeps dist/pandadoc-plugin-v<version>.zip)
 *   (+ prints sha256 for archive-source pinning). The Antigravity manifest carries no version, so
 *   both targets take it from .claude-plugin/plugin.json.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TARGETS = {
  claude: { treeish: (ref) => ref, paths: [".claude-plugin/plugin.json", "skills", "hooks", ".mcp.json"], prefix: "pandadoc-plugin" },
  antigravity: { treeish: (ref) => `${ref}:antigravity`, paths: [], prefix: "pandadoc-antigravity-plugin" },
};

const argv = process.argv.slice(2);
const targetIdx = argv.indexOf("--target");
const targetName = targetIdx === -1 ? "claude" : argv[targetIdx + 1];
const target = TARGETS[targetName];
if (!target) {
  console.error(`ERROR: unknown --target "${targetName}" (expected: ${Object.keys(TARGETS).join(", ")})`);
  process.exit(1);
}
const positional = argv.filter((_, i) => targetIdx === -1 || (i !== targetIdx && i !== targetIdx + 1));
const ref = positional[0] || process.env.REF || "HEAD";

// Read the version from the ref itself, so the filename matches the archived content.
const manifest = execFileSync(
  "git",
  ["show", `${ref}:.claude-plugin/plugin.json`],
  { cwd: REPO_ROOT, encoding: "utf8" },
);
const version = JSON.parse(manifest).version;

const outDir = join(REPO_ROOT, "dist");
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, `${target.prefix}-v${version}.zip`);

execFileSync(
  "git",
  ["archive", "--format=zip", "-o", outFile, target.treeish(ref), ...target.paths],
  { cwd: REPO_ROOT, stdio: "inherit" },
);

const sha256 = createHash("sha256").update(readFileSync(outFile)).digest("hex");
console.log(`\nPackaged: ${outFile}`);
console.log(`Target:   ${targetName}`);
console.log(`Ref:      ${ref}`);
console.log(`Version:  ${version}`);
console.log(`sha256:   ${sha256}`);
