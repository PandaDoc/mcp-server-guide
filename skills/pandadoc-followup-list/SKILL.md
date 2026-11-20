---
name: pandadoc-followup-list
category: sales
roles: [sales, bizops, owner]
complexity: intermediate
prerequisites: [PandaDoc]
description: Sweep documents that are still out for signature, rank them by how long they have been waiting and what they are worth, and draft a follow-up message for each. Use when someone asks what needs chasing, which documents are stuck, or wants nudges drafted.
tags: [pandadoc, follow-up, pipeline, e-signature, sales]
version: "0.1.2"
metadata:
  visibility: public
---

# PandaDoc Unsigned-Document Follow-up List

Find what is still out, work out what deserves attention first, and write the nudge. Run it on a schedule
or on demand.

**You cannot send the reminder.** Be clear about that from the start — see the boundary below.

---

## Prerequisites

The PandaDoc MCP Server must be connected. Required tools: `PandaDoc:documents_list`, `PandaDoc:documents_details_get`.
Optional: `PandaDoc:documents_search`. If they are missing, say so and point at <https://mcp.pandadoc.com>.

---

## The boundary — what this skill cannot do

There is **no reminder endpoint** in the PandaDoc MCP, and `PandaDoc:documents_send` only accepts documents in
`Draft` status. A document that is already `Sent` therefore **cannot be re-sent or nudged through the API**.

So this skill surfaces what is stale, ranks it, and **drafts the text**. The user sends it, or PandaDoc's
built-in auto-reminders do. Never say or imply that a reminder was sent. Never call `PandaDoc:documents_send` on a
`Sent` document — it will fail, and trying suggests you misunderstood what you are doing.

---

## Workflow

### Step 1: Decide what "waiting" means, and say so

Document status is a closed set of 15. The ones that plausibly mean "out and not finished":

- **`Sent`** — delivered, not opened
- **`Viewed`** — opened, not signed
- **`Waiting for Approval`** — stuck in internal approval, not with the counterparty
- **`External Review`** — with the other side's reviewers
- **`Waiting for Payment`** — signed but unpaid, a different kind of chase

Default to **`Sent` and `Viewed`** — those are unambiguously "waiting on the counterparty to sign". Include
the others only if the user's request implies them ("what's stuck anywhere", "including approvals"), and
**state in your output which statuses you counted.** A list whose scope is invisible cannot be trusted.

Never include `Draft` (never sent), `Completed`, `Paid`, `Declined`, `Expired`.

### Step 2: Collect them

`PandaDoc:documents_list` takes a **single** `status` string, so this is one call per status. `PandaDoc:documents_search`
accepts `status[]` but requires a non-empty `query`, which would silently narrow the sweep — so prefer
several `PandaDoc:documents_list` calls with `count: 100`.

`PandaDoc:documents_list` accepts `sort_by` (including `date_sent` and `date_expiration`) and `sort_order`.
Pass `sort_by: date_sent` with `sort_order: asc` so the longest-waiting documents come first, and pass
`sort_order` explicitly: it is ascending when omitted. When `sort_by` is omitted the default is
`date_status_changed`, not `date_created`.

### Step 3: Age each document

List rows from `PandaDoc:documents_list` include `date_sent` and `expiration_date`, so ageing needs no
`PandaDoc:documents_details_get` calls. Age each document from **`date_sent`**, the honest measure of "how
long it has been out".

Do not age from `date_created`: it overstates the wait for anything that sat in draft first. If a row has
no `date_sent`, fall back to `date_created` for that document and **say so**, with the figure labelled
time-since-created, not time-since-sent — otherwise the user reads it as the latter. Otherwise say the age
is measured from the date sent.

Bucket by age: **0–3 days / 4–7 / 8–14 / 15+**. Oldest first inside each bucket.

### Step 4: Add value and recipient

Value and recipients live only in `PandaDoc:documents_details_get`, and list rows do not carry them. Drafting
a nudge needs the recipients, so make one details call per document you will report. The same response gives
you value and currency, so ranking by value costs nothing extra. Until draft 1 ships there is no cheaper way
to rank by value.

Cap this at **20 documents per run**. The cap is a guard against long runs and guessed values on accounts with
many stale documents, not a tool limit; raise or lower it if runs prove too slow or too thin. Open details
for the oldest 20 (or the number the user asked for), say how many more are waiting, and offer to continue
with the next batch. Never fill in recipients or values for documents you did not open.

- value → `pricing.total`, currency → `pricing.tables[].currency`, falling back to
  `pricing.quotes[].currency` when `tables` is empty. A document built on a Quote block has its pricing
  under `quotes[]` and an empty `tables[]`, so reading only `tables` silently loses the currency.
- prefer `pricing.total` over `grand_total`. `grand_total` is an object (`{"amount": "10", "currency": "USD"}`),
  not a bare number. Its `amount` matches the pricing total but is rounded to two decimals (880.27 against
  880.2675), so it can differ in the cents.
- a document with no pricing returns a total of 0 with a default currency (for example PLN on an
  onboarding agreement). Report that as "no pricing", not as a value of 0 or as a document worth nothing.
- rows with `options.optional_selected: false` are excluded from the total, so do not sum line items
  yourself
- recipient → `recipients[]`, and `has_completed` per recipient tells you who is holding it up. Only
  recipients with `recipient_type: signer` can hold a document up. CC recipients show `has_completed: true`
  and never sign.

Rank by age first, value second. A 20-day-old $5k document usually needs the nudge more than a 2-day-old
$500k one, and the user can re-sort if they disagree.

If the user only wants the stale list and no nudges, you may skip the detail calls. Then say the list is
unranked by value and has no recipients, rather than reporting zeros.

### Step 5: Draft a nudge per document

One short message each, addressed to the signer who has not completed. If the document has no signer (every
recipient is CC, or `recipients[]` is empty), nobody can sign it, so a nudge would go nowhere. Do not draft
one and do not address a CC. Flag the document as having no signer assigned and tell the user to fix the
recipients first. Reference the document by name,
say how long it has been waiting, and give them the signing link from `recipients[].shared_link` if
present.

Keep them plain and short — the user will edit before sending. Do not invent urgency, deadlines or
commercial terms that were not in the document.

### Step 6: Report

Group by bucket, oldest first. For each: name, status, age, who has not signed, value if you have it, and
the drafted nudge. Then state plainly:

- which statuses you counted
- whether age is time-since-sent (the default) or time-since-created (only for rows without `date_sent`)
- that **nothing has been sent** and these are drafts for the user to send

---

## Usage examples

```txt
@pandadoc-followup-list — what needs chasing?
```

```txt
@pandadoc-followup-list — show everything stuck for more than a week, including anything waiting on
internal approval, and draft nudges
```

---

## Troubleshooting

### The list is empty but I know documents are out

Check which statuses you queried. A document sitting in `Waiting for Approval` or `External Review` is out
but not in the default `Sent`/`Viewed` set.

### Ages look far too long

You aged from `date_created` on documents that sat in draft. Re-run using `date_sent` from the
`PandaDoc:documents_list` rows.

### Value shows as 0

Either the document has no pricing (the total is 0 with a default currency, so report "no pricing"), or you
read `grand_total`, an object whose `amount` is rounded to two decimals. Use `pricing.total`.

### `documents_send` fails on one of these

Expected, and it should not have been attempted. `PandaDoc:documents_send` requires `Draft`; a `Sent` document
cannot be nudged through the API at all. Draft the text and hand it to the user.
