---
name: pandadoc-contract-register
category: legal
roles: [legal, finance, bizops]
complexity: advanced
prerequisites: [PandaDoc]
description: Build a register of signed contracts with their key terms — counterparty, dates, value and negotiated provisions — from PandaDoc's extracted metadata, labelled with how confident each value is. Use when someone wants a contract register, key terms pulled out, or all agreements for a customer.
tags: [pandadoc, contracts, metadata, legal, register]
version: "0.1.0"
---

# PandaDoc Signed-Contract Register & Key-Terms Extractor

A table of what has been signed, with whom, when, for how much, and on what terms — assembled from
PandaDoc's own AI extraction.

Two things shape everything below: **the extracted values are unconfirmed**, and **you cannot search by
them**.

---

## Prerequisites

The PandaDoc MCP Server must be connected. Required tools: `documents_list`, `documents_search`,
`documents_details_get`, `documents_metadata_batch_get` — it reads one document or many, so pass a
one-element `document_ids` for a single one. If they are missing, say so and point at <https://mcp.pandadoc.com>.

---

## What extraction gives you, and what it costs

`documents_metadata_batch_get` returns AI-extracted fields. Observed on a completed contract:

`Counterparty name`, `Counterparty address`, `Counterparty signer name`, `Internal party legal name`,
`Internal signer name`, `Agreement date`, plus term checkboxes — `Audit rights`, `Exclusivity`,
`HIPAA / BAA`, `Include SLA`, `Most favored customer`, `Data processing addendum incorporated`,
`Includes logo rights`, `Include special terms`, `Has referenced documents`.

Three constraints that must reach the user:

1. **Every value carries `acceptance_status`, and it was `pending` on every field of every sample.** That
   means AI-extracted and not human-confirmed. A register presented as fact when nothing in it has been
   reviewed is a liability in a legal context. Label it.
2. **Extraction runs only on completed documents, asynchronously.** A draft returns
   `{code: "not_started", description: "Likely, your document is not yet completed."}`. In-progress
   extraction returns `{code: "extraction_pending", retry_after: N}`. Failure returns `{code: "failed"}`.
3. **There is no monetary field.** Contract value is not in metadata — it comes from
   `documents_details_get` → `pricing.total`.

---

## The search limitation — say it out loud

**Metadata is not queryable.** `documents_metadata_batch_get` accepts no filter; it reads by document. There is no way to ask "which contracts have `Counterparty name = Acme`".

So building a register for one customer means:

1. narrow with `documents_search`, which is **full text and requires a non-empty `query`**
2. read metadata for each hit
3. keep the ones whose `Counterparty name` actually matches

Step 1 is where the answer goes wrong. A search term that does not literally appear in a document will miss
it: `query: "contract"` returned **zero** hits in a workspace where the same documents matched
`query: "Agreement"` with four. And a customer whose name never appears in a document title or body will not
be found at all.

**Therefore: always state what you searched on, and never claim the register is complete.** "Every contract
for Acme" is a promise you cannot keep. "Every contract matching a search for *Acme Corp*, checked against
the extracted counterparty" is one you can.

---

## Workflow

### Step 1: Establish the candidate set

- **Whole register:** `documents_list` with `status: "Completed"`, then `status: "Paid"`, `count: 100`. No
  search term needed, so no false negatives.
- **One customer:** `documents_search` with the customer name as `query`, `status: ["Completed", "Paid"]`.
  Try the obvious variants — full legal name, short name, domain — and say which ones you tried.

Do **not** use a `signature_date` window to establish "signed": that filter returns documents nobody signed.
Confirm signature per recipient instead (below).

### Step 2: Confirm each one is genuinely signed

For each candidate, `documents_details_get` and check `recipients[]`: at least one entry with
`recipient_type: "signer"` and a non-null `signature_date`.

A document flipped with `documents_status_change` reads `Completed` with `date_completed` set, but every
`signature_date` is `null` and signature fields are `is_filled: false`. It is not a signed contract. Either
exclude it or list it separately as manually completed.

### Step 3: Pull metadata

Use `documents_metadata_batch_get` for 1–40 documents at a time rather than a call each.

Handle the envelopes: retry once on `extraction_pending` after `retry_after`; on `not_started` or `failed`,
record the contract with its terms marked unavailable rather than dropping it silently.

### Step 4: Add value

`documents_details_get` → `pricing.total`, currency from `pricing.tables[].currency` — or from
`pricing.quotes[].currency` when `tables` is empty, which is how a Quote-block document reports it.
Reading only `tables` drops the currency on those, and an unlabelled amount is worse than none.

**Never `grand_total`** — observed as `0 PLN` on a document worth 200,000 USD. Currency varies per document,
so do not total across currencies; subtotal per currency instead.

### Step 5: Build the register

One row per contract: counterparty, document name, agreement date, signature date, value with currency, and
the term flags that are set. Omit flags that are false rather than listing nine "no" columns.

Then, in plain words:

- how the candidate set was built, and the exact search terms if you used any
- that extracted values are **AI-derived with `acceptance_status: pending`**, not human-reviewed
- how many contracts had no extraction available
- that the register is **best-effort, not exhaustive**, if a search was involved

---

## Usage examples

```txt
@pandadoc-contract-register — build me a register of everything we've signed this year with values and key
terms
```

```txt
@pandadoc-contract-register — find every contract with Acme Corp and show each one's status and terms
```

---

## Troubleshooting

### A customer I know we have contracts with returns nothing

The search term did not appear in those documents. Metadata cannot be filtered, so the only entry point is
full text. Try the legal name, the trading name and the email domain, and say what you tried.

### Metadata comes back `not_started`

The document is not completed. Extraction only runs on completed documents. Nothing to do but wait.

### Every field says `pending`

Expected — that is the default `acceptance_status`. It means nobody has reviewed the extraction. Report the
values with that caveat rather than suppressing them.

### Value is missing or 0

Contracts without a pricing table genuinely have no value in PandaDoc. If you see 0 on a contract you know
is worth something, you read `grand_total` instead of `pricing.total`.

### A contract in the register turns out not to be signed

Check `recipients[].signature_date`. `Completed` status alone does not mean signed — it can be set manually.
