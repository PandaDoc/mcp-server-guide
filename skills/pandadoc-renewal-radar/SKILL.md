---
name: pandadoc-renewal-radar
category: legal
roles: [sales, legal, finance, owner]
complexity: advanced
prerequisites: [PandaDoc]
description: Digest of signed contracts approaching renewal or expiry, with counterparty, value and days remaining. Distinguishes a contract's own end date from the signing-link expiry, which are not the same thing. Use when someone asks what is coming up for renewal.
tags: [pandadoc, renewals, contracts, legal, reporting]
version: "0.1.0"
---

# PandaDoc Contract Renewal Radar

Which signed contracts are coming up for renewal, what they are worth, and how long is left.

**The trap in this skill is which date you use.** PandaDoc has three date concepts that look
interchangeable and are not. Getting it wrong produces a list that is confidently about the wrong thing.

---

## Prerequisites

The PandaDoc MCP Server must be connected. Required tools: `documents_list`, `documents_search`,
`documents_details_get`, `documents_metadata_batch_get` — it reads one document or many, so pass a
one-element `document_ids` for a single one. Also useful: `documents_content_get` or
`documents_summary_get` for reading a term out of the text. If they are missing, say so and point at
<https://mcp.pandadoc.com>.

---

## Three dates, only one of which is a renewal date

| Concept | Where | What it actually is |
| --- | --- | --- |
| `expiration_date` / `date_expiration` / `date_expired` | `documents_list`, `documents_details_get`, `documents_search` | **The signing link's expiry.** Set at send time — observed as `date_sent` + ~60 days. Meaningless once signed. |
| `effective_date` | `documents_search` filter column only | When the agreement takes effect. Closer to what you want, but it is a start date, not an end date. |
| `Agreement date` | `documents_metadata_batch_get`, AI-extracted | The date on the face of the contract. Also a start, not an end. |

**None of them is a renewal date.** PandaDoc does not store a contract end date as a field — the term
("two years from the effective date", "renews annually unless cancelled") lives in the contract text.

So a renewal radar has to derive it. Be explicit with the user about how you did, because a derived date
presented as a stored one is misleading.

**Never build this list from `expiration_date`.** That is the signing link, and on a signed contract it
tells you nothing. A list of "contracts expiring soon" built from it is simply wrong — and it will look
plausible, which is the problem.

---

## Workflow

### Step 1: Get the signed contracts

Only `Completed` and `Paid` documents can be up for renewal. A `Draft` or `Sent` document is not a contract
yet.

`documents_list` with `status: "Completed"`, then `status: "Paid"`, `count: 100`.

Do **not** use `documents_search` with a `signature_date` window to establish "signed": that filter returns
documents nobody signed. It matches force-completed documents whose `recipients[].signature_date` is `null`.
If you need to confirm a document was genuinely signed, check `signature_date` per recipient in
`documents_details_get`.

### Step 2: Establish a start date per contract

In order of preference:

1. `documents_metadata_batch_get` → **`Agreement date`**. Only present on completed documents and extracted
   asynchronously. Handle `{code: "extraction_pending", retry_after: N}` by retrying once, and
   `{code: "not_started"}` or `{code: "failed"}` by falling back.
2. `documents_search` with `date_filter_column: "effective_date"` if you are narrowing rather than reading
   per document.
3. `date_completed` as a last resort — the day it was signed. Say you used it.

Every extracted value carries `acceptance_status`, which was `pending` on every sample — AI-extracted, not
human-confirmed. **Say so when you report a date that came from metadata.**

### Step 3: Establish a term, and be honest about it

The term is in the text. Read it with `documents_summary_get` (`summary_type: "detailed"`) or
`documents_content_get` and look for the duration and any auto-renewal language.

Two warnings:

- `documents_summary_get` returns a **markdown re-rendering of the document**, not a structured summary, and
  on a document with empty fields it renders **placeholders as if they were terms** — `Effective Date: May
  12`, `Governing Law … State of (State)`. Do not read a term off a placeholder. If the value looks like a
  template default, treat the term as unknown.
- If you cannot find a term, say the renewal date is unknown for that contract rather than assuming twelve
  months. An invented renewal date is worse than a gap, because nobody will check it.

Renewal date = start date + term. State the arithmetic you used per contract.

### Step 4: Add counterparty and value

- counterparty → `documents_metadata_batch_get` → `Counterparty name`, with the same `acceptance_status` caveat
- value → `documents_details_get` → **`pricing.total`**, currency from `pricing.tables[].currency`, or
  `pricing.quotes[].currency` when `tables` is empty — a Quote-block document keeps its pricing there
- **never `grand_total`** — observed as `0 PLN` on a document worth 200,000 USD

`documents_metadata_batch_get` covers 1–40 documents per request and is worth using instead of a call each.

### Step 5: Report

Sort by days remaining, soonest first. Per contract: counterparty, name, start date and where it came from,
term and where it came from, computed renewal date, days left, value with currency.

Then state:

- that renewal dates are **derived**, not stored, and how
- which came from AI-extracted metadata with `acceptance_status: pending`
- how many contracts you could not date at all, so a short list is not read as a quiet pipeline

---

## Usage examples

```txt
@pandadoc-renewal-radar — what's up for renewal in the next 90 days?
```

```txt
@pandadoc-renewal-radar — weekly renewal digest with values
```

---

## Troubleshooting

### The list is full of recently sent documents

You used `expiration_date`. That is the signing link expiry, set at send time to roughly 60 days out, and it
has nothing to do with renewals. Rebuild from `Completed`/`Paid` and a derived contract end date.

### A contract shows a term that matches the template default

You read a placeholder rather than a filled value. `documents_summary_get` renders unfilled template fields
as though they were content. Treat the term as unknown.

### Metadata returns `not_started`

Extraction only runs on completed documents and is asynchronous. If the document is completed, retry after
the `retry_after` interval; otherwise fall back to `date_completed` and say so.

### Value shows 0

You read `grand_total`. Use `pricing.total`.

### A "signed" contract turns out to be unsigned

It was flipped with `documents_status_change`, which sets `date_completed` but leaves every
`recipients[].signature_date` as `null`. Check per-recipient signature dates before treating a document as a
contract.
