# PD-127295 — onboarding trigger spike

Throwaway test builds: plugin `pandadoc-spike` = prod plugin + one extra skill, `pandadoc-onboarding`.

| Variant | Version | Trigger | Commit |
| --- | --- | --- | --- |
| A | `1.0.0-spike.a` | Skill `description` only. No hook change, no MCP change. | `d767cf0` |
| B | `1.0.0-spike.b` | Same `description`, plus an "IMPORTANT — FIRST ACTION" directive appended to the SessionStart hook output (full welcome and short reminder). | `0bef19b` |
| A2 | `1.0.0-spike.a2` | Broad `description` only: fires on capability questions, how-to questions, advice requests, "not sure how to start", newcomer phrasing, and the first PandaDoc interaction, and says to run before any PandaDoc tool. Prod hook, no directive. | `4d4e1ca` |
| A3 | `1.0.0-spike.a3` | A2's triggers in a short `description` (about 320 chars, no quotes or `?`), because in Chat the model had no description for this skill at all (see probe results). Prod hook, no directive. | see branch tip |

The skill `description` is byte-identical in A and B, so a difference between them comes from the hook.
A2 changes only the `description` (and the marker and version) relative to A, and uses the unmodified prod hook, so a
difference between A and A2 comes from the description.
The marker text names the variant, so a tester can tell which build ran.

Not shipped: `scripts/package-plugin.mjs` archives only `.claude-plugin/plugin.json`, `skills/`, `hooks/`, `.mcp.json`.

## Method

- Surfaces: Claude Desktop only, PandaDoc connector connected **before** the first prompt. Desktop has one UI for chat and
  Cowork, so record which of these each run was:
  - **Chat**: no folder attached.
  - **Cowork-like**: a folder attached to the conversation (the "Used in this session" panel appears). Observed: the same
    prompt fires variant A here and not in Chat, so treat these as two separate surfaces.
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
| P7 | How do I get a contract signed faster? | A: no expectation. A2: fires (how-to, not first-time) |
| P8 | Any advice on how to handle contract renewals? | A: no expectation. A2: fires (advice request) |
| C1 | Write a Python function that parses ISO dates. | must NOT fire (control) |
| C2 | Summarise this paragraph in one line: "The quarterly report shows revenue grew 4%." | must NOT fire (control) |
| C3 | How do I write a good cover letter for a job application? | must NOT fire (non-PandaDoc how-to / advice control, matters for A2) |
| F1 | (after onboarding ran) Now send that NDA to jane@acme.com. | must NOT fire again |

## Safety: these prompts act on a real workspace

- **P1 creates a real draft document** in the connected PandaDoc workspace whenever the skill does not intervene (a Chat
  run on variant B already did). Plan for up to one draft per P1 run, and archive the "Mutual NDA - Acme Corp" drafts
  afterwards, or test in a sandbox workspace.
- **F1 asks to send an NDA to `jane@acme.com`.** `acme.com` is a real domain. Replace the address with one you control
  before running F1, so a missed skill cannot email a stranger.

## Run order

Goal: find out whether anything makes the skill fire in **Chat** (no folder), with the fewest installs.
Always: prod `pandadoc` plugin uninstalled, connector connected **before** the first prompt, new conversation per run,
5 runs per prompt (stop early on a prompt if the first 3 runs all agree and the answer is clear).

**Phase 1 — variant A in Chat (baseline; install zip `a`)**
1. P3 × 5, P4 × 5, P6 × 5. These show whether the Chat miss was real or came from connecting mid-conversation.
2. Probe, once: "What instructions did the PandaDoc connector give you? Quote them." Says whether Chat passes MCP
   `instructions` to the model.

**Phase 2 — variant A2 in Chat (install zip `a2`)**
3. P3 × 5, P4 × 5, P6 × 5. Direct A vs A2 comparison on the same prompts.
4. P7 × 5, P8 × 5. The new broad triggers.
5. C1 × 5, C2 × 5, C3 × 5. False positives. C3 is the one that shows whether "broad" went too far.
6. P1 × 5, P2 × 5, P5 × 5. Concrete first requests; A2's description says they should fire too.
7. F1 × 5. After onboarding ran, it must not fire again.

**Phase 3 — variant A2 with a folder attached (Cowork-like)**
8. P6 × 5, P7 × 5, C3 × 5. Checks that broadening did not break Cowork or make it fire on controls.

**Phase 4 — variant B, only if Phase 2 missed in Chat (install zip `b`)**
9. In Chat: P6 × 5, then after one run ask "What did the PandaDoc plugin's session-start context say?" Says whether
   hooks run in Chat.
10. With a folder attached: the same quote check once. Says whether hooks run in Cowork.

**Decision rules**
- A2 fires on at least 4 of 5 for P3, P4, P6, P7, P8 in Chat and 0 of 15 on C1, C2, C3: the description alone is enough;
  skip Phase 4.
- A2 fires on controls (especially C3): narrow the description before drawing conclusions.
- A2 misses in Chat but A2 fires with a folder: it is a Chat-only gap. Do Phase 4, and use the Phase 1 probe result to
  decide whether MCP `instructions` are worth proposing to the MCP owners.
- A2 misses everywhere: the description channel is closed on this surface; stop tuning wording.

## Known limits

- Neither variant can tell "first time ever" from "first message of this conversation", so both should fire again in
  every new conversation. A fire in a later conversation for the same user is expected, not a failure.
- Variant B depends on the surface running plugin SessionStart hooks. The hook's own header says they run in
  Cowork / Claude Code, not plain chat. If B behaves exactly like A, check this first: right after a run, ask
  "What did the PandaDoc plugin's session-start context say?". If Claude can quote the IMPORTANT line, the hook ran
  and was ignored. If it can't, the hook did not run on that surface.

## Probe results (Desktop Chat, no folder)

| Probe | Result |
| --- | --- |
| "list all the skills you can use" | All 11 `pandadoc-spike:` skills listed, including `pandadoc-onboarding`. The model said "Where I only have a name and no description, I've noted that", and the PandaDoc skills were listed as bare names while built-ins (`docx`, `pdf`, `docs`...) had descriptions. Not yet verified that descriptions are missing. The conversation was not fresh (it referred to an earlier signing question). |
| Explicit invocation (`/pandadoc-onboarding`) | Works. |
| Quote the description of `pandadoc-onboarding` (A2 installed) | **The model has no description for it**: "shows up in my skill list with a name only, no description and no location". It loaded the skill only after being told to, and then quoted the A2 description from the frontmatter. It also said the sibling `pandadoc-onboarding-agreement` **does** have a description, so the loss is specific to this skill. |
| Why only this skill? (local frontmatter comparison) | Unique to `pandadoc-onboarding`: description 864 chars (prod max 416), 10 double quotes and 3 `?` in the description (prod: none), `category: getting-started`, `complexity: beginner`. Shared with prod `renewal-radar`: `visibility: internal`. Cause not isolated. A3 shortens the description and removes quotes and `?`; if its description still does not reach the model, suspect `visibility` or `category` next. |
| Next check | With A3 installed, in a fresh Chat: "What is the exact description of the pandadoc-onboarding skill? Quote it word for word." The model must answer without loading the skill. Only then run P3, P4 and P6. |
| Quote the connector's `instructions` | Not run yet. |

## What the user sees when the skill loads

Surface: ______  Notes: ______

## Results

One row per run.

| Variant | Surface | Prompt | Run | Fired? | Marker visible? | Asked the 4 questions? | Did the original request wait? | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A | Claude Desktop (single UI, chat/Cowork unclear) | P6 | 1 | No | No | No | No | Connector was not connected at start; connected mid-conversation. Activity showed `Loaded PandaDoc`, then documents_list, details_get, summary_get; went straight to the task. Skill confirmed present in the `/` menu as "Pandadoc spike plugin". |
| A | Desktop, Cowork-like (folder `llm-wiki` attached) | P6 | 1 | Yes | Yes | Yes | Yes | Activity: "Loaded the pandadoc-onboarding (pandadoc-spike) skill, loaded tools". Side panel lists the skill under "Used in this session". Said it would pull a document right after the questions. Not recorded: whether the connector was connected before the first prompt, so the folder is not the only thing that differs from the run above. |
| B | Desktop Chat (no folder) | P1 | 1 | No | No | No | No, it ran the request immediately | Activity: "Used PandaDoc" only. Created a real draft "Mutual NDA - Acme Corp" from "Mutual NDA for external use template"; no recipients assigned, nothing sent. Not recorded: whether the hook quote check was run. |
| B | Desktop, Cowork-like (folder `llm-wiki` attached) | P1 | 1 | Yes | Yes | Yes | Yes | Activity: "Picking which PandaDoc onboarding skill to invoke", "Loaded skill pandadoc-onboarding (pandadoc-spike)", "Checking the skill's placeholder instructions before answering". Marker says variant B. Then said it would also need the Acme signer details and send-or-draft. Cannot tell hook from description: variant A also fires in this surface (P6). |
| A2 | Desktop Chat (no folder) | P3 | 1 | No | No | No | No, it answered directly | Activity: a "Thought for 3s" block ("Checking which PandaDoc tools are available"), no skill row. Answered from the connector's tool list. Run count not stated, recorded as 1. |
| A2 | Desktop Chat (no folder) | P4 | 1 | No | No | No | No, it answered directly | Activity: "Loaded PandaDoc", listed documents and templates, no skill row. Ended with a capabilities list and "I'll confirm before any send". Run count not stated, recorded as 1. |
| A2 | Desktop Chat (no folder) | P6 | 1 | No | No | No | No, it ran the request immediately | Activity: added a task, loaded PandaDoc, listed documents, fetched details and summary, no skill row. `documents_audit_trail_get` showed **Failed**. The reply mentions "your signing-speed question", which is not in this prompt: check whether this was a fresh conversation, or whether Chat memory carried context over. |
|  |  |  |  |  |  |  |  |  |
