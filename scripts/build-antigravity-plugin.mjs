#!/usr/bin/env node
/**
 * build-antigravity-plugin.mjs — mirror ./skills into the Antigravity plugin at ./antigravity.
 *
 * The repo root is the Claude / Agent Plugins plugin; Antigravity's plugin.json schema allows only
 * `$schema`, `name` and `description` (additionalProperties: false), so it cannot share the root
 * manifest and lives in its own directory. Skills are copied, not symlinked, so the directory stays
 * self-contained when Antigravity stages or packages it on its own.
 *
 * Usage:
 *   node scripts/build-antigravity-plugin.mjs           # rewrite antigravity/skills from ./skills
 *   node scripts/build-antigravity-plugin.mjs --check   # exit 1 if antigravity/ is out of date
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hashDirectory } from "./lib/hash.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_SRC = join(REPO_ROOT, "skills");
const PLUGIN_DIR = join(REPO_ROOT, "antigravity");
const SKILLS_DEST = join(PLUGIN_DIR, "skills");
const MANIFEST_KEYS = new Set(["$schema", "name", "description"]);
const NAME_PATTERN = /^[a-zA-Z0-9-_]+$/;

const check = process.argv.includes("--check");

main();

function main() {
  const errors = validateManifests();
  const srcSlugs = listSkills(SKILLS_SRC);
  if (srcSlugs.length === 0) errors.push(`No skills found under ${SKILLS_SRC}`);

  if (check) {
    const destSlugs = existsSync(SKILLS_DEST) ? listSkills(SKILLS_DEST) : [];
    const missing = srcSlugs.filter((s) => !destSlugs.includes(s));
    const extra = destSlugs.filter((s) => !srcSlugs.includes(s));
    const stale = srcSlugs.filter(
      (s) => destSlugs.includes(s) && hashDirectory(join(SKILLS_SRC, s)) !== hashDirectory(join(SKILLS_DEST, s)),
    );
    if (missing.length) errors.push(`Missing from antigravity/skills: ${missing.join(", ")}`);
    if (extra.length) errors.push(`Not in ./skills: ${extra.join(", ")}`);
    if (stale.length) errors.push(`Out of date in antigravity/skills: ${stale.join(", ")}`);
    if (missing.length + extra.length + stale.length) {
      errors.push("Run `node scripts/build-antigravity-plugin.mjs` and commit the result.");
    }
    finish(errors, `antigravity/ is in sync (${srcSlugs.length} skills).`);
    return;
  }

  if (errors.length) finish(errors);
  rmSync(SKILLS_DEST, { recursive: true, force: true });
  mkdirSync(SKILLS_DEST, { recursive: true });
  for (const slug of srcSlugs) {
    cpSync(join(SKILLS_SRC, slug), join(SKILLS_DEST, slug), { recursive: true });
  }
  finish([], `Mirrored ${srcSlugs.length} skills into antigravity/skills.`);
}

function validateManifests() {
  const errors = [];
  const manifest = readJson(join(PLUGIN_DIR, "plugin.json"), errors);
  if (manifest) {
    const unknown = Object.keys(manifest).filter((k) => !MANIFEST_KEYS.has(k));
    if (unknown.length) errors.push(`antigravity/plugin.json: keys not allowed by the schema: ${unknown.join(", ")}`);
    if (typeof manifest.name !== "string" || !NAME_PATTERN.test(manifest.name)) {
      errors.push("antigravity/plugin.json: `name` is required and must match ^[a-zA-Z0-9-_]+$");
    }
  }
  const mcp = readJson(join(PLUGIN_DIR, "mcp_config.json"), errors);
  if (mcp) {
    for (const [id, server] of Object.entries(mcp.mcpServers || {})) {
      if (!server.serverUrl) errors.push(`antigravity/mcp_config.json: server "${id}" needs \`serverUrl\``);
      for (const legacy of ["url", "httpUrl", "type"]) {
        if (legacy in server) errors.push(`antigravity/mcp_config.json: server "${id}" uses unsupported key \`${legacy}\``);
      }
    }
  }
  return errors;
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

function finish(errors, okMessage) {
  if (errors.length) {
    for (const e of errors) console.error(`ERROR: ${e}`);
    process.exit(1);
  }
  console.log(okMessage);
}
