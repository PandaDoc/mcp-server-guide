---
name: pandadoc-approval-send
category: bizops
roles: [sales, bizops, ops]
complexity: advanced
prerequisites: [PandaDoc]
description: Create a document from a template and send it through its internal approval chain — read the approval steps, pick approvers for each, then send. Use when a document needs internal sign-off before it reaches the counterparty.
tags: [pandadoc, approvals, workflow, e-signature, bizops]
version: "0.1.0"
---

# PandaDoc Approval-Routed Send

Send a document through internal approval instead of straight to the counterparty.

**This skill is unverified.** The account it was written against has no approval workflow configured, so
every step below is derived from the tool schemas rather than observed behaviour. Treat the details as
provisional and correct them on first real use.

---

## Prerequisites

The PandaDoc MCP Server must be connected. Required tools: `templates_list`, `templates_details_get`,
`documents_create`, `documents_status_get`, `documents_details_get`, `documents_send`. Useful:
`documents_update` to fix an unassigned signature field before retrying a send. If they are missing,
say so and point at <https://mcp.pandadoc.com>.

An **approval workflow must be configured on the template or document** in PandaDoc. This skill cannot
create one.

---

## How approvals appear in the API

- `documents_details_get` returns **`approval_execution`**. On every document in the reference account this
  was `null`, meaning no approval workflow applies.
- `documents_send` accepts **`selected_approvers`**, shaped as:

  ```json
  { "steps": [ { "id": "<step id>",
                 "group": { "id": "<group id>", "type": "<group type>",
                            "assignees": [ { "user": "<user>", "is_selected": true } ] } } ] }
  ```

  The tool description says to copy `steps` from the `approval_execution` section of document details and
  set `is_selected: true` for the desired approver.
- `Waiting for Approval` and `Approved` are **system-set** statuses — `documents_status_change` cannot set
  them. Only `Completed`, `Paid`, `Expired`, `Declined` can be set manually.

---

## Workflow

### Step 1: Create the document

Find and inspect the template as normal — `templates_list` (remember `q` is fuzzy, so confirm the match),
then `templates_details_get` for `roles[]` and `tokens[]`. Create with `documents_create`, using the exact
role names, and `delivery_methods: {email: true, sms: false}`.

Poll `documents_status_get` until `Draft`.

### Step 2: Read the approval chain

`documents_details_get` and look at `approval_execution`.

**If it is `null`, there is no approval workflow on this document.** Say so plainly and ask whether to send
it directly. Do not pretend to route something that has no chain — and do not fabricate a `selected_approvers`
payload, which would either error or be ignored.

If it is populated, extract the steps in order. For each step, list the group and the assignees available.

### Step 3: Choose approvers

Present the chain to the user before sending — step by step, with the candidates for each:

> This document has 2 approval steps. Step 1: Finance — Anna or Piotr. Step 2: Legal — Katarzyna. Who should
> approve each?

Only fill `is_selected: true` for people the user actually named. Picking a default approver silently is not
acceptable: an approval chain exists precisely so a named human signs off, and choosing on their behalf
defeats the control.

If a step has exactly one candidate, you may select it, but say that you did.

### Step 4: Send through the chain

`documents_send` with `selected_approvers` built from the steps you read, plus `subject` and `message`.

- `409 The document isn't ready for a status transition yet` — retry once. Known race even after `Draft`.
- `400 Not all signature, initials fields were assigned` — a signing role has no recipient; fix with
  `documents_update` before retrying.

After sending, poll `documents_status_get`. Expect `Waiting for Approval` rather than `Sent` while the chain
runs. Report the status you actually observed rather than assuming.

### Step 5: Report

State the document, the chain as configured, who was selected for each step, and the current status. Make
clear the document has **not** reached the counterparty yet if it is waiting on approval — that distinction
is the whole point of this skill.

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

### The document went straight to `Sent`

Either no chain applied, or `selected_approvers` was omitted or rejected. Check `approval_execution` again
and report what actually happened rather than what was intended.

### `documents_status_change` will not set `Approved`

Correct — `Sent`, `Viewed`, `Approved` are system-set. Only `Completed`, `Paid`, `Expired`, `Declined` can be
set manually.

### I do not know which approver to pick

Ask. Do not choose. If the chain offers several people, selecting one on the user's behalf silently
undermines the approval.

### Everything in this file disagrees with what I observe

Likely, on first real use — this skill was written against schemas rather than a live workflow. Record what
actually happened and correct it here.
