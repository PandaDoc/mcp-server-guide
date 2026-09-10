---
name: pandadoc-onboarding-agreement
category: hr
roles: [hr, ops, owner]
complexity: intermediate
prerequisites: [PandaDoc]
description: Generate an onboarding or employment document from a template with the new joiner's details prefilled, make sure every field is assigned to them, then send for signature. Use when someone is onboarding a hire and needs paperwork issued.
tags: [pandadoc, hr, onboarding, employment, e-signature]
version: "0.1.0"
---

# PandaDoc Onboarding Agreement Generator

Issue a new joiner's paperwork with their details already filled in, and nothing left unassigned.

The difference from a plain send is **prefill**: HR templates carry many fields, and a document sent with
half of them blank puts the work back on the new hire.

---

## Prerequisites

The PandaDoc MCP Server must be connected. Required tools: `templates_list`, `templates_details_get`,
`documents_create`, `documents_status_get`, `documents_details_get`, `documents_fields_assign`,
`documents_update`, `documents_send`. If they are missing, say so and point at <https://mcp.pandadoc.com>.

---

## Handling personal data

These documents carry personal information — full names, national ID numbers, addresses, sometimes
compensation. Two habits:

- **Never reprint a national ID, PESEL, passport number, home address or salary figure in your replies.**
  Refer to it, do not restate it: "national ID — filled from the value you gave", "PESEL — received, will
  go in `Text2`". The user typed the number; they do not need it read back, and this transcript gets
  logged, pasted into tickets and shared. One mention in their message is unavoidable, a second one is
  yours to prevent.

  The easy place to slip is the field inventory in Step 2 and the summary in Step 6, where listing
  field-and-value feels like diligence. `Text2 — can use 85******345 (ID)` is the mistake; write
  `Text2 — national ID, from your message` instead. This holds even when you are only asking about
  something else, such as a missing date.

  Masking is fine when a value genuinely has to be identified — `85******345` — but naming the field is
  usually enough.
- **Never invent a value for a personal field.** If a national ID, address or start date is missing, ask.
  A plausible-looking placeholder in an employment document is far worse than an unfilled field, because it
  can be signed.

---

## Workflow

### Step 1: Find the template

`templates_list` with `q` set to the document type — "onboarding", "employment", "offer", or whatever the
user said. `q` is **not** a name substring match, so a single hit is not proof of a correct match. HR
libraries in particular tend to hold near-duplicates: per contract type, per signer, per country.

- **One plausible match:** name it and its ID, say you are using it.
- **Several:** list them and ask. The wrong variant means the wrong legal terms for that contract type.
- **Nothing plausible:** say the workspace has no such template. **Do not generate one** — a
  markdown-created document has `fields: []` and its recipient is silently downgraded to
  `recipient_type: "CC"`, so nobody can sign it.

### Step 2: Read the template's fields and roles

`templates_details_get`. You need:

- **`roles[]`** — usually one signing role for HR paperwork (`Employee` is common), but check. Note any
  `preassigned_person`.
- **`fields[]`** — every field, its `type` (`text`, `date`, `signature`, …), which role it is `assigned_to`,
  and above all its **`merge_field`**. That last one decides everything below.
- **`tokens[]`** — template variables on the `Client.*` / `Sender.*` convention, separate from fields.

**Only a field with a non-null `merge_field` can be prefilled through the API.** A field object carries four
identifiers — `uuid`, `name`, `field_id`, `merge_field` — and only the last one is a valid key for `fields`.
The other three are rejected: `field_id` and `name` are dropped silently by `documents_create` and produce
`400 There are no such fields in the document` from `documents_update`. Verified against
`8q5FqeodqheYCQBCBBBqCW` on 2026-08-06.

So split `fields[]` in two before you promise anything:

- **`merge_field` non-null** — prefillable. The merge name is the key.
- **`merge_field: null`** — not prefillable by any means. Nothing you pass will land. The recipient fills it
  by hand after they open the document, or the template gets merge fields added in the PandaDoc editor.

If every field you needed falls in the second group, **say so before creating anything**. Several HR
templates in this workspace are built that way (`7gocasE6Tr2GdSqae2HtwT`,
`riFxJ8qcGRpGJiukZVVBPc` — all fields `merge_field: null`, all named `Text`), and on those the prefill this
skill exists to do is simply not available. Offer the two real options — add merge fields to the template,
or send it blank for the joiner to complete — and let the user choose. Do not create an empty document and
present it as prefilled paperwork.

Watch for a second trap: **one merge name fills every field that shares it, with the same value.** If name,
ID and city all sit behind one merge field, they cannot hold three different values, and the template needs
three distinct merge names before this skill can do its job.

**Do not ask the user for values the signer supplies.** Use this to decide what to ask for upfront. It is a
hint for the question, not the send gate — the gate is the `is_filled` check in Step 5.

- `signature` and `initials` fields are always the signer's. Never prefill them, never ask for them.
- Other fields (`text`, `date`, dropdowns) are usually the employer's to fill: name, national ID, address,
  start date, department. A bare `date` on the signing role is often the sign date, but do not assume — an
  empty one is surfaced in Step 5 and the user decides then.

Ask the user for the employer-owned values you do not have. Do not block on a field whose owner is unclear:
prefill what you can and let Step 5 catch whatever is still empty.

List for the user what you can prefill and what you need from them, and ask for the missing values in one
go rather than one at a time. When you write that list, name the field and its source — "national ID, from
the value you gave" — rather than reprinting the value itself. See *Handling personal data*.

If something you genuinely need is missing, ask — but weigh it against what the user asked for. When they
wanted a draft, or said not to send yet, create the document with what you have and put the question next
to the draft link. A question on its own, with no document, is not what they asked for.

### Step 3: Create with everything you can prefill

`documents_create` from the template, passing:

- `recipients` — the joiner, with `email`, `first_name`, `last_name`, the **exact** role name from Step 2,
  and `delivery_methods: {email: true, sms: false}`
- `fields` — a map of **`merge_field`** to `{value: …}`, for the prefillable fields identified in Step 2
- `tokens` — any template variables, as `[{name, value}]`

Keys are merge names, not `field_id`, not `uuid`, not the `name` attribute. A key that matches nothing is
silently ignored rather than rejected, which is why Step 5 exists.

Recipient tokens fill themselves: passing `recipients` populates `Client.FirstName`, `Client.LastName`,
`Sender.*` and `Document.CreatedDate` without your listing them. Pass explicitly only the ones that carry
values the recipient record does not, such as `Client.Company`.

Poll `documents_status_get` until `Draft`.

### Step 4: Assign anything left unassigned

`documents_details_get` and check `fields[]`. Any field whose `assigned_to.id` is empty belongs to a role
with no recipient and will block sending.

Fix with `documents_fields_assign`, passing the field UUIDs and the recipient. Note this tool **assigns
existing fields only** — it cannot create fields, so if the template lacks a field you need, the template has
to change in PandaDoc.

### Step 5: Verify the prefill, and list every empty data field

Still in `documents_details_get`, walk `fields[]` and confirm:

1. **Every field you intended to prefill has `is_filled: true` and the value you passed.** A key that
   matched no merge field is dropped silently — the create call succeeds and the field stays empty. This is
   the most common failure and nothing surfaces it but a read-back.

   If a field came back empty, do not assume a typo and retry with a different key. Check `merge_field` on
   that field first: when it is `null`, no key exists and retrying cannot work. Say the field is not
   API-fillable and leave it for the empty-fields list below.
2. **Every `signature` and `initials` field has a non-empty `assigned_to.id`**, or `documents_send` rejects
   the document with `Not all signature, initials fields were assigned`.
3. **No recipient has `sms: true` without a phone number.**

Then build the send gate. This is a hard rule, not a judgement call, and it fails safe — treat a field as
empty unless `is_filled` is explicitly `true`:

> Collect every field where `type` is not `signature` or `initials` **and** `is_filled` is not `true`.

That is the list of empty data fields. Some may be fine to leave for the signer, some may be values the
employer should have supplied — MCP does not mark which, so do not guess. Every field on this list must be
resolved in Step 6 before the document can be sent: the user supplies a value or explicitly waives it. An
empty data field never leaves silently.

### Step 6: Resolve empty fields, confirm, then send

If the empty-data-field list from Step 5 is not empty, do not offer to send yet. Show it and ask the user
to clear it. Name each field; do not reprint values (see *Handling personal data*):

> Before I can send, these fields are empty: `Salary`, `Start Date`. For each, give me a value or tell me to
> leave it for the signer to fill.

Apply supplied values with `documents_update` (merge names as keys), re-read `documents_details_get`, and
rebuild the list. One exception: a field with `merge_field: null` cannot be filled through the API at all
(`documents_update` returns `400 There are no such fields in the document`), so a value the user gives for
it cannot land — it can only be waived, and the joiner fills it by hand after opening the document. A field
the user fills must now read `is_filled: true`; a waived field comes off the list. Only when every field on
the list is filled or waived do you offer to send.

Then show the document name, the recipient and role, the count prefilled, and the fields being left blank on
purpose. Ask:

> Ready to send **"\<name\>"** to **\<email\>**? \<N\> fields prefilled, \<W\> left blank by your choice
> (\<field names\>), plus the signer's own fields (signature, and any others assigned to them).

Only on an explicit yes, `documents_send` with a `subject` and short `message`. Retry once on `409 The
document isn't ready for a status transition yet`.

**A yes has to come from the user.** Not from your own reasoning that sending is obviously what they
wanted, not from restating the question and answering it yourself. If no reply arrives, the answer is not
yes — leave the document as a draft, hand over the link, and say it is waiting on their go-ahead. That is
a complete outcome, not a failure to finish. Employment paperwork landing in a new hire's inbox before
anyone approved it is the worse error by a wide margin, and a draft costs nothing. The same applies
whenever the user said not to send.

Report the outcome with the link `https://app.pandadoc.com/a/#/documents/<document_id>`.

---

## Usage examples

```txt
@pandadoc-onboarding-agreement — onboarding paperwork for Anna Kowalska starting 1 September, send to
anna.kowalska@example.com
```

```txt
@pandadoc-onboarding-agreement — remote work application for Dzmitry, he's on an indefinite contract
```

---

## Troubleshooting

### A field I supplied is empty on the document

Read `merge_field` on that field before doing anything else. It decides which of two different problems you
have, and they have different fixes.

- **`merge_field` is null.** The field is not addressable by the API at all. No key works — `field_id`,
  `uuid` and `name` are all rejected, and `documents_update` answers
  `400 There are no such fields in the document: <what you passed>`. Retrying with another key wastes the
  user's time. Tell them the template needs a merge field added in the PandaDoc editor, or that the joiner
  fills this one by hand.
- **`merge_field` is set but the value did not land.** Then the key really was wrong. Use the merge name
  verbatim, including spaces and punctuation — merge names like `MM / DD / YYYY` are common — and set it
  with `documents_update`.

### Two fields need different values but share one merge field

Not possible. A merge name addresses every field carrying it and writes the same value to all of them. The
template has to give those fields distinct merge names. Say so rather than filling one and leaving the other
wrong.

### `400 Not all signature, initials fields were assigned`

A signature field has an empty `assigned_to`. Assign it with `documents_fields_assign`, or add the missing
recipient with `documents_update` if a whole role is unrepresented.

### `documents_fields_assign` will not create the field I need

It only assigns existing fields. Add the field to the template in PandaDoc.

### Several near-identical templates

Normal for HR libraries — variants per contract type, per signer, per country. Ask rather than guessing; the
distinction is usually legal, not cosmetic.

### `A phone number is required`

The recipient defaulted to SMS delivery. `documents_update` with
`delivery_methods: {email: true, sms: false}`.

### `409` on send

Known race even after `Draft`. Retry once, do not loop.
