#!/usr/bin/env node
/**
 * package-plugin.mjs — package the committed PandaDoc plugin.
 *
 * This repo's root is the plugin, so the zip includes only the plugin's own paths
 * (.claude-plugin/, skills/, hooks/, .mcp.json) at the zip root — not the repo's other
 * platform manifests or tooling. Uses `git archive`, so only committed files are included.
 *
 * Usage:
 *   node scripts/package-plugin.mjs [ref]   # Claude zip; ref defaults to HEAD
 *   node scripts/package-plugin.mjs --clawhub [ref]  # preview the ClawHub package
 *   node scripts/package-plugin.mjs --clawhub --publish [ref]  # publish that commit
 *
 * Output: dist/pandadoc-plugin-v<version>.zip  (+ prints sha256 for archive-source pinning)
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN_PATHS = [".claude-plugin/plugin.json", "skills", "hooks", ".mcp.json"];
const args = process.argv.slice(2);
const clawhub = args.includes("--clawhub");
const publish = args.includes("--publish");
const refs = args.filter((arg) => !arg.startsWith("--"));
const unknownFlag = args.some((arg) => arg.startsWith("--") && !["--clawhub", "--publish"].includes(arg));
if (refs.length > 1 || unknownFlag || (publish && !clawhub)) {
  throw new Error("Usage: node scripts/package-plugin.mjs [--clawhub [--publish]] [ref]");
}
const ref = refs[0] || process.env.REF || "HEAD";
const git = (args, options = {}) => execFileSync("git", args, { cwd: REPO_ROOT, ...options });
const commit = git(["rev-parse", "--verify", `${ref}^{commit}`], { encoding: "utf8" }).trim();

// Read the version from the ref itself, so the filename matches the archived content.
const manifest = execFileSync(
  "git",
  ["show", `${commit}:.claude-plugin/plugin.json`],
  { cwd: REPO_ROOT, encoding: "utf8" },
);
const plugin = JSON.parse(manifest);
const version = plugin.version;
if (!/^\d+\.\d+\.\d+$/.test(version) || !/^[a-z][a-z0-9-]*$/.test(plugin.name)) {
  throw new Error("The committed plugin must have a valid name and release version.");
}

if (clawhub) {
  // Build from Git objects, never from working-tree skills or credentials. The
  // generated OpenClaw metadata mirrors the canonical Claude plugin manifest.
  mkdirSync(join(REPO_ROOT, "dist"), { recursive: true });
  const stage = mkdtempSync(join(REPO_ROOT, "dist", ".clawhub-"));
  const outDir = join(REPO_ROOT, "dist", `pandadoc-clawhub-v${version}`);
  try {
    const archive = git([
      "archive", "--format=tar", commit, ...PLUGIN_PATHS,
      "LICENSE", "README.md", "assets/pd-logo_green.png",
    ], { maxBuffer: 128 * 1024 * 1024 });
    execFileSync("tar", ["-xf", "-", "-C", stage], { input: archive });
    renameSync(join(stage, "assets/pd-logo_green.png"), join(stage, "assets/icon.png"));
    writeFileSync(join(stage, "openclaw.plugin.json"), `${JSON.stringify({
      id: plugin.name,
      name: "PandaDoc",
      description: plugin.description,
      version,
      skills: ["./skills"],
      configSchema: { type: "object", properties: {}, additionalProperties: false },
    }, null, 2)}\n`);
    mkdirSync(dirname(outDir), { recursive: true });
    rmSync(outDir, { recursive: true, force: true });
    renameSync(stage, outDir);
    const source = "PandaDoc/mcp-server-guide";
    const command = ["--yes", "clawhub@0.23.3", "package", "publish", outDir,
      "--family", "bundle-plugin", "--bundle-format", "claude", "--host-targets", "openclaw",
      "--name", `@pandadoc/${plugin.name}`, "--owner", "pandadoc", "--display-name", "PandaDoc",
      "--version", version, "--source-repo", source, "--source-commit", commit, "--source-ref", ref,
      ...(publish ? ["--wait", "--wait-timeout", "600"] : ["--dry-run"]), "--json"];
    console.log(`GitHub source: https://github.com/${source}/tree/${commit}`);
    console.log(`Plugin version: ${version}`);
    console.log(`Packaged: ${outDir}`);
    execFileSync("npx", command, { stdio: "inherit" });
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
  process.exit(0);
}

const outDir = join(REPO_ROOT, "dist");
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, `pandadoc-plugin-v${version}.zip`);

execFileSync(
  "git",
  ["archive", "--format=zip", "-o", outFile, commit, ...PLUGIN_PATHS],
  { cwd: REPO_ROOT, stdio: "inherit" },
);

const sha256 = createHash("sha256").update(readFileSync(outFile)).digest("hex");
console.log(`\nPackaged: ${outFile}`);
console.log(`Ref:      ${ref}`);
console.log(`Version:  ${version}`);
console.log(`sha256:   ${sha256}`);
