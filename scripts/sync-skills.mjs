#!/usr/bin/env node
/**
 * sync-skills.mjs — import PandaDoc skills from agentic-hub-skills into this plugin.
 *
 * This repo's root IS the Claude plugin, so skills are vendored into ./skills and the version is
 * bumped in ./.claude-plugin/plugin.json.
 *
 * - Resolves a source ref (latest v* tag, else dev-* tag, else main; override with --ref).
 * - Copies each skills/<slug>/ directory verbatim into ./skills/.
 * - Detects change by per-skill content hash (mirrors the source repo's tools/catalog/hash.mjs),
 *   compared against the committed skills.lock.json.
 * - On change: bumps .claude-plugin/plugin.json version, rewrites skills.lock.json,
 *   prepends CHANGELOG.md, and (in CI) emits step outputs + release notes.
 * - Idempotent: no change → no writes, exit 0.
 *
 * Local run (no token/network needed — uses a local checkout of the skills repo):
 *   SKILLS_SOURCE_DIR=/path/to/agentic-hub-skills node scripts/sync-skills.mjs --dry-run
 *
 * Options (flag or env): --ref/SKILLS_REF · --bump/BUMP (patch|minor|major)
 *   · --source-dir/SKILLS_SOURCE_DIR · --dry-run/DRY_RUN
 */
import { execFileSync } from "node:child_process";
import {
  appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync,
  readdirSync, readFileSync, rmSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hashDirectory } from "./lib/hash.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN_JSON = join(REPO_ROOT, ".claude-plugin", "plugin.json");
const SKILLS_DEST = join(REPO_ROOT, "skills");
const LOCK_PATH = join(REPO_ROOT, "skills.lock.json");
const CHANGELOG_PATH = join(REPO_ROOT, "CHANGELOG.md");

const SOURCE_REPO = process.env.SKILLS_REPO || "pandadoc-studio/agentic-hub-skills";
const SOURCE_URL = `https://github.com/${SOURCE_REPO}.git`;

const args = parseArgs(process.argv.slice(2));
const bump = args.bump || process.env.BUMP || "patch";
const dryRun = Boolean(args["dry-run"] || truthy(process.env.DRY_RUN));
const explicitRef = args.ref || process.env.SKILLS_REF || "";
const sourceDirOverride = args["source-dir"] || process.env.SKILLS_SOURCE_DIR || "";

main();

function main() {
  const { sourceSkills, refLabel, sourceCommit, cleanup } = obtainSource();
  try {
    const slugs = readdirSync(sourceSkills, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(sourceSkills, d.name, "SKILL.md")))
      .map((d) => d.name)
      .sort();
    if (slugs.length === 0) fail(`No skills found under ${sourceSkills}`);

    const current = {};
    for (const slug of slugs) current[slug] = hashDirectory(join(sourceSkills, slug));

    const prevLock = existsSync(LOCK_PATH) ? JSON.parse(readFileSync(LOCK_PATH, "utf8")) : null;
    const prev = (prevLock && prevLock.skills) || {};
    const firstImport = !prevLock;

    const added = slugs.filter((s) => !(s in prev));
    const changed = slugs.filter((s) => s in prev && prev[s] !== current[s]);
    const removed = Object.keys(prev).filter((s) => !(s in current));
    const hasChange = added.length + changed.length + removed.length > 0;

    const summary = `+${added.length} ~${changed.length} -${removed.length}`;
    console.log(`Source: ${SOURCE_REPO}@${refLabel}${sourceCommit ? ` (${sourceCommit.slice(0, 8)})` : ""}`);
    console.log(`Skills: ${slugs.length} found — ${summary}`);

    if (!hasChange) {
      console.log("No changes; plugin already in sync.");
      emitOutput({ changed: false });
      return;
    }

    printList("Added", added);
    printList("Updated", changed);
    printList("Removed", removed);

    if (dryRun) {
      console.log("\nDRY RUN — changes detected but nothing written.");
      emitOutput({ changed: true, version: readVersion(), summary });
      return;
    }

    // 1) sync files verbatim, with delete semantics
    rmSync(SKILLS_DEST, { recursive: true, force: true });
    mkdirSync(SKILLS_DEST, { recursive: true });
    for (const slug of slugs) {
      cpSync(join(sourceSkills, slug), join(SKILLS_DEST, slug), { recursive: true });
    }

    // 2) version — baseline on first import, patch/minor/major bump thereafter
    const plugin = JSON.parse(readFileSync(PLUGIN_JSON, "utf8"));
    const oldVersion = plugin.version || "0.0.0";
    const newVersion = firstImport ? oldVersion : bumpVersion(oldVersion, bump);
    plugin.version = newVersion;
    writeJson(PLUGIN_JSON, plugin);

    // 3) lock (provenance + per-skill hashes)
    writeJson(LOCK_PATH, {
      source: { repo: SOURCE_REPO, ref: refLabel, commit: sourceCommit },
      pluginVersion: newVersion,
      syncedAt: new Date().toISOString(),
      skills: current,
    });

    // 4) changelog + release notes
    const date = new Date().toISOString().slice(0, 10);
    const entryLines = [
      `## v${newVersion} — ${date}`,
      `Synced from \`${SOURCE_REPO}@${refLabel}\`${sourceCommit ? ` (\`${sourceCommit.slice(0, 8)}\`)` : ""}.`,
      firstImport ? `- Initial import (${slugs.length} skills).` : null,
      added.length ? `- Added: ${added.join(", ")}` : null,
      changed.length ? `- Updated: ${changed.join(", ")}` : null,
      removed.length ? `- Removed: ${removed.join(", ")}` : null,
    ].filter(Boolean);
    prependChangelog(entryLines.join("\n") + "\n");
    if (process.env.SYNC_NOTES_FILE) writeFileSync(process.env.SYNC_NOTES_FILE, entryLines.slice(1).join("\n"));

    console.log(`\nWrote ${slugs.length} skills. Version ${oldVersion} → ${newVersion}.`);
    emitOutput({ changed: true, version: newVersion, summary });
  } finally {
    cleanup();
  }
}

function obtainSource() {
  if (sourceDirOverride) {
    const root = resolve(sourceDirOverride);
    const skills = join(root, "skills");
    if (!existsSync(skills)) fail(`SKILLS_SOURCE_DIR has no skills/ directory: ${root}`);
    return {
      sourceSkills: skills,
      refLabel: explicitRef || tryGit(root, ["rev-parse", "--abbrev-ref", "HEAD"]) || "local",
      sourceCommit: tryGit(root, ["rev-parse", "HEAD"]),
      cleanup: () => {},
    };
  }
  const ref = explicitRef || resolveLatestRef();
  const tmp = mkdtempSync(join(tmpdir(), "ahs-"));
  console.log(`Cloning ${SOURCE_URL} @ ${ref} …`);
  execFileSync("git", ["clone", "--depth", "1", "--branch", ref, SOURCE_URL, tmp], { stdio: "inherit" });
  return {
    sourceSkills: join(tmp, "skills"),
    refLabel: ref,
    sourceCommit: tryGit(tmp, ["rev-parse", "HEAD"]),
    cleanup: () => rmSync(tmp, { recursive: true, force: true }),
  };
}

function resolveLatestRef() {
  const out = execFileSync("git", ["ls-remote", "--tags", "--refs", SOURCE_URL], { encoding: "utf8" });
  const tags = out.split("\n").filter(Boolean).map((l) => l.split("\t")[1].replace("refs/tags/", ""));
  const pick = (re) => tags.filter((t) => re.test(t)).sort(semverCmp).pop();
  const ref = pick(/^v\d+\.\d+\.\d+$/) || pick(/^dev-\d+\.\d+\.\d+$/) || "main";
  console.log(`Resolved source ref: ${ref}`);
  return ref;
}

// ---- helpers ----
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) { out[key] = next; i++; } else { out[key] = true; }
  }
  return out;
}
function truthy(v) { return v === "1" || v === "true" || v === "yes"; }
function tryGit(cwd, a) { try { return execFileSync("git", a, { cwd, encoding: "utf8" }).trim(); } catch { return ""; } }
function parseVer(v) { const m = String(v).replace(/^v/, "").replace(/^dev-/, "").match(/^(\d+)\.(\d+)\.(\d+)/); return m ? [+m[1], +m[2], +m[3]] : [0, 0, 0]; }
function semverCmp(a, b) { const x = parseVer(a), y = parseVer(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; }
function bumpVersion(v, kind) { let [a, b, c] = parseVer(v); if (kind === "major") { a++; b = 0; c = 0; } else if (kind === "minor") { b++; c = 0; } else { c++; } return `${a}.${b}.${c}`; }
function readVersion() { try { return JSON.parse(readFileSync(PLUGIN_JSON, "utf8")).version || "0.0.0"; } catch { return "0.0.0"; } }
function writeJson(p, obj) { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, `${JSON.stringify(obj, null, 2)}\n`); }
function printList(label, arr) { if (arr.length) console.log(`  ${label}: ${arr.join(", ")}`); }
function prependChangelog(entry) {
  const title = "# Changelog\n\n";
  let body = "";
  if (existsSync(CHANGELOG_PATH)) {
    const cur = readFileSync(CHANGELOG_PATH, "utf8");
    body = cur.startsWith(title) ? cur.slice(title.length) : cur;
  }
  writeFileSync(CHANGELOG_PATH, title + entry + "\n" + body);
}
function emitOutput(o) {
  const gh = process.env.GITHUB_OUTPUT;
  if (!gh) return;
  let s = `changed=${o.changed ? "true" : "false"}\n`;
  if (o.changed) s += `version=${o.version}\nsummary=${o.summary}\n`;
  appendFileSync(gh, s);
}
function fail(msg) { console.error(`ERROR: ${msg}`); process.exit(1); }
