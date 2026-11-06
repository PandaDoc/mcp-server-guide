---
name: pandadoc-transcript-proposal
category: sales
roles: [sales, bizops, owner]
complexity: advanced
prerequisites: [PandaDoc]
description: Turn pasted meeting notes or a call transcript into a draft PandaDoc proposal — extract the deal context, pick a workspace template, prefill its fields and pricing (Quote block or classic pricing table), verify what actually landed, and hand back the draft with a list of anything missing or uncertain. Never sends. Use when someone wants a proposal built from call notes or a transcript.
tags: [pandadoc, proposals, transcripts, pricing, drafts, sales]
version: "0.1.0"
metadata:
  visibility: public
---

# PandaDoc Transcript to Proposal

Turn "here are my notes from the Acme call, build the proposal" into a real PandaDoc draft built from a
workspace template, with the deal's values prefilled and checked, ready for the user to review.

**This skill stops at a draft. It never sends.** The user reviews the document in PandaDoc and sends it
themselves, or asks for that separately.

Two things make this harder than it looks. A transcript is not a form: values are scattered, hedged and
sometimes contradicted later in the call. And **the API accepts most mistakes silently** — wrong field keys,
ignored pricing, stacked discounts, dropped line items all come back as success. So extraction has to be
honest about what was actually said, and every value has to be read back from the created document before
you report it.

Templates price through a **Quote block** (the usual case) or a **classic pricing table**. They are filled
differently, and Step 4 tells you which one you have.

---

## Prerequisites

The PandaDoc MCP Server must be connected. Required tools: `PandaDoc:templates_list`,
`PandaDoc:templates_details_get`, `PandaDoc:documents_create`, `PandaDoc:documents_status_get`,
`PandaDoc:documents_details_get`, `PandaDoc:quotes_update`, `PandaDoc:documents_update`. If they are
missing, tell the user the MCP Server is not connected and point them at <https://mcp.pandadoc.com>.

If only `PandaDoc:quotes_update` is missing, classic-table templates still work. On a Quote-block template,
create the draft without pricing and say on the hand-back list that the pricing could not be filled.

The workspace needs a proposal template that was **added to the workspace** (in PandaDoc, "Use template"
on a gallery template, or a template built in the workspace) and that has **merge fields** configured, not
only signature fields. Without merge fields there is nothing to prefill.

---

## What the user provides

Pasted meeting notes or a transcript, and optionally which template to use. The transcript source (Gong,
Granola, read.ai, a notes app) does not matter — the user pastes the text.

---

## Workflow

### Step 1: Extract the deal context

Read the whole text before extracting anything — a price or discount said early is often revised later in
the call. Take the **last agreed** value, and when the text contradicts itself without settling it, mark the
value ambiguous rather than picking one.

Extract:

- **Counterparty** — company name.
- **Contacts** — names, titles and emails of the people on the client side who will sign or review.
- **Scope** — products, services, deliverables.
- **Pricing** — line items with unit price and quantity, the currency, and any discount.
- **Dates** — start date, term length, validity of the offer.
- **Terms** — payment terms, renewal, anything else explicitly agreed.

Rules for extraction:

- **Never invent a value.** Not an email built from a name and a domain (`john@acme.com` because John works
  at Acme), not a price "in line with" what was discussed, not a default term length. A plausible value in
  a proposal is worse than a blank one, because it can be signed.
- **Only explicit numbers are prices.** "Around 50k", "somewhere between 40 and 60", "we'll firm up pricing
  next week" are not prices. Record them as ambiguous and leave the pricing out.
- **A discount in the transcript is the client's final discount.** "We agreed 10% off" means the client pays
  10% less overall, not 10% on top of whatever the template already carries. Say in your output that you
  read it this way.
- **Keep internal people out of the recipients.** Your own side (the user, their colleagues) appears in the
  transcript too. Only the client side are recipients.

Show the user the extracted values in a short list, each marked as **from the transcript** or **missing /
ambiguous**.

### Step 2: Collect signer emails before anything is created

Every client-side signer needs an email **before** `PandaDoc:documents_create`. This is a hard rule, not a
preference: a recipient added later with `PandaDoc:documents_update` loses its role and comes back as CC
with no signature fields, and the recipient list cannot be replaced after creation. So a signer you skip
now cannot be fixed on the draft — the document has to be recreated.

If a signer's email is not in the text, ask for it. Do not invent one, and do not create the document
without it.

**Do not add the user (the sender) as a recipient by guessing their email.** The MCP has no way to look up
the current PandaDoc user, and the email the chat client knows can differ from their PandaDoc account.

A sender-side role with signature fields needs a recipient too, **even when the template preassigns it to
`"type": "document sender"`**: a document created through the API leaves that role's fields unassigned, and
it cannot be fixed afterwards for the same reason as above. So if the template has such a role (check in
Step 4), ask the user for the PandaDoc email to sign as, and pass them in `recipients` under that role in
the same `PandaDoc:documents_create` call. If they would rather not, create the draft without it and list
the unassigned sender fields on the hand-back.

### Step 3: Find the template

Call `PandaDoc:templates_list` with `q` set to the document type ("proposal", or the template name the
user gave) and `count: 10`.

`q` is **not** a name substring match — it is fuzzy, and a search can return templates whose names share
nothing with the query. So:

- **One plausible match:** name it and its ID, and say you are using it.
- **Several plausible matches:** list name and ID and ask. Never guess — the wrong template means the wrong
  terms and the wrong prices.
- **No plausible match:** say the workspace has no proposal template and stop. Explain that one has to be
  added in PandaDoc first ("Use template" on a gallery template, or build one), with merge fields for the
  values to prefill.

**Do not fall back to a markdown or file document.** A markdown-created document comes back with
`fields: []` and its recipient silently downgraded to CC, so nobody can sign it, and any pricing typed into
it is inert text with no total. Producing one is the worst available outcome: it looks like a proposal and
is not one.

### Step 4: Read the template

Call `PandaDoc:templates_details_get` on the chosen ID. You need four things.

**Roles.** `roles[]` — the exact role names, and which have a `preassigned_person`. Each role without one
needs a recipient from Step 2, and so does a role preassigned to `"document sender"` that has signature
fields (Step 2 explains why). If you only learn about such a role here, ask before creating.

**Fields.** `fields[]` — split them by `merge_field` before you promise anything:

- **`merge_field` non-null** — prefillable. The merge name is the only valid key.
- **`merge_field: null`** — not prefillable by any means. `field_id`, `uuid` and `name` are silently ignored
  by `PandaDoc:documents_create`, so nothing you pass will land. These go on the hand-back list as "not
  prefillable: add a merge field to the template in PandaDoc, or fill it by hand".

Skip `signature` and `initials` fields — they are always the signer's. One merge name fills every field that
shares it with the same value, so two values that need to differ cannot share a merge field.

**Tokens.** `tokens[]` — template variables like `Client.Company`. Recipient tokens (`Client.FirstName`,
`Client.LastName`, `Sender.*`) fill themselves from `recipients`; pass explicitly only those the recipient
record does not cover.

**Pricing.** Check `pricing.tables` and `pricing.quotes` — the cases look alike and are not:

| `pricing.tables` | `pricing.quotes` | Pricing path |
| --- | --- | --- |
| empty | populated | **Quote block** — create without pricing, then fill with `PandaDoc:quotes_update` (Step 7) |
| populated | any | **Classic pricing table** — pricing goes into `PandaDoc:documents_create` (Step 6) |
| empty | empty | **No pricing block.** If the transcript has pricing, say so on the hand-back list |

For a classic table, note its exact `name` (pricing is matched by name, not position). For a Quote block,
the template does not reliably expose its discount or the discount's name; you read both from the created
document in Step 7.

**Currency is fixed by the template** — `pricing.quotes[].currency` or `pricing.tables[].currency`. If the
transcript's currency differs, **do not convert the amounts** and do not write them into the template's
currency. Leave pricing out, and flag the mismatch on the hand-back list. On a classic table a mismatched
currency makes the creation fail: `PandaDoc:documents_create` accepts the request and returns `Uploaded`,
and only the status poll then returns HTTP 400 (the API's message is `Wrong request currency … mismatch
template currency`, but the MCP may show no detail). `PandaDoc:documents_update` silently keeps the old
currency. `PandaDoc:quotes_update` has a `currency` field,
but whether it re-denominates a quote is not verified, so do not use it to change currency.

If `PandaDoc:templates_details_get` fails with `PANDADOC_API_RESPONSE_INVALID` or "PandaDoc returned data
in an unexpected format", that template cannot be read or verified through the API. Stop and ask for
another one.

### Step 5: Map values to the template

Match each extracted value to a merge field, token or pricing line by meaning, not by exact name: a field
named `Company Name` takes the counterparty, `Start Date` takes the start date. When a match is not clear,
leave it out and list it as ambiguous — a value in the wrong field is worse than a blank one.

Values with no field to go into (a renewal term, an expiry the template has no field for) go on the
hand-back list as "in the transcript, no field on the template". The offer's validity in particular cannot
be set as the document's expiration through this skill; if the template has no field for it, list it.

**The discount name decides whether the transcript's discount replaces the template's or stacks on it.**
It is a key, not a label. Under the template's own name it **replaces** that discount; under a new name it
is **added** (10% under a new name on a 15% template gives 25% on a classic table, and 23.5% when a Quote
block's 15% sits on a section and the new 10% on the quote). Since the transcript's discount is the final
one (Step 1), always pass it under the template's own name. **Never compute a delta** like
`transcript − template`: under the matching name it becomes a surcharge (`−5` on a 15% template gives a 5%
surcharge, not 10% off).

### Step 6: Create the draft

**Stop before this call if a role still has no recipient.** Check every role from Step 4: each one without
a `preassigned_person` needs a recipient, and so does a role preassigned to `"type": "document sender"`
whose fields include a signature or initials field. For the sender role, ask the user for the PandaDoc
email to sign as and wait for the answer; create without it only if they say so. This cannot be fixed
after creation (Step 2), so the question comes now, not on the hand-back list.

Call `PandaDoc:documents_create`:

```json
{
  "source": "template",
  "template_uuid": "<from Step 3>",
  "name": "Proposal - <Counterparty> - <YYYY-MM-DD>",
  "recipients": [
    { "email": "<email>", "first_name": "<first>", "last_name": "<last>",
      "role": "<exact role name from Step 4>",
      "delivery_methods": { "email": true, "sms": false } }
  ],
  "fields": { "<merge_field>": { "value": "<value>" } },
  "tokens": [{ "name": "Client.Company", "value": "<Counterparty>" }]
}
```

**Quote block: never pass `pricing_tables`.** It is accepted and **silently ignored**, leaving a document
with `total: "0"` that looks finished. A quote can only be filled after creation, in Step 7.

**Classic pricing table:** add `pricing_tables`, with the transcript's discount under
`discount.name: "Discount"` — the template's usual name, which replaces its discount. The template's
discount name cannot be read from `PandaDoc:templates_details_get`, so `"Discount"` is a sound first guess,
not a certainty; Step 8 verifies it.

```json
"pricing_tables": [{
  "name": "<exact table name from Step 4>",
  "options": { "currency": "<template currency>", "discount": { "name": "Discount", "type": "percent", "value": "<transcript discount>" } },
  "sections": [{
    "title": "Products", "default": true,
    "rows": [{
      "data": { "name": "<item>", "price": <unit price>, "qty": <quantity> },
      "options": { "optional": false, "optional_selected": false, "qty_editable": false }
    }]
  }]
}]
```

The schema disagrees with the API here: **`options` is required on every row** and **`default` on every
section**, though the schema marks them optional, and missing either returns `400 validation_error`. **Row
keys are lowercase only:** `name`, `price`, `qty`.

Leave out pricing entirely for a currency mismatch or a transcript with no explicit prices.

If it fails with `400 Template is not available`, nothing can be created from that template in the
workspace the connector is on, even though `PandaDoc:templates_details_get` can read it. Two causes, and
the user has to fix either one in PandaDoc:

- **The template is only in the gallery.** Open it in PandaDoc, click "Use template", then run this again.
- **The connector is on another workspace**, or the user has Member rather than Manager access to it. The
  connector works in the one workspace that was active when it was connected. Switch workspace and
  reconnect, then run this again.

Name both causes, stop, and do not retry with another template without asking.

`PandaDoc:documents_create` returns status `Uploaded`. Poll `PandaDoc:documents_status_get` until it reads
`Draft` — usually one or two calls. The draft now exists, so from here on say so and that nothing has been
sent.

**`Uploaded` does not mean the creation succeeded.** If the status poll returns an error (an HTTP 400,
often with no detail), the creation failed and there is no draft. That is terminal: stop polling, do not
call any other tool on that document id, and tell the user no draft was created. The most likely cause is a
currency mismatch in `pricing_tables` (Step 4).

### Step 7: Fill the Quote block

Skip this step for a classic table, or when there is no pricing to apply.

Call `PandaDoc:documents_details_get` and take, from `pricing.quotes`: the quote `id`, each section `id`,
each existing item `id`, and the existing discounts from the quote `summary.discounts` **and** each
section's `summary.discounts` — each one's **name**, value and the level it sits on. A template's own
discount has been seen on a section, so check both. Read the ids from the document, not the template: a
created document gets its own quote `id`. If `pricing.quotes` holds no quote, say the template has no usable
quote and leave the pricing for the hand-back list; a quote cannot be created through
`PandaDoc:quotes_update`.

Then call `PandaDoc:quotes_update`. The example is for a template with no discount of its own. When the
template's discount sits on a section, put the `summary` block inside that section instead (see below):

```json
{
  "document_id": "<document id>",
  "quotes": [{
    "id": "<quote id>",
    "quote": {
      "summary": { "discounts": { "Discount": { "type": "percent", "value": <transcript discount as a number> } } },
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

Things that otherwise cost a round trip or a silently wrong quote:

- **`PandaDoc:quotes_update` is a destructive replace, not a merge.** `sections` replaces the quote's whole
  section list and `items` replaces a section's whole item list: any section or item whose `id` you leave
  out is **removed**, and the call still returns `ok`. Send every section the quote should end with, under
  its existing `id`. Quote templates ship with empty placeholder items; sending your own `items` is what
  removes them, which is what you want.
- **Send the discount where the template's discount lives, under its name.** If the template's discount
  sits on a section, put the transcript's value under that same name in that section's
  `summary.discounts` — sending it on the quote `summary` instead adds a second discount. If the template
  has no discount, put it on the quote `summary` under `"Discount"`. To neutralise a discount you do not
  want, send its name with `value: 0`; passing `{}` does not clear the map.
- **A discount is `{ "type": "percent" | "flat", "value": <number> }`.** `value` is a JSON number, not a
  string.
- **`options` is all-or-nothing:** give `qty_editable`, `selected` and `optional` together. Quote rows use
  `selected`, not the classic `optional_selected`.
- **Every result is per quote.** `ok` carries the state after the update. `conflict`: re-read and retry.
  `not_in_document`: the id is wrong or the account cannot edit quotes. `internal_error`: retry once.
  Anything else is a failed update — leave the pricing for the hand-back list.

### Step 8: Read back and verify

Call `PandaDoc:documents_details_get` and check, before showing the user anything. An `ok` from an update
call is not verification.

1. **Every field you prefilled has `is_filled: true` and the value you passed.** A key that matched no merge
   field is dropped without an error; only this read-back shows it. A field that came back empty goes on
   the hand-back list — do not report it as filled.
2. **Tokens you passed** read back with your values in `tokens[]`.
3. **Recipients** — each signer is present with the right role and `recipient_type` signer, not CC.
   Then look for `signature` and `initials` fields whose `assigned_to.id` is empty. They usually belong to
   a sender-side role that got no recipient (Step 2), and they will block sending later. Never add the
   sender by guessing an email; put them on the hand-back list. The fix is to recreate the draft with the
   sender in `recipients`, since a recipient added afterwards comes back as CC.
4. **Pricing**, when you applied it:
   - **Every line item is present** with the right `qty` and `price`, and no row you meant to count is
     unselected (`options.selected: false` on a Quote block, `options.optional_selected: false` on a
     classic table) — an unselected row is excluded from the total but still shows on the document.
   - **The effective discount matches the transcript's.** On a Quote block the quote `summary.subtotal`
     has been seen reading `"0"` on some templates and correctly on others, so take the subtotal as the
     sum of the selected line items' `total`, and compute `(subtotal − pricing.total) / subtotal`. Do not
     sum the sections' `total`: a section total is after that section's discount, so with the discount on
     the section (the replace case in Step 7) a correct 10% would read as 0%. On a classic table use
     `summary.discount / summary.subtotal`. A higher figure means the discount stacked; a negative one is a
     surcharge.
   - **Read the deal value from `pricing.total`. Never from `grand_total`** — it has been observed as `0`,
     in another currency, on correctly priced documents.
   - **Compare `pricing.total` with the total you expect from the transcript**, not just against zero. A
     zero total on a document you priced is a failure, whatever the update returned, and so is a total
     that still equals the template's own sample pricing: Quote templates ship with placeholder or sample
     rows, so an unpriced draft can read `0`, `10` or a plausible figure such as `148.98`.
   - **A gap of one cent is a pass.** A percentage discount can leave a third decimal (`224.046` against an
     expected `224.05`); compare to the cent, and treat anything larger as a mismatch.

**If a pricing check fails, correct it once and read back again.** On a Quote block, call
`PandaDoc:quotes_update` again with the full section list, the template discount's name at its level and
the transcript's value, and any extra name at `value: 0`. On a classic table, call
`PandaDoc:documents_update` with the transcript's percentage under the name the read-back shows. If the
correction errors or the second read-back still fails, **stop retrying**: the API has been observed to drop
a discount and then fail every update with a server error. Leave the draft as it is and put the mismatch on
the hand-back list with the manual fix — set it in the PandaDoc editor.

Never report a number you have not read back from the document.

### Step 9: Hand back the draft

Do not send. Do not offer to send in the same breath as handing back the draft — the user is meant to
review it first.

Give the user:

- **The draft** — its name, the template used, and the link
  `https://app.pandadoc.com/a/#/documents/<document_id>`.
- **What was prefilled** — the fields, recipients and roles, as read back.
- **Pricing**, when it was applied — subtotal, discount as a percentage and an amount, total and currency,
  all as read back, plus how you read the discount ("10% overall, replacing the template's 15%"). When the
  quote `summary` has a `recurring_subtotal`, `pricing.total` adds one-time and recurring amounts into one
  figure, so also give the one-time and the per-cycle amounts separately ("$99 one-time plus $149.94 per
  month, before the discount").
- **What needs attention**, one line each. Each line names the item, its value from the notes when there is
  one, and why it needs attention ("Start date 2026-12-01: no field on the template, add it by hand"):
  - missing from the transcript (and not supplied by the user)
  - ambiguous in the transcript (say what the conflict was)
  - not prefillable (`merge_field: null`), or prefilled but came back empty
  - signature fields with no recipient (usually the sender's), which must be assigned before sending
  - in the transcript but with no field on the template
  - pricing not applied, and why (currency mismatch, no explicit prices, no pricing block, Quote block
    could not be updated, discount mismatch after the correction)

If nothing needs attention, say so plainly rather than leaving the list out.

---

## Usage examples

```txt
@pandadoc-transcript-proposal — here are my notes from today's call with Acme, build the proposal from our
standard proposal template:

<pasted transcript>
```

```txt
@pandadoc-transcript-proposal — draft a proposal from this Granola transcript. Their CFO
jane.doe@globex.example.com signs.

<pasted transcript>
```

---

## Troubleshooting

### `400 Template is not available`

Either the template is a gallery template, not added to the workspace — open it in PandaDoc, click "Use
template", and run the skill again on the workspace copy — or the connector is on a different workspace, or
on one where the user has only Member access. Switch to the right workspace and reconnect.

### A field I passed is empty on the document

Check `merge_field` on that field. If it is `null`, no key can fill it — add a merge field to the template
in the PandaDoc editor, or fill it by hand. If it is set, the key was wrong: use the merge name verbatim,
including spaces and punctuation.

### A Quote document shows `total: "0"`

Either `pricing_tables` was passed at creation, which Quote blocks ignore, or the quote update did not run
or did not land. Fill it with `PandaDoc:quotes_update` using the ids from `pricing.quotes`, then read it
back. Never report that document as priced.

### A line item disappeared after `quotes_update`

The update was sent without the ids of what was meant to stay, and the omitted ones were removed. Re-read
the document and re-send every section and item the quote should have.

### `quotes_update` returns `not_in_document`

The quote id is not on this document, or the account cannot edit quotes. Re-read `pricing.quotes` for the
right id. If it still fails, leave the pricing for the user to enter in PandaDoc.

### The discount came out higher than in the transcript

The discount name or level did not match the template's, so it stacked on top. Re-send it under the name
the read-back shows, at the level it lives, or set it in the PandaDoc editor.

### `Wrong request currency … mismatch template currency`, or HTTP 400 on the status poll

The transcript's currency differs from the template's, and the creation failed after `Uploaded`. Use a template in the transcript's currency. Never
convert the amounts.

### A signer shows up as CC

They were added after creation. Roles are set only at create time, so recreate the draft with every signer
in `recipients`.

### `grand_total` shows 0

Expected. Read `pricing.total`.
