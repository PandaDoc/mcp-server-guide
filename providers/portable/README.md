# PandaDoc

A hosted MCP connector and one skill for finding, creating, sending, and tracking
documents. No local PandaDoc server is required.

## Hermes

```sh
hermes plugins install https://github.com/PandaDoc/mcp-server-guide/tree/main/providers/portable
hermes plugins enable pandadoc
hermes mcp add pandadoc --url https://mcp.pandadoc.com/v1/mcp --auth oauth --connect-timeout 300
```

Complete sign-in in PandaDoc, choose your workspace and access, then start a new
Hermes session or run `/reload-mcp`. Check with `hermes mcp test pandadoc`.
Installation alone does not configure OAuth. To sign in again, use
`hermes mcp login pandadoc`.

## OpenClaw

```sh
openclaw mcp set pandadoc '{"url":"https://mcp.pandadoc.com/v1/mcp","transport":"streamable-http","auth":"oauth"}'
openclaw mcp login pandadoc
openclaw mcp doctor pandadoc --probe
```

The skill supplies instructions; connect your PandaDoc account separately.

## Publish to ClawHub locally

Publishing requires access to the PandaDoc organization in ClawHub.
Run from the repository root:

```sh
npx --yes clawhub@0.23.3 login
npx --yes clawhub@0.23.3 skill publish providers/portable/skills/pandadoc --owner pandadoc --slug pandadoc --name PandaDoc --version 1.0.0 --categories integrations
npx --yes clawhub@0.23.3 inspect @pandadoc/pandadoc
```

Add `--dry-run` to the publish command to preview without uploading. ClawHub reviews
new uploads before making them available. After publication, install with
`openclaw skills install @pandadoc/pandadoc`.

## Data and permissions

Tool requests go to `https://mcp.pandadoc.com/v1/mcp`; responses enter your agent
conversation and its configured model provider. The client stores OAuth credentials
locally. Creating stores a document in PandaDoc; sending can notify recipients and
start a signature or approval workflow. The skill requires authorization before
sending. For Hermes to enforce write approvals, set `trust: untrusted` on the
`mcp_servers.pandadoc` entry in your profile's `config.yaml`.

[Documentation](https://developers.pandadoc.com/docs/how-to-use-the-pandadoc-mcp-server) ·
[Privacy](https://www.pandadoc.com/legal/privacy-notice/)

The package uses [MIT](LICENSE); the standalone skill uses
[MIT-0](skills/pandadoc/LICENSE), required for ClawHub skill publication.
