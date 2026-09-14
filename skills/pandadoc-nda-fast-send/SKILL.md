---
name: pandadoc-nda-fast-send
category: legal
roles: [sales, bizops, legal, owner]
complexity: intermediate
prerequisites: [PandaDoc]
description: Send a standard NDA to a counterparty in one motion — find the right NDA template, prefill the counterparty, make sure every signature is assigned, confirm, then send. Use when someone wants an NDA, mutual NDA or confidentiality agreement issued.
tags: [pandadoc, nda, confidentiality, e-signature, legal]
version: "0.1.0"
---

# PandaDoc NDA Fast-Send

Turn "NDA for Acme, send to `legal@acme.com`" into a sent NDA, without the two failures that make a naive
attempt fail: picking the wrong template, and leaving a signature unassigned.

---

## Prerequisites

The PandaDoc MCP Server must be connected. Required tools: `templates_list`, `templates_details_get`,
`documents_create`, `documents_status_get`, `documents_details_get`, `documents_update`,
`documents_fields_assign`, `documents_send`. If they are missing, say the MCP Server is not connected
and point at <https://mcp.pandadoc.com>.

**An NDA template must exist in the workspace.** There is no way around this — see Step 1.

---

## What the user provides

- **Counterparty name** — required, for the document name and `Client.*` tokens.
- **Recipient email** — required. If missing, ask.
- **Who counter-signs on our side** — often unstated. Whether you need it depends on the template; see
  Step 3.
- **Deadline or context** — optional, used in the send message.

---

## Workflow

### Step 1: Find the NDA template — and stop if there is none

Call `templates_list` with `q: "NDA"` and `count: 10`. Then, because NDAs are also called other things,
try `q: "non-disclosure"` and `q: "confidentiality"` if the first returns nothing useful.

**`q` is not a name substring match.** A search for "NDA" has returned a template called
`Declaration H&S standards and regulations`. So:

- **One plausible match:** name it and its ID, and say you are using it. Do not assume it is right just
  because it was the only hit.
- **Several:** list them and ask. Sending the wrong agreement to a counterparty is not a recoverable
  mistake.
- **Nothing plausible:** say plainly that the workspace has no NDA template and that one needs creating in
  PandaDoc first. **Do not improvise one.** A generated document cannot be signed — `documents_create` with
  `source: "markdown"` produces `fields: []` and silently downgrades the recipient to `recipient_type:
  "CC"`, so what you would hand over is an NDA-shaped document nobody can sign. That is worse than saying
  no.

Also refuse to proceed on a template that reads back as unusable: a public gallery template can answer
`templates_details_get` in full and still fail `documents_create` with `400 Template is not available.`

### Step 2: Read the template

Call `templates_details_get`. You need:

- **`roles[]`** — every signing role and its exact name. There is no guaranteed "Signer"; the counterparty
  role may be `Client`, `Recipient`, `Counterparty` or anything the author chose. Guessing drops the
  recipient silently.
- **`preassigned_person` per role** — a role with this set fills itself. A role with `null` needs an
  explicit recipient.
- **`tokens[]`** — usually `Client.Company`, `Client.FirstName`, `Client.LastName`, sometimes
  `Sender.Company`.

### Step 3: Work out the recipients

Count the signing roles that have no `preassigned_person`:

- **One** — the counterparty email is enough. Proceed.
- **Two or more** — you need a distinct email for each. The same address cannot occupy two roles; the API
  returns `already in recipients list`. So ask: *"This template also has a `<RoleName>` signature block —
  who signs on our side?"* Do not silently assign both roles to the counterparty, and do not collapse them
  onto one person unless the user explicitly says this is a test or a self-sign.

  **Do not stop the turn on this question.** A missing counter-signer blocks *sending*, not *drafting* —
  the two are not the same gate, and asking is never a reason to skip Step 4. In the same response,
  proceed straight to Step 4 and create the document with the recipients you already have, then ask the
  role question **alongside** the draft link, not instead of it. This applies whenever the user asked for
  a draft, said "don't send yet", or "let me look first" — they want a document in front of them, and
  replying with only a question leaves them with nothing to look at, which is the one thing they asked for.
  The sole exception is a request to send outright: there the counter-signer answer has to come back before
  anything else happens, because the send cannot proceed either way.

Note that a template converted from a document in the PandaDoc UI **loses `preassigned_person`**, so a
template that looks like it should self-fill our side may not.

### Step 4: Create

```json
{
  "source": "template",
  "template_uuid": "<from Step 1>",
  "name": "NDA - <Counterparty> - <YYYY-MM-DD>",
  "recipients": [
    { "email": "<counterparty email>", "first_name": "<first>", "last_name": "<last>",
      "role": "<exact role name from Step 2>",
      "delivery_methods": { "email": true, "sms": false } }
  ],
  "tokens": [{ "name": "Client.Company", "value": "<Counterparty>" }]
}
```

Use the **exact** role names read in Step 2, never a guessed "Signer". Always set `delivery_methods` to
email-only unless a phone number was given, or send fails with `A phone number is required`.

### Step 5: Wait for draft

Poll `documents_status_get` until it reads `Draft`. `documents_create` returns `Uploaded` first.

Be aware `Draft` does not guarantee sendability — see Step 7.

### Step 6: Check every signature is assigned — before sending

Call `documents_details_get` and verify:

1. **Every `signature` and `initials` field has a non-empty `assigned_to.id`.** An empty one belongs to a
   role with no recipient, and `documents_send` will reject the whole document. If you find one, resolve it
   per Step 3 — add the missing recipient with `documents_update`, or for a confirmed self-sign reassign
   those field UUIDs with `documents_fields_assign`.
2. **No recipient has `sms: true` without a phone number.** Fix with `documents_update` if so.
3. The counterparty name landed in the tokens you set.

This step is what turns three failed send attempts into one clean send. Do not skip it because the create
call succeeded — creation succeeding says nothing about sendability.

### Step 7: Confirm, then send

Always confirm first. Show the template name, the document name, and every recipient with their role:

> Ready to send **"\<name\>"** to **\<email\>** as `<Role>`? *(and `<other@email>` as `<OtherRole>`)*

Only on an explicit yes, call `documents_send` with a `subject` and short `message` built from the user's
context.

**A yes has to come from the user.** Not from your own reasoning that sending is obviously what they
wanted, not from restating the question and answering it yourself. If no reply arrives, the answer is not
yes — leave the document as a draft, hand over the link
`https://app.pandadoc.com/a/#/documents/<document_id>`, and say it is waiting on their go-ahead. That is a
complete, correct outcome, not a failure to finish: an NDA reaching a counterparty's inbox cannot be
recalled, and a draft costs nothing. The same applies whenever the user said not to send — draft, link,
stop.

- `409 The document isn't ready for a status transition yet` — a known race even after `Draft`. Wait a
  moment and retry **once**. Do not loop.
- `400 Not all signature, initials fields were assigned` — Step 6 was skipped or a role is still empty. Go
  back rather than retrying blindly.

Then report what happened, with the link
`https://app.pandadoc.com/a/#/documents/<document_id>`.

---

## Usage examples

```txt
@pandadoc-nda-fast-send — send our standard NDA to legal@acme.com, they need it before Thursday's call
```

```txt
@pandadoc-nda-fast-send — mutual NDA for Globex to procurement@globex.com, I'll counter-sign as
serhii@ourco.com
```

---

## Troubleshooting

### `400 Not all signature, initials fields were assigned`

A signing role has no recipient. Read `roles[]` again, find the role whose signature field has an empty
`assigned_to`, add that recipient with `documents_update`, then retry.

### `already in recipients list`

The same email was put on two roles. Use distinct addresses. For a self-sign test, keep one recipient and
reassign the second role's field UUIDs with `documents_fields_assign` instead.

### `400 Template is not available.`

The template is readable but not usable — typically a public gallery template rather than one in the
workspace. Pick a workspace template.

### `A phone number is required`

A recipient defaulted to SMS delivery. `documents_update` with
`delivery_methods: {email: true, sms: false}`.

### `409` on send

The document is still settling after creation. Retry once.

### The workspace has no NDA template

Say so and stop. Generating one is not an option: markdown-created documents have no signature fields and
cannot be signed, and `templates_create` needs a PDF at a public HTTPS URL.
