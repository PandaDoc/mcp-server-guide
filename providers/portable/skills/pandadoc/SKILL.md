---
name: pandadoc
description: Find, create, send, and track PandaDoc documents through the hosted MCP. Use for PandaDoc document workflows.
license: MIT-0
---

# PandaDoc

Use `https://mcp.pandadoc.com/v1/mcp` over Streamable HTTP with OAuth.
Installing this skill does not connect an account.

## Connect

For Hermes:

```sh
hermes mcp add pandadoc --url https://mcp.pandadoc.com/v1/mcp --auth oauth --connect-timeout 300
```

For OpenClaw:

```sh
openclaw mcp set pandadoc '{"url":"https://mcp.pandadoc.com/v1/mcp","transport":"streamable-http","auth":"oauth"}'
openclaw mcp login pandadoc
```

Complete browser sign-in in PandaDoc and select the workspace and access needed
for the task. No API key is required. Use the connected server's tool schemas;
clients may prefix the tool names below.

## Document workflow

1. Find documents with `documents_list`; confirm the matching name and ID before
   acting. Read details with `documents_details_get` and status with
   `documents_status_get`.
2. Find a template with `templates_list`, then inspect `templates_details_get` for
   roles and fields. Use the user's recipient details and values; ask for missing
   required information. Create with `documents_create` and wait for Draft status.
3. Before `documents_send`, show the document, recipients, signing roles, subject,
   and message. Send only when the user has authorized those details. Respect the
   configured approval workflow. If the send result is unclear, check status
   before retrying to avoid duplicate delivery.
4. Report the observed document status. Do not send reminders or change status
   unless requested.

Requests and document or recipient data supplied in them go to PandaDoc; tool
responses are handled by the agent's configured model provider. Sending can
notify real recipients and start a signature or approval workflow.

Documentation: <https://developers.pandadoc.com/docs/how-to-use-the-pandadoc-mcp-server>
