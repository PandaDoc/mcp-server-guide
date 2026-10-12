---
name: pandadoc-quote-builder
category: sales
roles: [sales, bizops, owner]
complexity: advanced
prerequisites: [PandaDoc]
description: Build a priced PandaDoc quote or proposal from a template — fill the pricing table and variables, verify the totals and discount actually landed as asked, confirm, then send for signature. Use when someone wants a quote, proposal or priced offer created for a client.
tags: [pandadoc, quotes, proposals, pricing, e-signature, sales]
version: "0.1.1"
---

# PandaDoc Quote & Proposal Builder

Turn "quote Acme for 200 licences with 10% off" into a real, correctly priced PandaDoc document, checked
before anyone sees it, and sent only on confirmation.

The hard part is not creating the document. It is that **the API will accept your pricing and silently
produce different numbers than you asked for.** Most of this skill is about catching that.

---

## Prerequisites

The PandaDoc MCP Server must be connected. Required tools: `templates_list`, `templates_details_get`,
`documents_create`, `documents_status_get`, `documents_details_get`, `documents_update`, `documents_send`.
If they are missing, tell the user the MCP Server is not connected and point them at
<https://mcp.pandadoc.com>.

---

## What the user provides

Extract from their message:

- **Client name** — required. Used for the document name and the `Client.*` tokens.
- **Template** — a name or description ("our standard proposal"). If missing, ask; do not pick one.
- **Line items** — description, unit price, quantity for each. If prices are missing, ask.
- **Discount** — optional. Read carefully: "10% discount" almost always means *the client pays 10% less*,
  not *add 10% to whatever the template already discounts*. See Step 3.
- **Recipient email** — needed only if sending. If the user only wants a draft, skip it.

---

## Why this is not just create-with-pricing

Four behaviours, all verified against the live MCP, that a naive flow gets wrong:

1. **`discount.name` decides whether your discount replaces the template's or is added to it.** It is a
   key, not a label. Verified on a template carrying 15%: passing `10` under the name `"Discount"` — the
   name the template already uses — produced exactly **10%**, replacing it. Passing `10` under a new name
   like `"Special promo"` produced **25%**, appending a second discount. Get the name wrong and the price
   is wrong, with no error and a document that looks normal.
2. **`grand_total` is not the document's value.** It has been observed reading `{amount: "0", currency:
   "PLN"}` on a document whose `pricing.total` was `200000` USD. Never quote `grand_total` to a user.
3. **Optional rows that are not selected are excluded from the total.** A row with
   `options.optional_selected: false` contributes nothing, so a total computed by summing line items
   yourself will disagree with the document.
4. **Some templates cannot be read at all.** `templates_details_get` can fail with
   `PANDADOC_API_RESPONSE_INVALID` on a specific template, and every document created from it fails the
   same way — while creation itself succeeds. So a successful create does not mean you can verify the
   result.

---

## Workflow

### Step 1: Find the template

Call `templates_list` with `q` set to the user's wording and `count: 10`.

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
- **`templates_create` is not a way round it.** It builds a template from a PDF at a public HTTPS URL —
  which a chat cannot produce — and a PDF-derived template does not carry a structured pricing table
  anyway.

So when the user says "just make me a quote" and there is no template, the honest answer is that one has to
exist first. Producing a markdown document with prices typed into it is the worst available outcome: it
looks like a quote, the totals are unverifiable, the discount was never applied, and it cannot be signed.
Do not do it, and do not offer it as a fallback.

Two further requirements the template itself must meet — check them in Step 2 before promising anything:
its pricing block must be a **classic pricing table** rather than a Quote block, and it must already be in
the **currency** the user wants, because currency cannot be set through the API.

### Step 2: Inspect the template — and handle it being unreadable

Call `templates_details_get` with the chosen ID. You need three things from it:

- **`pricing.tables[]`** — the name of the pricing table you will populate. You must pass this name
  exactly; pricing is matched by name, not position.
- **`pricing.tables[].summary.discount` and `subtotal`** — the template's **existing** discount. Compute
  it as a percentage: `summary.discount / summary.subtotal`. You need this number in Step 3.
- **`roles[]`** — who signs. Note whether any role has `preassigned_person` set; roles without it need an
  explicit recipient.

**If this call fails** with `PANDADOC_API_RESPONSE_INVALID`, stop and tell the user that template is
unreadable through the API and suggest another. Do not proceed — you cannot compute the discount delta
without the template's current discount, and you will not be able to verify the result afterwards either.

If `pricing.tables` is empty, check `pricing.quotes` before saying anything — the two cases look alike and
are not:

- **`tables` and `quotes` both empty** — the template genuinely has no pricing block. Say so and ask for
  one that has.
- **`tables` empty but `quotes` populated** — the template uses a Quote block. It *has* pricing, but the
  API cannot write to it: there is no `quotes` parameter on `documents_create`, and `pricing_tables` is
  accepted and then **silently ignored**, leaving a document with the template's original empty rows and
  `total: "0"`. Do not attempt it and do not report a total from such a document. Tell the user this
  template's pricing block is a Quote and cannot be filled through the API, and ask for one built on a
  classic pricing table.

The second case is the dangerous one: nothing errors, so a quote that was never priced comes back looking
like a finished document worth nothing.

Note the currency too. `pricing.tables[].currency` is fixed by the template and **cannot be overridden**
at creation — passing a different one fails with `Wrong request currency … mismatch template currency`.
If the user's amounts are in another currency, say so and ask for a template in theirs rather than
writing their numbers into the wrong denomination.

### Step 3: Decide what the discount means, then pick the name accordingly

This is the step that makes the difference — and it needs no arithmetic.

Let `T` be the discount the user named and `D` the template's existing discount from Step 2. If `D` is
zero, pass `T` and move on. If `D` is non-zero, the request is ambiguous and only the user can settle it,
so ask:

> This template already discounts `D`%. You asked for `T`% — should the client end up at `T`% overall, or
> `T`% on top of the existing `D`%?

Then pick the discount **name** to match the answer, because the name is what controls composition:

| The user wants | Pass | Under `discount.name` |
| --- | --- | --- |
| `T`% in total | `T` | `"Discount"` — the template's own name, which **replaces** it |
| `T`% on top of `D`% | `T` | any new name, e.g. `"Special promo"` — which **appends** |

Do **not** compute a delta like `T − D`. That was an earlier misreading of this API and it produces a
surcharge when the name happens to match: passing `−5` under `"Discount"` on a 15% template yields a −5%
surcharge, not 10% off.

One caveat that makes Step 6 mandatory: **the template's discount name cannot be read from
`templates_details_get`.** The template response carries `summary.discount` but leaves `items[].discounts`
empty — names only appear on created documents. `"Discount"` is the observed default and a sound first
guess, but it is a guess. Verify, then correct.

Whichever reading you applied, **say so in your output.**

### Step 4: Create the document

Call `documents_create`:

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
    "options": { "currency": "USD", "discount": { "name": "Discount", "type": "percent", "value": "<pass from Step 3>" } },
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

Two things that will otherwise cost you a round trip:

- **`options` is required on every row**, even though the schema marks it optional. Omitting it returns
  `400 validation_error` with `{"rows": [{"options": ["This field is required."]}]}`.
- Always set `delivery_methods` to email-only unless a phone number was supplied, or sending later fails
  with `A phone number is required`.

### Step 5: Wait for draft

`documents_create` returns status `Uploaded`. Poll `documents_status_get` until it reads `Draft`. Usually
one or two calls.

Be aware that `Draft` does **not** guarantee the document is ready for a status transition — see Step 7.

### Step 6: Verify the numbers — do not skip this

Call `documents_details_get` and check, before showing the user anything:

1. **The effective discount matches what the user asked for.** Compute
   `summary.discount / summary.subtotal` and compare against `T`. A **negative** `summary.discount` means
   you produced a surcharge — the name did not behave as expected. Either way, if it does not match,
   correct it with `documents_update` passing the target value directly, then re-read and check again.
   Never report a figure you have not verified.
2. **Every line item is present** with the right `qty` and `price`, and `subtotal` per row is what you
   expect.
3. **No row you intended to count has `options.optional_selected: false`.** If one does, its subtotal is
   excluded from the total.
4. **Read the value from `pricing.total`**, never `grand_total`.
5. **Currency** comes from `pricing.tables[].currency`.

Verifying the result rather than trusting the request is deliberate, and it has already earned its place:
the first version of this skill computed a delta on the assumption that discounts always add, and a live
run produced a 5% **surcharge** instead of a 10% discount. The verification step caught it and the
correction landed on the right number. Keep this step even if the composition rules change — it is correct
under any of them.

### Step 7: Confirm, then send

Show the user the numbers you verified — subtotal, discount as a percentage and an amount, total,
currency — plus which template and which discount reading you used. Then ask:

> Ready to send **"\<name\>"** to **\<email\>**? Subtotal \<X\>, \<T\>% discount, total \<Y\> \<currency\>.

Only on an explicit yes, call `documents_send` with a `subject` and short `message`.

If it returns `409 The document isn't ready for a status transition yet`, wait a moment and retry once.
This happens even when `documents_status_get` already reported `Draft` — it is a known race, not an error
in your input.

If it returns `400 Not all signature, initials fields were assigned`, a signing role has no recipient.
Read `roles[]` again, add the missing recipient with `documents_update`, then retry.

If the user does not want it sent, leave it as a draft and give them the link:
`https://app.pandadoc.com/a/#/documents/<document_id>`

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

### The total does not match what I calculated

Check for optional rows. A row with `options.optional_selected: false` is excluded from
`summary.subtotal`. Also confirm you are reading `pricing.total` and not `grand_total`.

### The discount came out higher than requested

Your `discount.name` did not match the template's, so yours was appended rather than replacing it.
Re-issue with `name: "Discount"`, or correct the document with `documents_update` passing the target value
directly.

### The discount came out negative — the total is higher than the subtotal

You passed a negative value under a name that replaced the template's discount, so it became a surcharge.
Pass the target percentage as a positive number instead. Never pass a computed delta.

### `PANDADOC_API_RESPONSE_INVALID` on the template or the document

That template's data cannot be serialised by the API. It affects both the template and every document
created from it, though creation itself succeeds. Use a different template and report the broken one.

### `400 validation_error` mentioning `options`

Every pricing row needs an `options` object, even an effectively empty one. The schema says it is
optional; the API disagrees.

### `grand_total` shows 0

Expected. It does not reflect the pricing table. Use `pricing.total`.

### `409` on send

The document is still settling after creation. Retry once. Do not loop.
