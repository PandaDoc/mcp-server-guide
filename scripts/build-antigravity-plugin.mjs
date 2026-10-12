#!/usr/bin/env node
/**
 * build-antigravity-plugin.mjs — assemble the Google Antigravity plugin in dist/.
 *
 * Antigravity's plugin.json schema allows only `$schema`, `name` and `description`
 * (additionalProperties: false), so it cannot share the root manifest. antigravity/ holds the
 * Antigravity-only files; this script combines them with the shared ./skills.
 *
 * Usage:
 *   node scripts/build-antigravity-plugin.mjs          # → dist/antigravity/pandadoc/
 *   node scripts/build-antigravity-plugin.mjs --zip    # also → dist/pandadoc-antigravity-plugin-v<version>.zip
 *
 * The Antigravity manifest carries no version, so the zip takes it from .claude-plugin/plugin.json.
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = join(REPO_ROOT, "antigravity");
const SKILLS_SRC = join(REPO_ROOT, "skills");
const DIST_DIR = join(REPO_ROOT, "dist");
const MANIFEST_KEYS = new Set(["$schema", "name", "description"]);
const NAME_PATTERN = /^[a-zA-Z0-9-_]+$/;

main();

function main() {
  const errors = [];
  const manifest = readJson(join(SOURCE_DIR, "plugin.json"), errors);
  const mcp = readJson(join(SOURCE_DIR, "mcp_config.json"), errors);
  if (manifest) validateManifest(manifest, errors);
  if (mcp) validateMcpConfig(mcp, errors);
  const skills = listSkills(SKILLS_SRC);
  if (skills.length === 0) errors.push(`No skills found under ${SKILLS_SRC}`);
  if (errors.length) {
    for (const e of errors) console.error(`ERROR: ${e}`);
    process.exit(1);
  }

  const outDir = join(DIST_DIR, "antigravity", manifest.name);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(join(outDir, "skills"), { recursive: true });
  cpSync(join(SOURCE_DIR, "plugin.json"), join(outDir, "plugin.json"));
  cpSync(join(SOURCE_DIR, "mcp_config.json"), join(outDir, "mcp_config.json"));
  for (const slug of skills) cpSync(join(SKILLS_SRC, slug), join(outDir, "skills", slug), { recursive: true });
  console.log(`Built: ${outDir} (${skills.length} skills)`);

  if (process.argv.includes("--zip")) {
    const { version } = JSON.parse(readFileSync(join(REPO_ROOT, ".claude-plugin", "plugin.json"), "utf8"));
    const zipFile = join(DIST_DIR, `pandadoc-antigravity-plugin-v${version}.zip`);
    rmSync(zipFile, { force: true });
    execFileSync("zip", ["-qr", zipFile, "."], { cwd: outDir, stdio: "inherit" });
    console.log(`Zipped: ${zipFile}`);
  }
}

function validateManifest(manifest, errors) {
  const unknown = Object.keys(manifest).filter((k) => !MANIFEST_KEYS.has(k));
  if (unknown.length) errors.push(`antigravity/plugin.json: keys not allowed by the schema: ${unknown.join(", ")}`);
  if (typeof manifest.name !== "string" || !NAME_PATTERN.test(manifest.name)) {
    errors.push("antigravity/plugin.json: `name` is required and must match ^[a-zA-Z0-9-_]+$");
  }
}

function validateMcpConfig(mcp, errors) {
  for (const [id, server] of Object.entries(mcp.mcpServers || {})) {
    if (!server.serverUrl) errors.push(`antigravity/mcp_config.json: server "${id}" needs \`serverUrl\``);
    for (const legacy of ["url", "httpUrl", "type"]) {
      if (legacy in server) errors.push(`antigravity/mcp_config.json: server "${id}" uses unsupported key \`${legacy}\``);
    }
  }
}

function listSkills(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(dir, d.name, "SKILL.md")))
    .map((d) => d.name)
    .sort();
}

function readJson(path, errors) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    errors.push(`${path}: ${e.message}`);
    return null;
  }
}
