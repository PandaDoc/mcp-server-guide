---
name: pandadoc-quote-builder
category: sales
roles: [sales, bizops, owner]
complexity: advanced
prerequisites: [PandaDoc]
description: Build a priced PandaDoc quote or proposal from a template — fill the Quote block (or a classic pricing table) and variables, verify the totals and discount actually landed as asked, confirm, then send for signature. Use when someone wants a quote, proposal or priced offer created for a client.
tags: [pandadoc, quotes, proposals, pricing, e-signature, sales]
version: "0.2.0"
metadata:
  visibility: public
---

# PandaDoc Quote & Proposal Builder

Turn "quote Acme for 200 licences with 10% off" into a real, correctly priced PandaDoc document, checked
before anyone sees it, and sent only on confirmation.

The hard part is not creating the document. It is that **the API will accept your pricing and silently
produce different numbers than you asked for.** Most of this skill is about catching that.

Templates price through a **Quote block** (the usual case, and the flow below) or a **classic pricing
table** (a variant with a few differences, see "Classic pricing table variant"). Step 2 tells you which.

---

## Prerequisites

The PandaDoc MCP Server must be connected. Required tools: `PandaDoc:templates_list`, `PandaDoc:templates_details_get`,
`PandaDoc:documents_create`, `PandaDoc:documents_status_get`, `PandaDoc:documents_details_get`,
`PandaDoc:documents_update`, `PandaDoc:quotes_update`, `PandaDoc:documents_send`. `PandaDoc:documents_update`
corrects a classic table and adds a missing signer in Step 7; the classic variant never calls
`PandaDoc:quotes_update`.
If they are missing, tell the user the MCP Server is not connected and point them at
<https://mcp.pandadoc.com>. If only `PandaDoc:quotes_update` is missing, classic-table templates still
work; on a Quote-block template, stop and say so.

---

## What the user provides

Extract from their message:

- **Client name** — required. Used for the document name and the `Client.*` tokens.
- **Template** — a name or description ("our standard proposal"). If missing, ask; do not pick one.
- **Line items** — description, unit price, quantity for each. If prices are missing, ask.
- **Discount** — optional. Read carefully: "10% discount" almost always means *the client pays 10% less*,
  not *add 10% to whatever the template already discounts*. See Step 4.
- **Recipient email** — needed only if sending. If the user only wants a draft, skip it.

---

## Why this is not just create-with-pricing

Five behaviours, verified against the live MCP except where noted, that a naive flow gets wrong (item 1
verified 2026-10-30):

1. **`PandaDoc:quotes_update` is a destructive replace, not a merge.** Including `sections` replaces the quote's
   entire section list, and including `items` on a section replaces that section's entire item list. Any
   section or item whose `id` you leave out is **removed**. Updating one row without re-sending the others
   deletes them, and the call still returns `ok`. Quote templates ship with empty placeholder items (four
   on the one tested), and sending your own `items` is what removes them.
2. **The discount name decides whether your discount replaces the template's or is added to it.** It is a
   key, not a label. Verified on a classic template carrying 15%: passing `10` under the name `"Discount"` —
   the name the template already uses — produced exactly **10%**, replacing it. Passing `10` under a new
   name like `"Special promo"` produced **25%**, appending a second discount. Quote blocks use the same
   keyed map (Step 4); verified 2026-10-30 on a Quote template whose 15% sat on a section: the same name
   replaced it, and a new name on the quote `summary` stacked on top by **compounding** (7,650 on 10,000,
   not 7,500). Get the name wrong and the price is wrong, with no error and a document that looks normal.
3. **`grand_total` is not the document's value.** It has been observed reading `{amount: "0", currency:
   "PLN"}` on a document whose `pricing.total` was `200000` USD. Never quote `grand_total` to a user.
4. **Optional rows that are not selected are excluded from the total.** On a Quote block a row with
   `options.selected: false` contributes nothing. On a classic table a row with
   `options.optional_selected: false` contributes nothing. A total computed by summing line items
   yourself will disagree with the document.
5. **Some templates cannot be read at all.** `PandaDoc:templates_details_get` can fail with
   `PANDADOC_API_RESPONSE_INVALID` on a specific template, and every document created from it fails the
   same way — while creation itself succeeds. So a successful create does not mean you can verify the
   result.

---

## Workflow

### Step 1: Find the template

Call `PandaDoc:templates_list` with `q` set to the user's wording and `count: 10`.

`q` is **not** a name substring match despite what the parameter description says — a search for "NDA"
has returned a template called `Declaration H&S standards and regulations`. So:

- **One match:** report it by name and ID, and continue. Say which template you picked.
- **Several matches:** list name + ID and ask. Never guess — the wrong template means the wrong prices.
- **No matches:** broaden the term once, then list all templates and ask.

**If the account has no suitable template, say so plainly and stop.** A priced document cannot be built
without one, and the workarounds that look available all fail. Verified 2026-08-06:

- **`source: "markdown"` cannot carry pricing.** The parameter does not exist on that source — the schema
  rejects `pricing_tables` outright — and writing a price table into the markdown body does not help: it
  lands as an ordinary content table, `pricing` comes back `{}`, and `grand_total` is `0`. The numbers are
  inert text. There is nothing to verify, no discount to apply, no currency. The document also has
  `fields: []` and its recipient is silently downgraded to `recipient_type: "CC"`, so nobody can sign it.
- **`source: "file"` cannot either.** It takes no `pricing_tables`. `parse_form_fields` handles fields, not
  pricing.
- **`PandaDoc:templates_create` is not a way round it.** It builds a template from a PDF at a public HTTPS URL —
  which a chat cannot produce — and a PDF-derived template does not carry a structured pricing table
  anyway.

So when the user says "just make me a quote" and there is no template, the honest answer is that one has to
exist first. Producing a markdown document with prices typed into it is the worst available outcome: it
looks like a quote, the totals are unverifiable, the discount was never applied, and it cannot be signed.
Do not do it, and do not offer it as a fallback.

### Step 2: Inspect the template and pick the path

Call `PandaDoc:templates_details_get` with the chosen ID.

**If this call fails** with `PANDADOC_API_RESPONSE_INVALID`, stop and tell the user that template is
unreadable through the API and suggest another. Do not proceed — you cannot read the template's pricing,
and you will not be able to verify the result afterwards either.

Check `pricing.tables` and `pricing.quotes` — the cases look alike and are not:

| `pricing.tables` | `pricing.quotes` | Path |
| --- | --- | --- |
| empty | populated | **Quote block** — Steps 3 to 7 below |
| populated | empty | **Classic pricing table** — "Classic pricing table variant" |
| populated | populated | **Mixed.** Filling only one leaves the other block unpriced, and `pricing.total` may mix both. Ask the user which block should carry the pricing, or stop and suggest a template with one pricing block. Do not create a document first |
| empty | empty | No pricing block at all. Say so and ask for a template that has one |

On either path, also read `roles[]`. Note whether any role has `preassigned_person` set; roles without it
need an explicit recipient.

**Quote block.** Read the currency from `pricing.quotes[].currency` and confirm a quote exists. The
template does not reliably expose its discount, and **its discount name cannot be read from it**, so you
read both from the created document in Step 4.

**Currency is fixed by the template.** If the user's amounts are in another currency, say so and ask for a
template in theirs. The `PandaDoc:quotes_update` schema has a `currency` field, but whether setting it
re-denominates a quote has not been verified, so do not use it to change currency. Writing the user's
numbers into the template's denomination with no error is the failure to avoid.

### Step 3: Create the document and wait for Draft

A quote cannot be created at document-creation time, only an existing one can be updated, so a Quote
block takes two calls. First `PandaDoc:documents_create` **without `pricing_tables`**:

```json
{
  "source": "template",
  "template_uuid": "<from Step 1>",
  "name": "<Type> - <Client> - <YYYY-MM-DD>",
  "recipients": [
    { "email": "<email>", "first_name": "<first>", "last_name": "<last>",
      "role": "<exact role name from Step 2>",
      "delivery_methods": { "email": true, "sms": false } }
  ],
  "tokens": [{ "name": "Client.Company", "value": "<Client>" }]
}
```

Always set `delivery_methods` to email-only unless a phone number was supplied, or sending later fails
with `A phone number is required`.

`pricing_tables` is accepted on a Quote-block template and then **silently ignored**, leaving the
template's original empty rows and `total: "0"`. Never pass it there, and never report a total from a
Quote document you have not filled with `PandaDoc:quotes_update` and read back. That is the dangerous
case: nothing errors, so a quote that was never priced looks like a finished document worth nothing.

`PandaDoc:documents_create` returns status `Uploaded`. Poll `PandaDoc:documents_status_get` until it reads
`Draft`. Usually one or two calls. `Draft` does **not** guarantee the document is ready for a status
transition — see Step 7.

### Step 4: Read the quote and decide what the discount means

Call `PandaDoc:documents_details_get` and take, from `pricing.quotes`: the quote `id`, each section `id`,
each existing item `id`, and the existing discounts from the quote `summary.discounts` **and**
each section's `summary.discounts` (each one's **name**, value and the level it sits on). A template's own
discount has been seen on a section (2026-10-30), so check both.

Do not reuse the template's ids: a created document gets its own quote `id` (verified 2026-10-30), so
read the section and item ids from the document too instead of assuming they match.

If `pricing.quotes` holds no quote, tell the user the template has no usable quote and stop; a quote
cannot be created through `PandaDoc:quotes_update`. The draft from Step 3 already exists and is unpriced,
so give its link (`https://app.pandadoc.com/a/#/documents/<document_id>`) and say it is an empty draft
that was not sent.

The draft now exists, so open your next message by saying so and that nothing has been sent. If the user
never answers the question below, that draft stays unpriced: say so rather than leaving it unmentioned.

Let `T` be the discount the user named and `D` the discount already on the quote. If there is none, pass
`T` under the name `"Discount"` and move on. If `D` is non-zero, the request is ambiguous and only the
user can settle it, so ask:

> This template already discounts `D`%. You asked for `T`% — should the client end up at `T`% overall, or
> `T`% on top of the existing `D`%?

Then pick the discount **name** to match the answer, because the name is what controls composition:

| The user wants | Pass | Under the name |
| --- | --- | --- |
| `T`% in total | `T` | the **existing discount's own name**, sent at the level where it lives (section or quote `summary`) — which **replaces** it |
| `T`% on top of `D`% | `T` | any new name, e.g. `"Special promo"`, on the quote `summary` — which **appends** |

The map **merges by name**: a name already present is replaced, a new name is added on top. Observed
once, on 2026-10-30, on one Quote template whose 15% "Discount" sat on a section: 10% under the same name
gave a 9,000 total on 10,000, and `{}` left the 15% in place while `value: 0` neutralised it. Treat these
as the expected behaviour, not a guarantee. Step 6 is the authority: if `pricing.total` disagrees with the
total you computed independently, trust the read-back and correct it.

**Discounts in the same map add; discounts at different levels compound.** On a document, `"Discount": 10`
plus `"Special promo": 5` in one map gave 15%. But a 15% section discount plus a 10% quote-level
`"Special promo"` gave 10,000, then 8,500, then 7,650: 23.5%, not 25%. So for "on top", when `D` sits on a
section and `T` goes on the quote `summary`, the expected discount is `1 − (1 − D)(1 − T)`. Tell the user
that figure when you report the reading.

A new overall discount goes on the quote `summary`, once, beside `sections`. A template's own discount that
sits on a section `summary` is replaced or zeroed there, under its own name; sending its name on the quote
`summary` instead would add a second discount.

A section discount only applies to its own section, so replacing it at section level gives `T`% overall
only when it covers the whole quote: a single-section quote, or the same discount on every section. If
the template discount sits on only some sections of a multi-section quote, "`T`% in total" cannot be
reached by replacing it there. Zero it in its section (same name, `value: 0`) and put `T` on the quote
`summary` under a new name. This combination has not been observed live (each half was, on 2026-10-30),
so Step 6 decides: if the read-back total is not the `T`% total, stop and tell the user, do not retry.

Do **not** compute a delta like `T − D`. That was an earlier misreading of this API and it produces a
surcharge when the name happens to match: passing `−5` under `"Discount"` on a 15% template yields a −5%
surcharge, not 10% off.

Whichever reading you applied, **say so in your output.**

### Step 5: Fill the quote

Call `PandaDoc:quotes_update`. The example below covers a **new overall discount** (no template
discount, or "on top of" it), which goes on the quote `summary`. For "`T`% in total" over a template
discount that lives on a section, put the discount in that section's `summary` instead, under the
template's own name, and leave the quote `summary` without it:

```json
{
  "document_id": "<document id>",
  "quotes": [{
    "id": "<quote id from Step 4>",
    "quote": {
      "summary": { "discounts": { "<name from Step 4>": { "type": "percent", "value": <T as a number> } } },
      "sections": [{
        "id": "<existing section id>",
        "items": [{
          "name": "<item>", "price": <unit price>, "qty": <quantity>,
          "options": { "qty_editable": false, "selected": true, "optional": false }
        }]
      }]
    }
  }]
}
```

Section-level variant, for "`T`% in total" when the template's discount sits on the section:

```json
{
  "id": "<existing section id>",
  "summary": { "discounts": { "<template's own name>": { "type": "percent", "value": <T as a number> } } },
  "items": [ ... ]
}
```

Things that otherwise cost you a round trip or a silently wrong quote:

- **Re-send everything you want to keep.** An omitted section or item `id` is removed (see "Why this is not
  just create-with-pricing", item 1). Reuse the ids from Step 4, include every section and item the quote
  should end with, and leave `id` off only for items you are adding. Pass `items: []` only when you mean to
  clear a section.
- **`options` is all-or-nothing:** give `qty_editable`, `selected` and `optional` together. Quote rows use
  `selected`, not the classic `optional_selected`. An optional row with `selected: false` is excluded from
  the total.
- **Send a discount at the level it lives.** To replace or zero a template discount that sits on a section,
  put the same name in that section's `summary.discounts`; a new overall discount goes on the quote
  `summary`.
- **A discount is `{ "type": "percent" | "flat", "value": <number> }` keyed by name.** For a fixed
  amount use `flat`; do not carry over the classic table's `absolute`. `value` is a JSON number, not a string. Omitting `discounts` leaves
  it unchanged. Passing `{}` does **not** clear the map (tried 2026-10-30), even though the tool schema
  says it should, so do not rely on it. To neutralise a discount you do not want, send the same name with
  `value: 0`.
- **Every `PandaDoc:quotes_update` result is per quote.** `ok` carries the full state after the update.
  `conflict` means it changed concurrently: re-read and retry. `not_in_document` means the id is wrong or
  you lack edit access. `internal_error` is safe to retry once. Anything other than `ok` is a failed
  update.

### Step 6: Verify the numbers — do not skip this

Call `PandaDoc:documents_details_get` and check, before showing the user anything. A
`PandaDoc:quotes_update` result of `ok` is not verification: read the quote back from `pricing.quotes`.

1. **The effective discount matches what the user asked for.** The quote `summary.subtotal` read `"0"`
   on the template tested (2026-10-30), so build the subtotal yourself: sum the `subtotal` (qty × price) of
   the items with `options.selected: true`. Do **not** sum the sections' `total`: that is already net of
   the section discount, so a correct section-level discount would read as 0%. Effective discount is
   `(subtotal − pricing.total) / subtotal`; compare it with the expected total discount `E`:
   `T` for "in total"; for "on top of `D`%", `D + T` when both discounts are in the same map and
   `1 − (1 − D)(1 − T)` when `D` sits on a section and `T` on the quote `summary` (15% then 10% is 23.5%,
   total 7,650 on 10,000). Also check `summary.discounts` lists only the discounts you meant to apply, and
   that tax or fees are not skewing the comparison.
2. **Every line item is present** with the right `qty` and `price`, and `subtotal` per row is what you
   expect. Read rows from `pricing.quotes[].sections[].items[]`. A missing row means the update dropped
   it.
3. **No row you intended to count has `options.selected: false`.** If one does, its subtotal is excluded
   from the total.
4. **Read the value from `pricing.total`**, never `grand_total`.
5. **Currency** comes from `pricing.quotes[].currency` and matches what the user wants.
6. **A zero total after an update is a failure.** `pricing.total` of `"0"` on a document you just priced
   means the numbers did not land, whatever the update call returned. Do not report it.

**If any check fails, correct it once and verify again.** Call `PandaDoc:quotes_update` again with the
full section list and each discount at the level it lives (a template discount on a section is corrected
in that section's `summary`), keeping the name and value the user's chosen reading calls for
(never overwrite an "on top" choice with `T` under the existing name). To drop a name you did not want,
send that same name with `value: 0`. If the second read-back still fails, stop:
tell the user the quote is not priced correctly, give them the document link, and do not send. Never
report a figure you have not verified.

Verifying the result rather than trusting the request is deliberate, and it has already earned its place:
the first version of this skill computed a delta on the assumption that discounts always add, and a live
run produced a 5% **surcharge** instead of a 10% discount. The verification step caught it and the
correction landed on the right number. Keep this step even if the composition rules change — it is correct
under any of them.

### Step 7: Confirm, then send

Show the user the numbers you verified — subtotal, discount as a percentage and an amount, total,
currency — plus which template and which discount reading you used. Then ask:

> Ready to send **"\<name\>"** to **\<email\>**? Subtotal \<X\>, \<T\>% discount, total \<Y\> \<currency\>.

Only on an explicit yes, call `PandaDoc:documents_send` with a `subject` and short `message`.

If it returns `409 The document isn't ready for a status transition yet`, wait a moment and retry once.
This happens even when `PandaDoc:documents_status_get` already reported `Draft` — it is a known race, not an error
in your input.

If it returns `400 Not all signature, initials fields were assigned`, a signing role has no recipient.
Read `roles[]` again, add the missing recipient with `PandaDoc:documents_update`, then retry.

If the user does not want it sent, leave it as a draft and give them the link:
`https://app.pandadoc.com/a/#/documents/<document_id>`

---

## Classic pricing table variant

Use this only when Step 2 found `pricing.tables` populated. Steps 1, 2 and 7 are unchanged. There is no
`PandaDoc:quotes_update` call, and the discount decision happens **before** the document is created
because the template's discount is read from the template.

**Step 2 additions.** Take the table name from `pricing.tables[]` — pass it exactly; pricing is matched by
name, not position. Compute the template's existing discount `D` as `summary.discount / summary.subtotal`.
Currency is `pricing.tables[].currency`; it is fixed by the template, and passing a different one fails with
`Wrong request currency … mismatch template currency`. If the user's amounts are in another currency, say
so and ask for a template in theirs.

**Discount.** Let `T` be the discount the user named. If `D` is zero, pass `T` and move on. Otherwise ask
the same overall-or-on-top question as Step 4, then pick the **`discount.name`**:

| The user wants | Pass | Under `discount.name` |
| --- | --- | --- |
| `T`% in total | `T` | `"Discount"` — the template's own name, which **replaces** it |
| `T`% on top of `D`% | `T` | any new name, e.g. `"Special promo"` — which **appends** |

Never compute a delta `T − D`. One caveat: **the template's discount name cannot be read from
`PandaDoc:templates_details_get`.** The response carries `summary.discount` but leaves `items[].discounts`
empty — names only appear on created documents. `"Discount"` is the observed default and a sound first
guess, but it is a guess. Verify, then correct. Say which reading you applied.

**Create.** One call, `PandaDoc:documents_create` with `pricing_tables`, then poll `PandaDoc:documents_status_get`
until `Draft`:

```json
{
  "source": "template",
  "template_uuid": "<from Step 1>",
  "name": "<Type> - <Client> - <YYYY-MM-DD>",
  "recipients": [
    { "email": "<email>", "first_name": "<first>", "last_name": "<last>",
      "role": "<exact role name from Step 2>",
      "delivery_methods": { "email": true, "sms": false } }
  ],
  "tokens": [{ "name": "Client.Company", "value": "<Client>" }],
  "pricing_tables": [{
    "name": "<exact table name from Step 2>",
    "options": { "currency": "USD", "discount": { "name": "<name from the discount decision>", "type": "percent", "value": "<pass from the discount decision>" } },
    "sections": [{
      "title": "Products", "default": true,
      "rows": [{
        "data": { "name": "<item>", "price": <unit price>, "qty": <quantity> },
        "options": { "optional": false, "optional_selected": false, "qty_editable": false }
      }]
    }]
  }]
}
```

`options` is required on every row, even though the schema marks it optional. Omitting it returns
`400 validation_error` with `{"rows": [{"options": ["This field is required."]}]}`.

**Verify (replaces Step 6's checks).** Call `PandaDoc:documents_details_get` and check:

1. **The effective discount matches** `summary.discount / summary.subtotal` against the expected `E`: `T`
   for "in total", `D + T` for "on top of `D`%". A **negative** `summary.discount` means you produced a
   surcharge — the name did not behave as expected. If it does not match, correct it once with
   `PandaDoc:documents_update` using the name and value the chosen reading calls for (for "in total", the
   target value `T` directly), then re-read.
   If it still fails, stop and tell the user, as in Step 6.
2. **Every line item is present** with the right `qty` and `price`, and `subtotal` per row is what you
   expect.
3. **No row you intended to count has `options.optional_selected: false`.** If one does, its subtotal is
   excluded from the total.
4. **Read the value from `pricing.total`**, never `grand_total`.
5. **Currency** comes from `pricing.tables[].currency`.

---

## Usage examples

```txt
@pandadoc-quote-builder — quote Acme Corp from our standard proposal: 200 Enterprise licences at $1000,
12 months support at $1500/mo, 10% discount. Send to procurement@acme.com
```

```txt
@pandadoc-quote-builder — build me a draft quote for Globex, 50 seats at $99, no discount. Don't send it.
```

---

## Troubleshooting

### A Quote document shows `total: "0"`

Either `pricing_tables` was used at creation, which is ignored on Quote blocks, or `PandaDoc:quotes_update` has not
run or did not land. Fill it with `PandaDoc:quotes_update` using the ids from `pricing.quotes`, then read
it back. Never report that document as priced.

### A line item disappeared after `quotes_update`

You sent `sections` or `items` without the ids of what you meant to keep, and the omitted ones were
removed. Re-read the document and re-send every section and item the quote should have.

### `quotes_update` returns `conflict`, `not_in_document` or `internal_error`

`conflict`: the quote changed concurrently, so re-read the document and retry with the fresh ids.
`not_in_document`: the quote id is not on this document, or you cannot edit it, so re-read `pricing.quotes`
for the right id. `internal_error`: retry once on its own. Do not carry on to Step 7 until the result is `ok`
and Step 6 passes.

### The total does not match what I calculated

Check for unselected rows. On a Quote block `options.selected: false` excludes the row, and
`summary.subtotal` can read `"0"`, so compare `pricing.total` with the sum of the selected items'
`subtotal` less the discounts, not with the sum of the sections' `total` (already net of a section
discount). Also confirm you are reading `pricing.total` and not `grand_total`. On a classic table (variant),
`options.optional_selected: false` excludes the row from `summary.subtotal`.

### The discount came out higher than requested

If the user chose "in total", your discount name did not match the existing one, so yours was appended
rather than replacing it. (If they chose "on top of", a higher total is correct: check against the expected
discount from Step 6, which compounds across levels.) On a
Quote block, re-issue `PandaDoc:quotes_update` with the full section list and each discount at the level
it lives (the section `summary` for a section-level template discount, otherwise the quote `summary`): use
the existing name at the target value, and send any extra name with `value: 0`. On a classic table, re-issue
with `name: "Discount"`, or correct the document with `PandaDoc:documents_update` passing the target value
directly.

### The discount came out negative — the total is higher than the subtotal

You passed a negative value under a name that replaced the existing discount, so it became a surcharge.
Pass the target percentage as a positive number instead. Never pass a computed delta.

### `PANDADOC_API_RESPONSE_INVALID` on the template or the document

That template's data cannot be serialised by the API. It affects both the template and every document
created from it, though creation itself succeeds. Use a different template and report the broken one.

### `400 validation_error` mentioning `options` (classic table)

Every pricing row needs an `options` object, even an effectively empty one. The schema says it is
optional; the API disagrees.

### `grand_total` shows 0

Expected. It does not reflect the pricing. Use `pricing.total`.

### `409` on send

The document is still settling after creation. Retry once. Do not loop.
