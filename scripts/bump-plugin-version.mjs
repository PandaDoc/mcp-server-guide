// Sets every plugin manifest to base version + 1 (patch) and writes the matching CHANGELOG entry.
// Idempotent: the target is derived from the base branch, so re-running on a re-synced PR
// rewrites the same version and replaces the same changelog entry.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const BASE_REF = process.env.BASE_REF ?? "origin/main";
// .claude-plugin/plugin.json is the source of truth; the others are kept equal to it.
const SOURCE = ".claude-plugin/plugin.json";
const MANIFESTS = [
  "plugin.json",
  SOURCE,
  ".cursor-plugin/plugin.json",
  ".github/plugin/plugin.json",
  "gemini-extension.json",
  "server.json",
];

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

const skillChanges = git("diff", "--name-status", `${BASE_REF}...HEAD`, "--", "skills/")
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [status, path] = line.split("\t");
    return { status, name: path.split("/")[1] };
  });

if (skillChanges.length === 0) {
  console.log("No skill changes against base, nothing to bump");
  process.exit(0);
}

const baseVersion = JSON.parse(git("show", `${BASE_REF}:${SOURCE}`)).version;
const [major, minor, patch] = baseVersion.split(".").map(Number);
const next = `${major}.${minor}.${patch + 1}`;

for (const file of MANIFESTS) {
  const json = JSON.parse(readFileSync(file, "utf8"));
  json.version = next;
  writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
}

const names = (statuses) =>
  [...new Set(skillChanges.filter((c) => statuses.includes(c.status[0])).map((c) => c.name))].sort();
const lines = [
  ["Added", names(["A"])],
  ["Updated", names(["M", "R"])],
  ["Removed", names(["D"])],
]
  .filter(([, list]) => list.length)
  .map(([label, list]) => `- ${label}: ${list.join(", ")}`);

const changelog = readFileSync("CHANGELOG.md", "utf8");
const heading = `## v${next}`;
const existing = changelog.match(new RegExp(`^${heading.replace(".", "\\.")} — (\\S+)$`, "m"));
// Keep the original date when replacing, so a re-run on another day does not create a diff.
const date = existing?.[1] ?? new Date().toISOString().slice(0, 10);
const entry = `${heading} — ${date}\n${lines.join("\n")}\n\n`;

const withoutOld = changelog.replace(
  new RegExp(`^${heading.replace(".", "\\.")} — .*?\\n\\n(?=## |$)`, "ms"),
  "",
);
const [title, ...rest] = withoutOld.split("\n\n");
writeFileSync("CHANGELOG.md", `${title}\n\n${entry}${rest.join("\n\n")}`);

console.log(`Bumped ${baseVersion} -> ${next}`);
