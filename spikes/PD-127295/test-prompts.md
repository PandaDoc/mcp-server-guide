# PD-127295 — onboarding trigger spike

Throwaway test builds: plugin `pandadoc-spike` = prod plugin + one extra skill, `pandadoc-onboarding`.

| Variant | Version | Trigger | Commit |
| --- | --- | --- | --- |
| A | `1.0.0-spike.a` | Skill `description` only. No hook change, no MCP change. | `d767cf0` |
| B | `1.0.0-spike.b` | Same `description`, plus an "IMPORTANT — FIRST ACTION" directive appended to the SessionStart hook output (full welcome and short reminder). | see branch tip |

The skill `description` is byte-identical in A and B, so a difference between them comes from the hook.
The marker text names the variant, so a tester can tell which build ran.

Not shipped: `scripts/package-plugin.mjs` archives only `.claude-plugin/plugin.json`, `skills/`, `hooks/`, `.mcp.json`.

## Method

- Surfaces: Claude Desktop and Cowork, PandaDoc connector connected **before** the first prompt.
- Install one variant at a time. Disable or uninstall the prod `pandadoc` plugin first. Both bundle the same MCP server and SessionStart hook.
- Each prompt in a brand-new conversation, 5 runs per prompt per surface per variant.
- A run counts as a trigger if the marker `🐼 ONBOARDING-SPIKE · variant` appears, or the skill shows in the activity.
- Also record what the user sees when the skill loads (activity row, skill name, anything else).

## Prompts

| ID | Prompt | Expect |
| --- | --- | --- |
| P1 | Create a mutual NDA for Acme Corp from one of our templates. | fires (first request: create) |
| P2 | What's the status of my latest PandaDoc document? | fires (first request: status) |
| P3 | What can you do with PandaDoc? | fires (generic) |
| P4 | I just connected PandaDoc, help me get started. | fires (explicit newcomer) |
| P5 | Which of my documents are still waiting for signature? | fires (first request: read-only) |
| P6 | I just connected to Pandadoc. Pull one of my existing documents and show me what I can do with it. If I don't have any documents yet, help me create one. | fires (newcomer + concrete task) |
| C1 | Write a Python function that parses ISO dates. | must NOT fire (control) |
| C2 | Summarise this paragraph in one line: "The quarterly report shows revenue grew 4%." | must NOT fire (control) |
| F1 | (after onboarding ran) Now send that NDA to jane@acme.com. | must NOT fire again |

## Known limits

- Neither variant can tell "first time ever" from "first message of this conversation", so both should fire again in
  every new conversation. A fire in a later conversation for the same user is expected, not a failure.
- Variant B depends on the surface running plugin SessionStart hooks. The hook's own header says they run in
  Cowork / Claude Code, not plain chat. If B behaves exactly like A, check this first: right after a run, ask
  "What did the PandaDoc plugin's session-start context say?". If Claude can quote the IMPORTANT line, the hook ran
  and was ignored. If it can't, the hook did not run on that surface.

## What the user sees when the skill loads

Surface: ______  Notes: ______

## Results

One row per run.

| Variant | Surface | Prompt | Run | Fired? | Marker visible? | Asked the 4 questions? | Did the original request wait? | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A | Claude Desktop (single UI, chat/Cowork unclear) | P6 | 1 | No | No | No | No | Connector was not connected at start; connected mid-conversation. Activity showed `Loaded PandaDoc`, then documents_list, details_get, summary_get; went straight to the task. Skill confirmed present in the `/` menu as "Pandadoc spike plugin". |
|  |  |  |  |  |  |  |  |  |
