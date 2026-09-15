#!/usr/bin/env node
/**
 * SessionStart hook — greet the user and surface the PandaDoc skills.
 *
 * Full welcome once per install (guarded by a marker in CLAUDE_PLUGIN_DATA), a short
 * reminder afterwards. The skill list is read from the vendored skills/, so it stays
 * correct as skills are synced. Never breaks a session: any error → emit nothing, exit 0.
 *
 * Note: hooks run in Cowork / Claude Code, not plain chat — there the strong skill
 * descriptions carry discovery on their own.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

try {
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || join(dirname(fileURLToPath(import.meta.url)), "..");
  const skills = readSkills(join(pluginRoot, "skills"));
  if (skills.length > 0) {
    const context = markFirstRun() ? fullWelcome(skills) : shortReminder(skills);
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: context },
    }));
  }
} catch {
  // Stay silent on any failure — never disrupt the session.
}
process.exit(0);

function readSkills(dir) {
  if (!existsSync(dir)) return [];
  const skills = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = join(dir, entry.name, "SKILL.md");
    if (!existsSync(file)) continue;
    const fm = frontmatter(readFileSync(file, "utf8"));
    skills.push({
      name: fm.name || entry.name,
      description: fm.description || "",
      category: fm.category || "other",
    });
  }
  return skills.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

function frontmatter(text) {
  const out = {};
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return out;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].replace(/^["']|["']$/g, "").trim();
  }
  return out;
}

function markFirstRun() {
  const dataDir = process.env.CLAUDE_PLUGIN_DATA;
  if (!dataDir) return false; // can't track → play it safe with the short reminder
  try {
    const marker = join(dataDir, ".welcomed");
    if (existsSync(marker)) return false;
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(marker, new Date().toISOString());
    return true;
  } catch {
    return false;
  }
}

function fullWelcome(skills) {
  const groups = {};
  for (const s of skills) (groups[s.category] ||= []).push(s);

  const lines = [
    "# PandaDoc plugin",
    "",
    `The PandaDoc plugin is installed — ${skills.length} document-automation skills. They use the PandaDoc connector; if a skill reports it isn't connected, connect it from the plugin's Connectors tab.`,
    "",
    "Available skills:",
  ];
  for (const cat of Object.keys(groups).sort()) {
    lines.push("", `**${cap(cat)}**`);
    for (const s of groups[cat]) lines.push(`- \`${s.name}\` — ${firstSentence(s.description)}`);
  }
  lines.push(
    "",
    "Try asking, in your own words:",
    '- "Send a mutual NDA to Acme Corp."',
    '- "Build a quote from our Enterprise template for 25 seats."',
    '- "Which contracts expire in the next 30 days?"',
    "",
    "Type `/` to browse them, or just describe the task and the right skill runs automatically.",
  );
  return lines.join("\n");
}

function shortReminder(skills) {
  return `PandaDoc plugin active — ${skills.length} skills for documents, quotes, NDAs, approvals and contract insights (needs the PandaDoc connector). Type \`/\` to browse, or just describe the task.`;
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function firstSentence(d) {
  const text = String(d).trim();
  const dot = text.indexOf(". ");
  const first = dot > 0 ? text.slice(0, dot) : text;
  return first.length > 140 ? `${first.slice(0, 137)}…` : first;
}
