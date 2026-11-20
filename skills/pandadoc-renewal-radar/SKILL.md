---
name: pandadoc-renewal-radar
category: legal
roles: [sales, legal, finance, owner]
complexity: advanced
prerequisites: [PandaDoc]
description: Digest of signed contracts approaching renewal or expiry, with counterparty, value and days remaining. Reads the extracted renewal fields (renewal action deadline, term lengths, renewal type, opt-out period) rather than guessing a term from the document body, and distinguishes a contract's own end date from the signing-link expiry, which are not the same thing. Use when someone asks what is coming up for renewal.
tags: [pandadoc, renewals, contracts, legal, reporting]
version: "0.1.2"
metadata:
  visibility: public
---

# PandaDoc Contract Renewal Radar

Which signed contracts are coming up for renewal, what they are worth, and how long is left.

**The trap in this skill is which date you use.** PandaDoc has three date concepts that look
interchangeable and are not. Getting it wrong produces a list that is confidently about the wrong thing.

---

## Prerequisites

The PandaDoc MCP Server must be connected. Required tools: `PandaDoc:documents_list`,
`PandaDoc:documents_details_get`, `PandaDoc:documents_metadata_batch_get`. Useful: `PandaDoc:documents_search` to narrow by a
date column, and `PandaDoc:documents_content_get` or `PandaDoc:documents_summary_get` as a last resort when a contract
has no extracted term fields. If they are missing, say so and point at <https://mcp.pandadoc.com>.

There is no `documents_metadata_get`. Every metadata read goes through `PandaDoc:documents_metadata_batch_get`,
which takes 1-40 IDs, so one document is a one-element `document_ids`.

---

## Three dates, only one of which is a renewal date

| Concept | Where | What it actually is |
| --- | --- | --- |
| `expiration_date` / `date_expiration` / `date_expired` | `PandaDoc:documents_list`, `PandaDoc:documents_details_get`, `PandaDoc:documents_search` | **The signing link's expiry.** Set at send time — observed as `date_sent` + ~60 days. Meaningless once signed. |
| `effective_date` | `PandaDoc:documents_search` filter column only | When the agreement takes effect. Closer to what you want, but it is a start date, not an end date. |
| `Agreement date` | `PandaDoc:documents_metadata_batch_get`, AI-extracted | The date on the face of the contract. Also a start, not an end. |

**None of them is a renewal date.** No document field holds a contract end date.

That does not mean you have to read the contract body. The term and the renewal behaviour are extracted
into separate **metadata fields** — including one that is already a date — and the next section lists
them. Read those first; the body is the last resort, not the first move.

Whichever you use, be explicit with the user, because a derived date presented as a stored one is
misleading.

**Never build this list from `expiration_date`.** That is the signing link, and on a signed contract it
tells you nothing. A list of "contracts expiring soon" built from it is simply wrong — and it will look
plausible, which is the problem.

---

## The renewal terms are extracted fields. Ask for them by key

The term is extracted into named metadata fields on a completed contract. **Read those fields before
you read any document text.** Reading the term out of the body when a field already holds it is how
this skill produces "I cannot derive a renewal date" on a contract that states one.

`PandaDoc:documents_metadata_batch_get` with `field_keys` (case-sensitive, unknown keys ignored):

| Key | `field_type` | Shape of the value | What it gives you |
| --- | --- | --- | --- |
| `Next renewal action deadline` | `date` | ISO 8601 | The date to act by. Use it directly when present. |
| `Agreement date` | `date` | ISO 8601 | Start of the initial term. |
| `Initial term length` | `duration` | `value` plus a separate `period` (`months`, `years`, `days`) | Length of the initial term. |
| `Renewal term length` | `duration` | same | Length of each renewal cycle after the first. |
| `Renewal type` | `dropdown` | JSON array **as a string**, e.g. `"[\"Auto-Renew\"]"` | Whether it renews by itself or needs a signature. |
| `Renewal opt out period` | `duration` | same as above | Notice window before term end. |
| `Counterparty name` | `multi_line` | text | Who the contract is with. |
| `Contract value`, `Contract currency` | `currency`, `dropdown` | `value` plus `currency_code` | Value without a second call. |

Two shape traps: a `duration` carries its unit in a sibling `period`, so `"12.0"` is twelve *months*
only if `period` says so; and a `dropdown` value is a JSON array serialised into a string, so
`Renewal type` reads `"[\"Auto-Renew\"]"`, not `Auto-Renew`.

`Next renewal action deadline` was observed as term end minus the opt-out period: an Order Form with
`Agreement date` 2026-09-08, `Initial term length` 12 months and `Renewal opt out period` 30 days
carried `2027-08-09`. Use that as a cross-check when the field is present, and as the arithmetic to
run when it is not.

Not every contract has these fields. A quote or proposal with no term states none, and its metadata
comes back with no renewal keys at all — that is a real unknown, not a failed lookup. Say which it is.

---

## Workflow

### Step 1: Get the signed contracts

Only `Completed` and `Paid` documents can be up for renewal. A `Draft` or `Sent` document is not a contract
yet.

`PandaDoc:documents_list` with `status: "Completed"`, then `status: "Paid"`, `count: 100`.

Do **not** use `PandaDoc:documents_search` with a `signature_date` window to establish "signed": that filter returns
documents nobody signed. It matches force-completed documents whose `recipients[].signature_date` is `null`.
If you need to confirm a document was genuinely signed, check `signature_date` per recipient in
`PandaDoc:documents_details_get`.

### Step 2: Establish a start date per contract

In order of preference:

1. `PandaDoc:documents_metadata_batch_get` → **`Agreement date`**. Only present on completed documents and
   extracted asynchronously. Each document reports its own `status`: retry `extraction_pending` once
   after `retry_after` seconds, and fall back on `extraction_not_started` (the document is not
   completed) or `extraction_failed` (terminal).
2. `PandaDoc:documents_search` with `date_filter_column: "effective_date"` if you are narrowing rather than reading
   per document.
3. `date_completed` as a last resort — the day it was signed. Say you used it.

Every extracted value carries `acceptance_status`, which was `pending` on every sample — AI-extracted, not
human-confirmed. **Say so when you report a date that came from metadata.**

### Step 3: Establish a term, and be honest about it

Work down this ladder and stop at the first rung that answers. State which rung you used.

1. **`Next renewal action deadline`** — a date field. When present, that is the answer; no arithmetic.
2. **`Agreement date` + `Initial term length`** → end of the initial term. Two things to do with it:
   - **If that end is already in the past**, the contract is in a renewal cycle: roll forward from it in
     `Renewal term length` steps until a cycle end lands in the future, and report that one. Reporting
     the initial-term end on a contract that renewed two years ago puts a historical date at the top of
     a list sorted by days remaining. If `Renewal term length` is absent, say the current cycle end is
     unknown rather than reporting the past one as upcoming.
   - **Subtract `Renewal opt out period`** from the cycle end for the date the customer actually has to
     act by — the one a radar exists to surface. Count back in **calendar days**, not to a month
     boundary: a cycle ending 2027-09-08 with a 30-day opt-out has to be acted on by **2027-08-09**,
     which is the value the extracted deadline field itself carried on that contract. Report
     `Renewal type` alongside it: an
     `Auto-Renew` contract nobody cancels is a renewal, one that needs a new signature is a deal.
3. **The document text** — only when the fields above are absent. `PandaDoc:documents_summary_get`
   (`summary_type: "detailed"`) or `PandaDoc:documents_content_get`, looking for the duration and any
   auto-renewal language.
4. **Unknown** — no field, no clause. Say so per contract and say why.

Two warnings about rung 3:

- `PandaDoc:documents_summary_get` returns a **markdown re-rendering of the document**, not a structured summary, and
  on a document with empty fields it renders **placeholders as if they were terms** — `Effective Date: May
  12`, `Governing Law … State of (State)`. Do not read a term off a placeholder. If the value looks like a
  template default, treat the term as unknown.
- If you cannot find a term, say the renewal date is unknown for that contract rather than assuming twelve
  months. An invented renewal date is worse than a gap, because nobody will check it.

State the arithmetic per contract, including which cycle the date belongs to when you rolled one forward.
If you are not confident in the calendar subtraction, give the window instead — "30 days before
2026-10-31" — rather than publishing a date you guessed at. A wrong deadline is the one failure this
skill exists to prevent.

### Step 4: Add counterparty and value

- counterparty → `PandaDoc:documents_metadata_batch_get` → `Counterparty name`, with the same `acceptance_status` caveat
- value → `PandaDoc:documents_details_get` → **`pricing.total`**, currency from `pricing.tables[].currency`, or
  `pricing.quotes[].currency` when `tables` is empty — a Quote-block document keeps its pricing there
- **never `grand_total`** — observed as `0 PLN` on a document worth 200,000 USD

`PandaDoc:documents_metadata_batch_get` covers 1–40 documents per request and is worth using instead of a call each.

### Step 5: Report

Sort by days remaining, soonest first. Per contract: counterparty, name, start date and where it came from,
term and where it came from, renewal date, the opt-out deadline when there is one, `Renewal type`,
days left, value with currency.

Then state:

- which rung of Step 3 each date came from — a read `Next renewal action deadline` is a different claim
  from `Agreement date` plus a term, and both are different from a term read out of the body
- that a derived renewal date is **derived**, not stored, and the arithmetic used
- that every extracted value carries `acceptance_status: pending`
- how many contracts have no renewal fields and no clause, so a short list is not read as a quiet pipeline

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

You read a placeholder rather than a filled value. `PandaDoc:documents_summary_get` renders unfilled template fields
as though they were content. Treat the term as unknown.

### The skill says it cannot find a renewal date and starts reading the contract body

It skipped Step 3 rung 1. `Next renewal action deadline`, `Initial term length`, `Renewal term length`,
`Renewal type` and `Renewal opt out period` are extracted fields — ask `PandaDoc:documents_metadata_batch_get`
for them by key. Only a contract that genuinely has none of them (a quote, a proposal, an NDA with no
term) falls through to the text.

### `documents_metadata_get` is not a tool

It does not exist on the MCP server. Use `PandaDoc:documents_metadata_batch_get` with a one-element
`document_ids`.

### `Renewal type` reads `["Auto-Renew"]` and a term length reads `12.0`

Both are raw shapes, not errors. A `dropdown` value is a JSON array serialised as a string; a
`duration` value carries its unit in the sibling `period` field. Render them as "Auto-renew" and
"12 months" — and never guess the unit when `period` is missing.

### Metadata returns `extraction_not_started`

Extraction only runs on completed documents and is asynchronous. If the document is completed, retry after
the `retry_after` interval; otherwise fall back to `date_completed` and say so.

### Value shows 0

You read `grand_total`. Use `pricing.total`.

### A "signed" contract turns out to be unsigned

It was flipped with `PandaDoc:documents_status_change`, which sets `date_completed` but leaves every
`recipients[].signature_date` as `null`. Check per-recipient signature dates before treating a document as a
contract.
