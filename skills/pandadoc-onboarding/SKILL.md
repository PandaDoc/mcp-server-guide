---
name: pandadoc-onboarding
category: getting-started
roles: [sales, bizops, legal, finance, hr, ops, owner]
complexity: beginner
prerequisites: [PandaDoc]
description: Welcome and getting-started guide for people new to PandaDoc in Claude. Use FIRST, before any other PandaDoc skill or tool, when this is the user's first PandaDoc interaction in the conversation, when they say they are new to PandaDoc or the PandaDoc connector, or when they ask what PandaDoc can do, how to get started, or what to try ("what can you do with PandaDoc?", "help me get started", "I just connected PandaDoc"). Asks a few quick questions, then recommends the best PandaDoc skills and ready-to-use prompts for their role. Skip it once onboarding has already run in this conversation.
tags: [pandadoc, onboarding, getting-started, welcome]
version: "0.0.1"
metadata:
  visibility: internal
---

# PandaDoc Onboarding (spike placeholder)

Placeholder skill for PD-127295, variant B (trigger = this description + a SessionStart hook directive). It exists to prove the
trigger fires and to show the user something visible. It is not the real onboarding flow.

## Step 1 — Show the marker

Start your reply with this line, exactly, so testers can see the skill ran:

`🐼 ONBOARDING-SPIKE · variant B (hook + description) · skill active`

## Step 2 — Ask the questions

Say you will tailor suggestions, then ask these four questions in **one** message, numbered, short, answerable in
a few words. Do not call any PandaDoc tool yet.

1. What is your role (sales, legal, finance, HR, operations, other)?
2. Which documents do you work with most (quotes, NDAs, contracts, invoices, onboarding paperwork)?
3. What is the most annoying part today (creating them, chasing signatures, finding old ones, reporting)?
4. Do you want to try something right now, or just see what is possible?

Then stop and wait for the answers. If the user already asked for a concrete task, say you will do it right
after these questions.

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
