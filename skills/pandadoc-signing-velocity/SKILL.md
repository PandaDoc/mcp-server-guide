---
name: pandadoc-signing-velocity
category: reporting
roles: [sales, owner, bizops]
complexity: advanced
prerequisites: [PandaDoc]
description: Build a signing pipeline report — status counts, average time to sign, value in flight, and documents that are stuck. Computed client-side with the sample size and method stated. Use when someone wants a weekly signing report or pipeline overview.
tags: [pandadoc, reporting, metrics, pipeline, e-signature]
version: "0.1.0"
---

# PandaDoc Signing Velocity & Pipeline Report

Status counts, time to sign, value in flight, and what is stuck — as one report.

Every number here is computed by you over a bounded set. **There is no aggregation endpoint**, so the
honesty of this report depends entirely on stating what went into it.

---

## Prerequisites

The PandaDoc MCP Server must be connected. Required tools: `documents_list`, `documents_details_get`.
If they are missing, say so and point at <https://mcp.pandadoc.com>.

---

## The rule for this skill

**Every figure ships with its sample size and its method.** A single average with no denominator is worse
than no average, because it reads as authoritative. If you computed time-to-sign over four documents, say
"over 4 documents". If you capped the set, say where you stopped.

---

## Workflow

### Step 1: Count by status

`documents_list` per status, `count: 100`. Statuses worth counting for a pipeline view:

- **In flight:** `Sent`, `Viewed`, `Waiting for Approval`, `External Review`
- **Finished:** `Completed`, `Paid`
- **Dead or stalled:** `Declined`, `Expired`, `Rejected`
- **Not started:** `Draft`

One call per status — the parameter takes a single string. If a status returns 100 results, more may exist;
say the count is a floor rather than a total.

### Step 2: Average time to sign

Only `Completed` and `Paid` documents have a duration. For each, you need:

- `date_sent` — **only in `documents_details_get`**, one call per document
- `date_completed` — in both `documents_list` and details

So the interval is `date_sent → date_completed`. Cap the number of detail calls (30 is reasonable) and say
if you capped.

Three things to disclose, not bury:

1. **The sample size.** "3.2 days over 7 documents", never just "3.2 days".
2. **In-flight documents are excluded**, because they have no completion date. That biases the average
   **downward** — fast signers are over-represented and anything still dragging is invisible. Say so.
3. **Force-completed documents have no real signature.** A document flipped via `documents_status_change`
   has `date_completed` set but every `recipients[].signature_date` as `null` and signature fields
   `is_filled: false`. Its "time to sign" is meaningless. Check `signature_date` and exclude those, or
   report them separately.

If nothing qualifies, say the sample is empty. Do not produce a number.

### Step 3: Value in flight

Sum `pricing.total` across the in-flight statuses.

- **Never `grand_total`** — it has been observed as `0 PLN` on a document worth 200,000 USD.
- Currency lives per table in `pricing.tables[].currency` and **varies per document**. When `tables` is
  empty, read `pricing.quotes[].currency` instead — Quote-block documents keep their pricing there, and
  looking only at `tables` leaves their amounts unlabelled. Do not add across currencies. Report per
  currency, or report the dominant one and say what was excluded.
- Rows with `options.optional_selected: false` are excluded from the table total, so use `pricing.total`
  rather than summing line items.
- Documents with no pricing table contribute nothing. Say how many had no value, so a small total is not
  mistaken for a small pipeline.

### Step 4: Stuck documents

Age in-flight documents from `date_sent`. Flag anything out more than 14 days with no completion, and
anything partially signed — some `recipients[].has_completed: true`, others false — for more than 7 days.

Respect `signing_order`: a later signer in a sequential flow is not late.

### Step 5: Report

Lead with the counts, then time to sign with its denominator, then value in flight per currency, then the
stuck list oldest first. Close with a short method note: which statuses, what was capped, what age is
measured from, and what was excluded and why.

---

## Usage examples

```txt
@pandadoc-signing-velocity — weekly signing report
```

```txt
@pandadoc-signing-velocity — how's the pipeline looking, and what's stuck?
```

---

## Troubleshooting

### The average time to sign looks implausibly fast

Check for force-completed documents. `documents_status_change` sets `date_completed` immediately, so a
document created and flipped in the same minute reports a near-zero duration. Exclude anything whose
`recipients[].signature_date` is `null`.

### Value in flight looks far too low

Either you read `grand_total` instead of `pricing.total`, or most in-flight documents genuinely have no
pricing table. Report the count of documents with no value so the two cases are distinguishable.

### Totals across currencies do not add up

They should not be added. `pricing.tables[].currency` varies per document — USD and PLN have both been seen
in the same account. Report per currency.

### A status count seems capped

`documents_list` maxes at `count: 100`. If a status returned exactly 100, treat it as a floor and page or
say so.

### I cannot get `date_sent` without a call per document

Correct — it exists only in `documents_details_get`. Cap the number of documents you expand and disclose the
cap rather than silently truncating the sample.
