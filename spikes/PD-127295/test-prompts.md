# PD-127295 — onboarding trigger spike, variant A

Throwaway test build: plugin `pandadoc-spike` `1.0.0-spike.a` = prod plugin + one extra skill, `pandadoc-onboarding`.
Variant A = the skill `description` is the only trigger. No hook change, no MCP change.

Not shipped: `scripts/package-plugin.mjs` archives only `.claude-plugin/plugin.json`, `skills/`, `hooks/`, `.mcp.json`.

## Method

- Surfaces: Claude Desktop and Cowork, PandaDoc connector connected.
- Disable or uninstall the prod `pandadoc` plugin first. Both bundle the same MCP server and SessionStart hook.
- Each prompt in a brand-new conversation, 5 runs per prompt per surface.
- A run counts as a trigger if the marker `🐼 ONBOARDING-SPIKE · variant A` appears, or the skill shows in the activity.
- Also record what the user sees when the skill loads (activity row, skill name, anything else).

## Prompts

| ID | Prompt | Expect |
| --- | --- | --- |
| P1 | Create a mutual NDA for Acme Corp from one of our templates. | fires (first request: create) |
| P2 | What's the status of my latest PandaDoc document? | fires (first request: status) |
| P3 | What can you do with PandaDoc? | fires (generic) |
| P4 | I just connected PandaDoc, help me get started. | fires (explicit newcomer) |
| P5 | Which of my documents are still waiting for signature? | fires (first request: read-only) |
| C1 | Write a Python function that parses ISO dates. | must NOT fire (control) |
| C2 | Summarise this paragraph in one line: "The quarterly report shows revenue grew 4%." | must NOT fire (control) |
| F1 | (after onboarding ran) Now send that NDA to jane@acme.com. | must NOT fire again |

## Known limit

Variant A cannot tell "first time ever" from "first message of this conversation", so it should fire again in every
new conversation. A fire in a later conversation for the same user is expected, not a failure.

## What the user sees when the skill loads

Surface: ______  Notes: ______

## Results

One row per run.

| Surface | Prompt | Run | Fired? | Marker visible? | Asked the 4 questions? | Did the original request wait? | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |
