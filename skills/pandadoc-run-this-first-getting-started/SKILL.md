---
name: pandadoc-run-this-first-getting-started
category: getting-started
roles: [sales, bizops, legal, finance, hr, ops, owner]
complexity: beginner
prerequisites: [PandaDoc]
description: Start here for anything new or unclear with PandaDoc. Use BEFORE any PandaDoc tool or skill when the user is new to PandaDoc, just connected it, asks what PandaDoc can do, how to do something, for advice, or how to get started, and on the first PandaDoc request of a conversation. Skip once it has run in this conversation.
tags: [pandadoc, onboarding, getting-started, welcome]
version: "0.0.1"
metadata:
  visibility: internal
---

# PandaDoc Onboarding (spike placeholder)

Placeholder skill for PD-127295, variant A5 (A4's name and description, plus a memory check: onboarding runs only until the questions are answered once). It exists to prove the
trigger fires, that answers can be remembered across conversations, and to show the user something visible. It is not the real onboarding flow.

## Step 0 — Check memory first

Before anything else, look in your memory for a record that starts with `PandaDoc onboarding completed`.

- **Found:** onboarding is done. Start your reply with this line, exactly, then do **not** ask the questions and do not
  run Steps 1 to 4. Carry on with whatever the user asked, using the stored answers to tailor it:

  `🐼 ONBOARDING-SPIKE · variant A5 · already completed, skipped`

- **Not found:** continue with Step 1.
- **You have no way to read memory:** treat it as not found, and put `(memory not available)` at the end of the Step 1 marker.

## Step 1 — Show the marker

Start your reply with this line, exactly, so testers can see the skill ran:

`🐼 ONBOARDING-SPIKE · variant A5 · skill active`

## Step 2 — Ask the questions

Say you will tailor suggestions, then ask these four questions in **one** message, numbered, short, answerable in
a few words. Do not call any PandaDoc tool yet.

1. What is your role (sales, legal, finance, HR, operations, other)?
2. Which documents do you work with most (quotes, NDAs, contracts, invoices, onboarding paperwork)?
3. What is the most annoying part today (creating them, chasing signatures, finding old ones, reporting)?
4. Do you want to try something right now, or just see what is possible?

Then stop and wait for the answers. If the user already asked for a concrete task, say you will do it right
after these questions.

## Step 2b — Save the answers to memory

Once the user has answered all four questions, save one record to your memory, the same way you would if they had said
"remember this". Use this exact form so Step 0 can find it:

`PandaDoc onboarding completed: role=<answer 1>; documents=<answer 2>; pain=<answer 3>; goal=<answer 4>`

Then tell the user in one line: `Saved to memory: <the record>`. If you cannot save to memory, say `Could not save to memory.` instead. If the user answered only some of the questions, do not save anything, so the questions come back next time.

## Step 3 — Recommend

From the answers, pick the **two or three** best matches below. Give each as the skill name, one line on what
it does, and a prompt the user can copy. Lead with the best match.

| If they mostly… | Skill | Example prompt |
| --- | --- | --- |
| send NDAs | `pandadoc-nda-fast-send` | "Send a mutual NDA to Acme Corp, contact jane@acme.com." |
| build quotes or proposals | `pandadoc-quote-builder` | "Build a quote from our Enterprise template for 25 seats with 10% off." |
| need sign-off before sending | `pandadoc-approval-send` | "Create a contract from the MSA template and send it through approval." |
| chase unsigned documents | `pandadoc-followup-list` | "What documents are still waiting for signature? Draft nudges." |
| wonder who is holding a deal up | `pandadoc-engagement-tracker` | "Who has not signed yet on my open documents?" |
| track contracts and renewals | `pandadoc-renewal-radar` | "Which contracts renew or expire in the next 60 days?" |
| need key terms from signed contracts | `pandadoc-contract-register` | "List signed contracts for Acme with dates and values." |
| invoice closed deals | `pandadoc-invoice-handoff` | "Which signed quotes have not been invoiced yet?" |
| report on the pipeline | `pandadoc-signing-velocity` | "Give me a weekly signing report: counts, average time to sign, stuck documents." |
| hire people | `pandadoc-onboarding-agreement` | "Create an offer letter for Sam Lee starting 1 March and send it." |

If the user's answers match nothing here, say so and suggest the "What is still waiting for signature?" prompt as
a safe read-only starting point.

## Step 4 — Hand back

End by offering to run the first recommendation now. Do not send, create or change anything in PandaDoc during
onboarding. If the PandaDoc connector is not connected, say so and point to the Connectors tab.

## Rules

- Show the marker once per conversation. If it already appeared, skip this skill.
- Never claim anything about the user's account (document counts, templates) from this skill; you have not looked.
- Keep the whole flow to two short messages: questions, then recommendations.
