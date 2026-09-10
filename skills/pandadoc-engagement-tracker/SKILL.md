---
name: pandadoc-engagement-tracker
category: sales
roles: [sales, cs, owner]
complexity: intermediate
prerequisites: [PandaDoc]
description: Track per-recipient signing progress across documents that are out — who has signed, who has not, in what order, and which documents have stalled. Use when someone asks who is holding up a deal or what the state of play is across sent documents.
tags: [pandadoc, engagement, tracking, e-signature, sales]
version: "0.1.0"
---

# PandaDoc Deal-Room Engagement Tracker

Who has signed, who has not, and what has gone quiet — across everything currently out.

**Read the limitation below before using this.** In its current form this skill reports *signing* progress
only. It cannot tell you who opened a document.

---

## Prerequisites

The PandaDoc MCP Server must be connected. Required tools: `documents_list`, `documents_details_get`.
Optional and currently unavailable: `documents_audit_trail_get`. If the required tools are missing, say so
and point at <https://mcp.pandadoc.com>.

---

## Known limitation — no view events

The intended version of this skill reports opens as well as signatures. That needs
`documents_audit_trail_get`, which currently returns:

```txt
403  "Access to this resource was forbidden in PandaDoc."   code: forbidden
```

on a real completed document, with a connection that reads every other document tool. It is unresolved
whether that is a plan entitlement, an OAuth scope or a workspace permission. Tracked against PD-111238.

So: **attempt the audit trail once, and degrade cleanly when it fails.** Report signing progress from
`documents_details_get`, and state explicitly that open and view events are unavailable on this account.
Never present "has not signed" as "has not opened" — they are different facts and the second one is a
stronger signal a salesperson will act on.

If the call ever starts succeeding, add the events to the timeline and drop the caveat.

---

## Workflow

### Step 1: Collect the documents that are out

`documents_list` with `status: "Sent"`, then again with `status: "Viewed"`. One call per status — the
parameter takes a single string. Use `count: 100`.

Include `Waiting for Approval` and `External Review` only if the user asks about internal hold-ups too, and
say which statuses you covered.

If the user named one document or one counterparty, narrow to that instead of sweeping.

### Step 2: Read per-recipient progress

`documents_details_get` per document. From `recipients[]` take, for each person:

- `first_name`, `last_name`, `email`
- `recipient_type` — **`signer` or `CC`.** A CC recipient is not expected to sign and always has
  `signature_date: null`. Reporting a CC as "not signed" is noise; exclude them from the outstanding list
  and mention them separately if at all.
- `has_completed` — whether that person is done
- `signature_date` — when they signed, `null` until they do
- `signing_order` — if set, signatures are sequential, so a later signer is not late, they are simply not up
  yet. Say that rather than flagging them.

Also check `fields[]`: a `signature` field with `is_filled: false` confirms an outstanding signature.

### Step 3: Try the audit trail, once per document

Call `documents_audit_trail_get`. If it returns 403, stop trying for the rest of the run — it is an account
level gate, not per document. Record once that view events are unavailable.

If it succeeds, merge its events into the per-document timeline in chronological order and note the
timezone you are reporting in.

### Step 4: Work out what has stalled

Age each document from `date_sent` in `documents_details_get` — you already have the detail call. Do not use
`date_created`; a document that sat in draft would look stale when it is not.

Flag as stalled when:

- it has been out **more than 7 days** with no signature at all, or
- **some** signers have completed and others have not for more than 7 days — a partially signed document is
  a stronger stall signal than an untouched one, because momentum existed and stopped

With `signing_order` set, only flag the person whose turn it actually is.

### Step 5: Report

Per document: name, status, age since sent, and a line per signer — signed with a date, or outstanding.
Group or sort so stalls are at the top.

Then state plainly:

- which statuses you covered
- that age is measured from send
- **that open and view events are unavailable on this account**, if the audit trail returned 403

---

## Usage examples

```txt
@pandadoc-engagement-tracker — who's holding up the Acme deal?
```

```txt
@pandadoc-engagement-tracker — anything gone quiet in the last couple of weeks?
```

---

## Troubleshooting

### `403 forbidden` on the audit trail

Expected on this account. Degrade to signing progress and say view events are unavailable. Do not retry per
document — the gate is account level.

### Someone shows as not signed but says they signed

Check `signing_order`. With sequential signing, a later signer cannot act until earlier ones finish. Also
check `recipient_type` — a CC recipient has no signature to give.

### Everyone shows as outstanding on a completed document

Confirm you read `recipients[]` from `documents_details_get` and not the recipient list echoed by
`documents_send`, which carries no `has_completed`.

### A document was force-completed and shows no signatures

`documents_status_change` to `Completed` sets `date_completed` but leaves every `signature_date` as `null`
and `is_filled: false`. Nobody signed it. Report it as manually completed rather than signed.
