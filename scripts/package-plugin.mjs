#!/usr/bin/env node
/**
 * package-plugin.mjs — build a distributable zip of the Claude plugin.
 *
 * This repo's root is the plugin, so the zip includes only the plugin's own paths
 * (.claude-plugin/, skills/, hooks/, .mcp.json) at the zip root — not the repo's other
 * platform manifests or tooling. Uses `git archive`, so only committed files are included.
 *
 * Usage:
 *   node scripts/package-plugin.mjs [ref]   # ref defaults to HEAD; pass a tag e.g. v1.0.0
 *
 * Output: dist/pandadoc-plugin-v<version>.zip  (+ prints sha256 for archive-source pinning)
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN_PATHS = [".claude-plugin/plugin.json", "skills", "hooks", ".mcp.json"];
const ref = process.argv[2] || process.env.REF || "HEAD";

// Read the version from the ref itself, so the filename matches the archived content.
const manifest = execFileSync(
  "git",
  ["show", `${ref}:.claude-plugin/plugin.json`],
  { cwd: REPO_ROOT, encoding: "utf8" },
);
const version = JSON.parse(manifest).version;

const outDir = join(REPO_ROOT, "dist");
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, `pandadoc-plugin-v${version}.zip`);

execFileSync(
  "git",
  ["archive", "--format=zip", "-o", outFile, ref, ...PLUGIN_PATHS],
  { cwd: REPO_ROOT, stdio: "inherit" },
);

const sha256 = createHash("sha256").update(readFileSync(outFile)).digest("hex");
console.log(`\nPackaged: ${outFile}`);
console.log(`Ref:      ${ref}`);
console.log(`Version:  ${version}`);
console.log(`sha256:   ${sha256}`);
