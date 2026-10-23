---
name: pandadoc-invoice-handoff
category: finance
roles: [finance, owner, sales]
complexity: advanced
prerequisites: [PandaDoc]
description: Turn a signed quote or proposal into an invoice — find quotes that completed and have not been invoiced yet, reuse their pricing, create the invoice from a template, and send it on confirmation. Use when someone asks to invoice a closed deal or wants signed quotes swept for invoicing.
tags: [pandadoc, invoicing, finance, quotes, e-signature]
version: "0.1.1"
metadata:
  visibility: public
---

# PandaDoc Quote → Invoice Handoff

Find quotes that have been signed, build the matching invoice, send it.

Two structural facts shape this: **there are no webhooks**, so this is a sweep rather than a trigger; and
**nothing marks a quote as invoiced**, so you have to establish that yourself or you will double-invoice.

---

## Prerequisites

The PandaDoc MCP Server must be connected. Required tools: `PandaDoc:documents_list`, `PandaDoc:documents_details_get`,
`PandaDoc:templates_list`, `PandaDoc:templates_details_get`, `PandaDoc:documents_create`, `PandaDoc:documents_status_get`, `PandaDoc:documents_update`,
`PandaDoc:documents_send`. If they are missing, say so and point at <https://mcp.pandadoc.com>.

**An invoice template must exist in the workspace, with a pricing table (not a Quote block) in the
quote's currency.** The reference account has two "invoice"-named templates and neither qualifies:
one's pricing block is a Quote, not a table (the exact trap Step 4 describes), and the other returns
an API error on every read. So the create-and-verify path (Steps 5–6) remains untested end to end
against a real template; the sweep, exclusion, and refusal steps are not affected.

---

## No trigger, no marker

**No webhooks.** "On completion, generate the invoice" cannot be event-driven through the MCP. Run this on a
schedule or on demand, and treat it as a sweep over recently completed quotes.

**No invoiced flag.** PandaDoc does not record that a quote has been invoiced. Before creating anything you
must decide how you will know, and use the same method every run. Options, best first:

1. **Tag the source quote** after invoicing — documents carry `tags`, settable via `PandaDoc:documents_update`. A tag
   like `invoiced` is durable, visible in the UI, and survives across runs. This is the recommended approach.
2. **Name convention** on the invoice, e.g. `Invoice - <quote name>`, then search for it before creating.
   Works, but depends on `PandaDoc:documents_search` full text, which is fuzzy and eventually consistent.
3. **Ask the user each time.** Safe but does not scale to a scheduled sweep.

Whichever you use, **say so in your output**, and if you cannot establish invoiced-or-not for a quote, ask
rather than assume. Sending a customer a second invoice for the same work is worse than sending none.

---

## Workflow

### Step 1: Find signed quotes

`PandaDoc:documents_list` with `status: "Completed"`, then `status: "Paid"`, `count: 100`.

Narrow to actual quotes — those with a populated `pricing` block. A signed NDA has no value to invoice.

**Confirm each was genuinely signed.** `PandaDoc:documents_details_get` → `recipients[]` must contain a
`recipient_type: "signer"` with a non-null `signature_date`. A document flipped with
`PandaDoc:documents_status_change` reads `Completed` but nobody signed it, and invoicing against it would bill a
customer for a deal that was never closed.

### Step 2: Exclude anything already invoiced

Apply the method from above. If tagging, skip quotes whose `tags` include your marker.

### Step 3: Read the pricing to carry over

From `PandaDoc:documents_details_get` on the quote:

- `pricing.tables[].items[]` — `name`, `qty`, `price`, `subtotal` per line
- `pricing.tables[].summary` — `subtotal`, `discount`, `tax`, `fee`, `total`
- `pricing.tables[].currency`
- `pricing.total` for the headline figure — **never `grand_total`**, which has been observed as `0 PLN` on a
  document worth 200,000 USD

**If `pricing.tables` is empty, look in `pricing.quotes` before concluding the quote has no line items.**
A document built on a Quote block keeps everything under `quotes[]`: `quotes[].sections[].items[]`,
`quotes[].summary`, `quotes[].currency`. Same data, different place. Reading only `tables` on such a
document yields no lines and no currency, and an invoice built from that is empty.

**Skip rows with `options.optional_selected: false`.** They were offered and not taken, so they are excluded
from the quote's total and must not appear on the invoice. Carrying them over is the most likely way to
invoice more than the customer agreed to.

### Step 4: Find the invoice template

`PandaDoc:templates_list` with `q: "invoice"`. Remember `q` is fuzzy — confirm the match rather than trusting a single
hit. Read `PandaDoc:templates_details_get` for `roles[]`, `tokens[]` and the pricing table name.

If there is no invoice template, **stop and say so.** Do not improvise one: markdown-created documents have
no signature fields and their recipient is silently downgraded to CC, so what you would produce is unusable.

Two properties of that template decide whether you can proceed at all. Check both before Step 5:

**Its pricing block must be a table, not a Quote.** If `pricing.tables` is empty and `pricing.quotes` is
populated, stop. `pricing_tables` is accepted and then silently ignored on such a template, so you would
create an invoice showing `total: "0"` with no error anywhere. A zero invoice that looks finished is worse
than no invoice. Say the template uses a Quote block and ask for one built on a pricing table.

**Its currency must match the quote's.** `pricing.tables[].currency` is fixed by the template and cannot be
set through the API by any route. `PandaDoc:documents_create` rejects a different one with
`400 Wrong request currency … mismatch template currency` and leaves a broken document behind.
`PandaDoc:documents_update` is worse: it returns `{"updated": true}`, applies your row data, and **silently keeps the
template's currency** — so a skill that "fixes" the currency after the fact gets a success response and
reports a denomination the document does not have. If you ever write pricing, re-read
`pricing.tables[].currency` afterwards rather than trusting the call. Worse is the failure that does *not* error: omit the currency, and the
quote's numbers are written into the template's denomination unchanged, turning a 200,000 USD agreement
into a 200,000 PLN invoice that looks entirely normal. If the currencies differ, **stop and tell the
user** — name both currencies and ask for an invoice template in the quote's. Never convert the amounts
yourself; you have no rate and no authority to pick one.

### Step 5: Create the invoice

`PandaDoc:documents_create` from the invoice template, passing the carried-over line items in `pricing_tables` under
the **exact** table name from Step 4.

On the discount: `discount.name` decides whether your value replaces the template's or is added to it —
matching the template's name replaces, any other name appends. To reproduce the quote's discount exactly,
pass the quote's effective percentage under `"Discount"`, then **verify** (Step 6). Never pass a computed
delta.

`options` is required on every row even though the schema marks it optional.

Poll `PandaDoc:documents_status_get` until `Draft`.

### Step 6: Verify the invoice matches the quote

`PandaDoc:documents_details_get` on the invoice and compare against the quote, before showing anything:

- same line items, same quantities, same unit prices
- `summary.subtotal` matches
- effective discount matches — and `summary.discount` is **not negative**, which would mean a surcharge
- `pricing.total` matches the quote's total
- currency matches

If anything differs, correct it with `PandaDoc:documents_update` and re-read. Reporting an invoice total you have not
compared against the quote is how a customer gets billed the wrong amount.

### Step 7: Confirm, send, mark

Show the comparison — quote total against invoice total — and ask before sending. Only on an explicit yes,
`PandaDoc:documents_send`. Retry once on `409`.

**After a successful send, apply your invoiced marker to the source quote** with `PandaDoc:documents_update`. If you
skip this, the next sweep invoices it again.

Report: the quote, the invoice, both totals, that they match, the recipient, and that the source quote is now
marked.

---

## Usage examples

```txt
@pandadoc-invoice-handoff — any signed quotes waiting to be invoiced?
```

```txt
@pandadoc-invoice-handoff — invoice the Acme Corp deal that just closed
```

---

## Troubleshooting

### There is no invoice template

Stop and say so. Generating one is not viable — markdown documents cannot be signed and `PandaDoc:templates_create`
needs a PDF at a public HTTPS URL.

### The invoice total is higher than the quote

Most likely you carried over an optional row that was not selected. Those are excluded from the quote total.
Check `options.optional_selected` on every line.

### The discount came out wrong

`discount.name` did not behave as expected. Pass the target percentage under `"Discount"` and verify; correct
with `PandaDoc:documents_update` using the direct value if it still differs.

### A quote got invoiced twice

The invoiced marker was not applied, or a different method was used between runs. Pick one method, apply it
after every send, and check it before every create.

### I invoiced a deal that was not actually closed

`Completed` status alone does not mean signed — it can be set manually with `PandaDoc:documents_status_change`, which
leaves every `recipients[].signature_date` as `null`. Always check signature dates before invoicing.
