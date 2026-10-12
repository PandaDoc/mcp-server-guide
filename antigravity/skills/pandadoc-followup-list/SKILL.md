---
name: pandadoc-followup-list
category: sales
roles: [sales, bizops, owner]
complexity: intermediate
prerequisites: [PandaDoc]
description: Sweep documents that are still out for signature, rank them by how long they have been waiting and what they are worth, and draft a follow-up message for each. Use when someone asks what needs chasing, which documents are stuck, or wants nudges drafted.
tags: [pandadoc, follow-up, pipeline, e-signature, sales]
version: "0.1.0"
---

# PandaDoc Unsigned-Document Follow-up List

Find what is still out, work out what deserves attention first, and write the nudge. Run it on a schedule
or on demand.

**You cannot send the reminder.** Be clear about that from the start — see the boundary below.

---

## Prerequisites

The PandaDoc MCP Server must be connected. Required tools: `documents_list`, `documents_details_get`.
Optional: `documents_search`. If they are missing, say so and point at <https://mcp.pandadoc.com>.

---

## The boundary — what this skill cannot do

There is **no reminder endpoint** in the PandaDoc MCP, and `documents_send` only accepts documents in
`Draft` status. A document that is already `Sent` therefore **cannot be re-sent or nudged through the API**.

So this skill surfaces what is stale, ranks it, and **drafts the text**. The user sends it, or PandaDoc's
built-in auto-reminders do. Never say or imply that a reminder was sent. Never call `documents_send` on a
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

`documents_list` takes a **single** `status` string, so this is one call per status. `documents_search`
accepts `status[]` but requires a non-empty `query`, which would silently narrow the sweep — so prefer
several `documents_list` calls with `count: 100`.

Note there is no sort parameter; default order is `date_created` descending.

### Step 3: Age each document

`documents_list` gives you `date_created` and `date_modified` for free. It does **not** give you
`date_sent` — that exists only in `documents_details_get`, one call per document.

Choose deliberately:

- **`date_sent`** is the honest measure of "how long it has been out", but costs one call per document.
- **`date_created`** is free but overstates the wait for anything that sat in draft first.

Default to `date_sent` when the set is small (say under 30 documents) and to `date_created` above that,
and **say which you used.** If you used `date_created`, say the figure is time-since-created, not
time-since-sent — otherwise the user reads it as the latter.

Bucket by age: **0–3 days / 4–7 / 8–14 / 15+**. Oldest first inside each bucket.

### Step 4: Add value and recipient, if the user wants ranking

Value and recipients live only in `documents_details_get`. If you are already calling it for `date_sent`,
take them in the same pass.

- value → `pricing.total`, currency → `pricing.tables[].currency`, falling back to
  `pricing.quotes[].currency` when `tables` is empty. A document built on a Quote block has its pricing
  under `quotes[]` and an empty `tables[]`, so reading only `tables` silently loses the currency.
- **never `grand_total`** — it has been observed reading `0 PLN` on a document worth 200,000 USD
- rows with `options.optional_selected: false` are excluded from the total, so do not sum line items
  yourself
- recipient → `recipients[]`, and `has_completed` per recipient tells you who is holding it up

Rank by age first, value second. A 20-day-old $5k document usually needs the nudge more than a 2-day-old
$500k one, and the user can re-sort if they disagree.

If you skipped the detail calls, say the list is unranked by value rather than reporting zeros.

### Step 5: Draft a nudge per document

One short message each, addressed to the recipient who has not completed. Reference the document by name,
say how long it has been waiting, and give them the signing link from `recipients[].shared_link` if
present.

Keep them plain and short — the user will edit before sending. Do not invent urgency, deadlines or
commercial terms that were not in the document.

### Step 6: Report

Group by bucket, oldest first. For each: name, status, age, who has not signed, value if you have it, and
the drafted nudge. Then state plainly:

- which statuses you counted
- whether age is time-since-sent or time-since-created
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

You aged from `date_created` on documents that sat in draft. Re-run with `date_sent` from
`documents_details_get` for the affected ones.

### Value shows as 0

You read `grand_total`. Use `pricing.total`.

### `documents_send` fails on one of these

Expected, and it should not have been attempted. `documents_send` requires `Draft`; a `Sent` document
cannot be nudged through the API at all. Draft the text and hand it to the user.
