# PandaDoc for Hermes and OpenClaw

A portable Agent Plugins v1 package with the hosted PandaDoc MCP configuration and
one workflow skill: find documents, create drafts from templates, send approved
documents for signature, and check their status. No local server or Python plugin
code is included.

This directory has its own manifests. The root manifests and automatically
imported root `skills/` used by other integrations are independent of this package.

## Hermes setup

```sh
hermes plugins install https://github.com/PandaDoc/mcp-server-guide/tree/main/providers/portable
hermes plugins enable pandadoc
hermes mcp add pandadoc --url https://mcp.pandadoc.com/v1/mcp --auth oauth --connect-timeout 300
```

For a reviewed, reproducible installation, append `--ref` followed by a full
40-character commit SHA to the install command. A catalog listing is a separate
submission; the GitHub installation does not depend on it.

Installing the plugin does not sign you in: `mcp.json` declares the server but
cannot declare OAuth. The `hermes mcp add` command enables OAuth and starts sign-in.
Complete it in PandaDoc, choose the workspace and access you want to grant, and
return to Hermes. No API key is required. Choose read access for browsing;
creating and sending require the corresponding access in PandaDoc.

Start a new Hermes session or run `/reload-mcp`, then check:

```sh
hermes mcp test pandadoc
```

If sign-in expires, run `hermes mcp login pandadoc` and reconnect. Hermes stores
OAuth credentials in its local profile and handles token refresh. The OAuth
configuration takes precedence over the bundled `mcp.json` entry of the same name.

Try: "List my five most recently modified PandaDoc documents and their status."

## Data and sending

Tool requests and document or recipient details supplied in them go to PandaDoc's
hosted service at `https://mcp.pandadoc.com/v1/mcp`. Responses enter your agent
conversation and are handled by its configured model provider. Creating a document
stores it in PandaDoc. Sending can notify recipients and start the signature or
internal approval workflow.

The skill instructs the assistant to review the document, recipients, and message
with the user before sending. These instructions are not an enforced permission
boundary; keep the client's own approval controls enabled. This package contains
no account credentials, runs no background process, and does not update itself.
For Hermes to prompt before write-capable calls, set `trust: untrusted` on the
`mcp_servers.pandadoc` entry in your profile's `config.yaml`, keeping its URL and
OAuth configuration. Hermes's default MCP trust does not add that prompt.

Documentation: <https://developers.pandadoc.com/docs/how-to-use-the-pandadoc-mcp-server>

Privacy: <https://www.pandadoc.com/legal/privacy-notice/>

## ClawHub release

Publish only `providers/portable/skills/pandadoc/`, which contains the standalone
skill and its MIT-0 license. It shares the workflow instructions with Hermes and
is outside the root skill-sync destination.

Preview from the repository root:

```sh
npx --yes clawhub@0.23.3 skill publish providers/portable/skills/pandadoc --slug pandadoc --name PandaDoc --version 1.0.0 --categories integrations --topics documents,e-signature,pandadoc --dry-run --json
```

Preview does not publish or require a token. Choose the ClawHub user or
organization that will own the listing; its handle determines the installation
name, `@<owner>/pandadoc`. The signed-in user must be able to publish for that owner.

The **Publish PandaDoc skill to ClawHub** GitHub workflow runs only on manual
dispatch and defaults to preview. To publish, configure `CLAWHUB_TOKEN` in Actions
secrets, provide the owner and release version, and set `dry_run` to `false`.
Never commit the token. The workflow publishes only the skill folder, records its
source commit, and inspects the published version afterwards.

ClawHub applies review and security checks: uploading does not guarantee immediate
visibility in search or availability for installation. Merging these source files
does not publish a listing. After publication, replace `<owner>` with its actual
publisher handle:

```sh
openclaw skills install @<owner>/pandadoc
```

Configure MCP and sign in separately using the commands in
[`skills/pandadoc/SKILL.md`](skills/pandadoc/SKILL.md#connect).

## License

The manifests and README use the [MIT license](LICENSE). The standalone skill uses
[MIT-0](skills/pandadoc/LICENSE), matching
[ClawHub's skill publication terms](https://github.com/openclaw/clawhub/blob/main/docs/cli.md#skill-publish-path).
These licenses cover the package files, not the hosted PandaDoc service.
