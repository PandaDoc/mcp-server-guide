---
name: pandadoc-approval-send
category: bizops
roles: [sales, bizops, ops]
complexity: advanced
prerequisites: [PandaDoc]
description: Create a document from a template and route it through its internal approval chain — read the approval steps, send through the chain where the API allows it, and hand off to PandaDoc where it does not. Use when a document needs internal sign-off before it reaches the counterparty.
tags: [pandadoc, approvals, workflow, e-signature, bizops]
version: "0.2.1"
metadata:
  visibility: public
---

# PandaDoc Approval-Routed Send

Send a document through internal approval instead of straight to the counterparty.

**Verified against live chains.** Reading a chain and routing a document through it were both exercised
end to end: a `Draft` created from a template with an approval workflow exposes a populated
`approval_execution`, and sending it lands the document in `Waiting for Approval`. One shape cannot be
sent at all — a group whose `type` is `selectable` — and Step 3 explains why and what to do instead.

---

## Prerequisites

The PandaDoc MCP Server must be connected. Required tools: `PandaDoc:templates_list`, `PandaDoc:templates_details_get`,
`PandaDoc:documents_create`, `PandaDoc:documents_status_get`, `PandaDoc:documents_details_get`, `PandaDoc:documents_send`. Useful:
`PandaDoc:documents_update` to fix an unassigned signature field before retrying a send. If they are missing,
say so and point at <https://mcp.pandadoc.com>.

An **approval workflow must be configured on the template or document** in PandaDoc. This skill cannot
create one: no MCP tool exposes approval-chain configuration, only reading a chain and routing a document
through it. Configuring one is a UI action in PandaDoc.

---

## How approvals appear in the API

`PandaDoc:documents_details_get` returns **`approval_execution`**. It is `null` when no approval workflow applies
to the document. When populated it looks like this:

```json
{
  "next_step": "<step id>",
  "is_completed": false,
  "is_ordering_enabled": true,
  "is_editing_allowed": false,
  "sender": { "email": "sender@example.com", "id": "<user id>" },
  "sender_message": "Please review and approve",
  "skip_user": null,
  "skip_message": null,
  "steps": [ /* see below */ ]
}
```

### A step comes in one of two shapes

**Group step** — a named group, with one or more candidate assignees:

```json
{
  "id": "<step id>",
  "assignee": null,
  "group": {
    "id": "<group id>",
    "name": "Finance",
    "type": "optional",
    "assignees": [
      { "id": "<assignee id>", "user": { "email": "a@example.com", "id": "<user id>" }, "is_document_sender": false }
    ]
  },
  "conditions": [], "condition_operator": "or",
  "approve_user": null, "approve_message": null,
  "reject_user": null, "reject_message": null,
  "is_skipped": false, "skip_reason": null
}
```

**Direct-assignee step** — one named person, and **`group` is `null`**:

```json
{
  "id": "<step id>",
  "assignee": { "id": "<assignee id>", "user": { "email": "b@example.com", "id": "<user id>" }, "is_document_sender": false },
  "group": null,
  "conditions": [], "condition_operator": "or",
  "approve_user": null, "approve_message": null,
  "reject_user": null, "reject_message": null,
  "is_skipped": false, "skip_reason": null
}
```

Both shapes occur in practice. Code that only reads `step.group.assignees` will throw or silently skip
every direct-assignee step — always check `group` for `null` and fall back to `assignee`.

### Reading the state of a chain

- **`is_completed`**, not `next_step`, is what to read for "is the chain finished". **`next_step` is
  unreliable**: it was `null` in every state observed so far — an unstarted chain on a `Draft`, a chain
  freshly started by a send, a part-approved chain, and a completed one. Never infer anything from it.
- **`is_ordering_enabled`** appears to distinguish a sequential chain (steps run in order) from a parallel
  one. Inferred from the field and from chains that carry it; parallel execution was not observed directly.
- **`approve_user` / `approve_message`** are populated on steps already approved, and carry the approver's
  own comment. **`reject_user` / `reject_message`** likewise on rejection. A rejection **stops** the chain:
  `is_completed` stays `false`, so check for a `reject_user` on any step before calling a chain "still
  running" on the strength of `is_completed` alone.
- **`group.type`** has two observed values. **`optional`** means any member of the group may approve; one
  candidate approving was enough to advance a live chain. **`selectable`** means the sender must nominate
  which member approves — set by "Allow user to select approver" on the approval step. The distinction
  decides whether the document can be sent at all: see Step 3.
- **`is_selected`** appears on each group assignee in the response too, not only in the send payload. On a
  `selectable` group it is `false` for everyone until a selection is made.
- **`is_skipped` / `skip_reason`** mark a step the workflow bypassed, usually via `conditions`. A skipped
  step is **not** an approved step and must never be reported as one.
- **`conditions` / `condition_operator`** describe conditional approvals — a step that only engages when
  the document meets some criterion. An empty `conditions` array is presumed to mean the step always
  applies; the element shape of a populated one has not been observed.
- **`sender` / `sender_message`** are `null` on a `Draft` and populate at send. `sender_message` is simply
  the `message` passed to `PandaDoc:documents_send`, not a workflow setting.
- **`date_sent` stays `null`** while a document is in `Waiting for Approval`. It is not a signal that the
  document did or did not go out — read `status`.

### Sending

`PandaDoc:documents_send` accepts **`selected_approvers`**, shaped as:

```json
{ "steps": [ { "id": "<step id>",
               "group": { "id": "<group id>", "type": "<group type>",
                          "assignees": [ { "user": "<user>", "is_selected": true } ] } } ] }
```

The tool description says to copy `steps` from `approval_execution`. Note that this is a **transform, not a
copy** — the step and group *ids* carry over, but the response's assignee
(`{id, user: {…}, is_document_sender}`) is not the payload's assignee (`{user, is_selected}`), so rebuild
`assignees` rather than passing the ones you read.

**A direct-assignee step is omitted entirely.** Every entry requires `id` and `group`, and `group` requires
`id`, `type` and `assignees` — a step whose `group` is `null` has no representation here. Leaving such steps
out is correct: a document whose only step was a direct assignee sent cleanly with no `selected_approvers`
and landed in `Waiting for Approval`.

**This payload cannot actually be sent.** PandaDoc also requires `group.name`, and the tool's schema has no
`name` property, so a value passed for it is dropped before the request leaves. Every call fails: omit
`name` and the API rejects it as missing; supply it and the API still rejects it as missing. The practical
consequence is that approver selection is unavailable through MCP, which is why Step 3 refuses to send a
`selectable` chain rather than trying. Which of `assignee.id` and `assignee.user.id` belongs in `"user"` is
therefore moot and remains unknown — the request never gets far enough for it to matter.

`Sent`, `Viewed`, `Waiting for Approval`, `Approved` and `Rejected` are **system-set** statuses —
`PandaDoc:documents_status_change` cannot set them. Only `Completed`, `Paid`, `Expired`, `Declined` can be set
manually. (Carried from the tool schema, not re-verified live.)

---

## Workflow

### Step 1: Create the document

Find and inspect the template as normal — `PandaDoc:templates_list` (remember `q` is fuzzy, so confirm the match),
then `PandaDoc:templates_details_get` for `roles[]` and `tokens[]`. Create with `PandaDoc:documents_create`, using the exact
role names, and `delivery_methods: {email: true, sms: false}`.

Poll `PandaDoc:documents_status_get` until `Draft` — `PandaDoc:documents_create` returns `Uploaded` first, and the chain is
not readable until the document reaches `Draft`.

### Step 2: Read the approval chain

`PandaDoc:documents_details_get` and look at `approval_execution`.

**If it is `null`, there is no approval workflow on this document.** Say so plainly and ask whether to send
it directly. Do not pretend to route something that has no chain — and do not fabricate a
`selected_approvers` payload, which would either error or be ignored.

If it is populated, walk `steps`. For each step, resolve the candidates by shape: `group.assignees` when
`group` is present, the single `assignee` when `group` is `null`. Note any step with a non-empty
`conditions` array — it may not engage at all.

Check `is_ordering_enabled` before describing the chain: when it is `true` the steps run in sequence and
should be presented as ordered; when it is `false` they run in parallel, so do not imply one waits on
another.

### Step 3: Check whether the chain can be sent at all

Read `group.type` on every step before going near `PandaDoc:documents_send`.

- **Direct-assignee step** (`group: null`) — sendable. There is no selection to make.
- **`group.type: "optional"`** — sendable. Any member of the group may approve. You are not choosing an
  approver and must not imply that you did.
- **`group.type: "selectable"`** — **not sendable. Stop here and go to Step 3a.**

A `selectable` group requires the sender to nominate one approver, and that nomination cannot be expressed
through this MCP server. `PandaDoc:documents_send` takes a `selected_approvers` payload, but PandaDoc requires
`group.name` inside it and the tool's schema has no such property, so the field is dropped in transit.
Both routes therefore fail, and neither is recoverable in-skill:

- omitting `selected_approvers` → `400 UNABLE_TO_REQUEST_BECAUSE_NOT_ACTIVE_ASSIGNEE`, *"For selectable
  groups assignees should be selected"*
- supplying it → `400`, `{"selected_approvers": {"steps": [{"group": {"name": ["This field is required."]}}]}}`

Do not attempt the send to "see what happens". It will fail, and a failed send reported as a send is the
worst outcome this skill can produce.

Keep this paragraph if you edit the file: the guard below looks arbitrary without it.

### Step 3a: Hand off a selectable chain

The draft is still worth having — the user finishes it in PandaDoc. Report in plain language: what you
created, that the approval step lets the sender choose who approves and that you cannot make that choice
automatically, and what to do next. Name the candidates as information, not as a question — the user is
about to pick them from a list and it saves them looking.

Do **not** explain MCP, schemas, or HTTP codes to the user. "Not something I can do automatically" is the
whole explanation they need.

> I've created the draft **"MSA – Acme Corp"**. It needs internal approval before it can go out, and the
> approval step lets the sender choose who approves it — that choice isn't something I can make
> automatically, so I've stopped at the draft rather than sending it.
>
> To finish it:
>
> 1. Open it: `https://app.pandadoc.com/a/#/documents/<document id>`
> 2. Send it from there — you'll be asked to pick the approver
> 3. Choose **\<Approver A\>** or **\<Approver B\>**
>
> It'll go to them for approval first; it won't reach the counterparty until that's done.

Never ask "who should approve?" on a selectable chain. You could not act on the answer.

### Step 4: Send through the chain

Only reached when every step is a direct assignee or an `optional` group. Call `PandaDoc:documents_send` with
`subject` and `message` and **no `selected_approvers`** — there is nothing to select on these shapes, and
the parameter cannot be sent successfully anyway (Step 3).

- `409 The document isn't ready for a status transition yet` — retry once. Known race even after `Draft`.
- `400 NOT_ALL_FIELDS_WERE_ASSIGNED` — a signing role has no recipient, so its signature and initials
  fields are unassigned. Create the document with a recipient for **every** role, not just the
  counterparty, or fix it with `PandaDoc:documents_update` before retrying.
- `DOCUMENT_HAS_UNFILLED_VARIABLES` — the document still has empty variables, listed in
  `detail.unfilled_variables`. Ask whether to fill them or send blank; retry with
  `skip_unfilled_variables: true` only once the user has chosen.

After sending, poll `PandaDoc:documents_status_get`. Expect `Waiting for Approval` rather than `Sent` while the chain
runs. Report the status you actually observed rather than assuming.

### Step 5: Report

State the document, the chain as configured, who was selected for each step, and the current status.

**Report only what the payload contains.** `approval_execution` has no timestamps anywhere — no approval
date, no "approved on", no elapsed time. If you catch yourself writing a date, delete it: it is invented.

When reporting progress through a running chain, read it off the step fields rather than guessing:

- a step with `approve_user` set is approved — name the approver, and quote `approve_message` if present.
  `approval_execution` carries **no timestamps**: do not state when a step was approved, and never invent a
  date to fill the gap
- a step with `is_skipped: true` was **bypassed, not approved** — say skipped, and give `skip_reason`
- a step with `reject_user` set stopped the chain — name who rejected it and why
- steps **after** a rejected one were never reached. Report them as unreached, not pending: a rejected
  chain is not waiting on anyone, and calling the next step "pending" implies sign-off is still coming.
  Their fields look identical to a genuinely pending step, so the rejection is what you read this from,
  not the step itself
- on a chain with no rejection, everything else is still pending

Make clear the document has **not** reached the counterparty yet if it is waiting on approval — that
distinction is the whole point of this skill.

---

## Usage examples

```txt
@pandadoc-approval-send — create the MSA for Acme from our standard template and route it for approval
```

```txt
@pandadoc-approval-send — this discount needs finance sign-off before it goes out
```

---

## Troubleshooting

### `approval_execution` is `null`

No approval workflow is attached to this document or its template. Say so and ask whether to send directly.
Workflows are configured in PandaDoc, not through the API.

### `step.group` is `null`

That is a direct-assignee step, not a broken payload. Read `step.assignee` instead. Both shapes are normal.

### `next_step` is `null` but the document is still `Waiting for Approval`

Expected — `next_step` is not a reliable progress pointer. Use `is_completed` for whether the chain is
finished, and the per-step `approve_user` / `is_skipped` / `reject_user` fields for where it stands.

### A step shows `is_skipped: true`

A condition on that step did not match, so the workflow bypassed it. Report it as skipped with its
`skip_reason`. Calling it approved misrepresents who signed off.

### The document went straight to `Sent`

Either no chain applied, or `selected_approvers` was omitted or rejected. Check `approval_execution` again
and report what actually happened rather than what was intended.

### `documents_status_change` will not set `Approved`

Correct — `Sent`, `Viewed`, `Approved`, `Rejected` and `Waiting for Approval` are system-set. Only
`Completed`, `Paid`, `Expired`, `Declined` can be set manually.

### I do not know which approver to pick

Then the step is a `selectable` group, and the answer is neither ask nor choose — you cannot act on a
choice, so asking for one wastes the user's time and implies a capability you lack. Never pick on their
behalf either: an approval chain exists precisely so a named human signs off. Hand the draft off per
Step 3a and let them select in PandaDoc.

### The send "succeeded" but the document is still `Draft`

It did not succeed. `PandaDoc:documents_send` wraps its result in an envelope, and a rejected send comes back as an
outer success containing an inner `isError: true` with the real `error.code` — read the inner payload, not
the outer flag. Whatever the response says, confirm with `PandaDoc:documents_status_get`: a document that did not
move is a document that did not send.

### `UNABLE_TO_REQUEST_BECAUSE_NOT_ACTIVE_ASSIGNEE` on send

"For selectable groups assignees should be selected." The chain has a `selectable` group and cannot be sent
through the API — see Step 3. Do not retry with `selected_approvers`; that fails too. Hand off per Step 3a.

### The send is rejected on `selected_approvers`

Expected — the payload cannot be sent at all (see Sending). Do not iterate on the `"user"` value; the
request fails on the missing `group.name` before `"user"` is ever read. Stop and hand off per Step 3a.
