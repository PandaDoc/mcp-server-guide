<div align="center">

<picture>
  <source media="(
  )" srcset="./pd-mark_green_pd_white.svg">
  <img src="./pd-mark_black_pd.svg" alt="PandaDoc" width="90">
</picture>

# PandaDoc MCP Server Guide

Configuration files and tools to integrate PandaDoc with LLMs and agent frameworks.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Documentation](https://img.shields.io/badge/docs-developers.pandadoc.com-blue.svg)](https://developers.pandadoc.com/docs/how-to-use-the-pandadoc-mcp-server)

</div>

---

PandaDoc hosts a remote MCP server at [https://mcp.pandadoc.com/v1/mcp](https://mcp.pandadoc.com/v1/mcp). This allows secure MCP client access via OAuth. View the docs [here](https://developers.pandadoc.com/docs/how-to-use-the-pandadoc-mcp-server).

> [!NOTE]
> PandaDoc document creation, sending, and other operations volume and limits are also applied to the PandaDoc MCP server.
>
> Existing rate limits for the PandaDoc Public API also apply to PandaDoc MCP server tools. More information on Public API limits can be found in: https://developers.pandadoc.com/reference/limits

## Table of Contents

- [Installation & Setup](#installation--setup)
  - [Claude Desktop](#claude-desktop)
  - [Claude Code](#claude-code)
  - [Cline](#cline)
  - [OpenCode](#opencode)
  - [Codex](#codex)
  - [Kiro](#kiro)
  - [Cursor](#cursor)
  - [VS Code](#vs-code)
  - [Gemini (powered by Gemini CLI)](#gemini-powered-by-gemini-cli)
  - [OpenClaw](#openclaw)
- [PandaDoc Claude Plugin](#pandadoc-claude-plugin)
- [PandaDoc Antigravity Plugin](#pandadoc-antigravity-plugin)
- [Support and Privacy](#support-and-privacy)
- [License](#license)

## Installation & Setup

Different MCP clients require slightly different setups. Follow the instructions below for your specific client to connect to the PandaDoc MCP server.

### Claude Desktop

To set up the PandaDoc MCP server in Claude Desktop:

1. Open Claude Desktop and go to **"Customize" → "Connectors"**.
2. Click the **"+"** button, then select **"... Add custom connector"**.
3. On the "Add custom connector" screen, enter:

   - Name: `PandaDoc`
   - Remote MCP server URL: [https://mcp.pandadoc.com/v1/mcp](https://mcp.pandadoc.com/v1/mcp)
   - Click **Add**

4. Click **Connect** to begin the authentication process. An external page will open.
5. Click **Allow access** to consent and begin the authentication process with PandaDoc.
6. Click **Authorize** to authenticate and allow Claude to access your PandaDoc account.
7. After authentication completes, you should be prompted with an alert. Press **"Open Claude"** to go back to Claude Desktop.
8. Back in the Claude app, you should see PandaDoc listed as one of your custom connectors, and you're ready to start prompting in Claude.

### Claude Code

To set up the PandaDoc MCP server in Claude Code:

1. Open your terminal, run the following command, then press **Enter**:
   `claude mcp add pandadoc --transport http https://mcp.pandadoc.com/v1/mcp`
2. Type `claude` to start Claude Code.
3. Type `/mcp` and press **Enter** to open the list of MCP servers you have installed.
4. Use the arrow keys to navigate to the PandaDoc server and press **Enter** to begin the authentication process. An external page will open.
5. Click **Allow access** to consent and begin the authentication process with PandaDoc.
6. Click **Authorize** to authenticate and allow Claude Code to access your PandaDoc account.
7. Once authentication completes, head back to the terminal and run the `/mcp` command again.
8. The PandaDoc server should now display as connected, and you're ready to start prompting in Claude Code.

### Cline

To set up the PandaDoc MCP server with Cline:

1. Install or update the Cline CLI:

   ```sh
   npm install -g cline
   ```

2. Open your terminal and start the Cline MCP installation wizard:

   ```sh
   cline mcp add pandadoc --transport streamable-http https://mcp.pandadoc.com/v1/mcp
   ```

3. Review the prefilled server details in the wizard and complete the setup.
4. Continue to PandaDoc in your browser when prompted to authenticate.
5. Click **Allow access**, then **Authorize**, to allow Cline to access your PandaDoc account.
6. Return to Cline after authentication and verify that the PandaDoc server is connected.

You can reopen the MCP management interface at any time by running `cline mcp`.

No local PandaDoc package, source code, API key, or environment variable is required. Authentication is handled through PandaDoc OAuth.

### OpenCode

To set up the PandaDoc MCP server in OpenCode:

1. Open your terminal and run: `opencode mcp add`
2. Press **Enter** to start the process.
3. When OpenCode asks for the MCP server name, type `pandadoc` and press **Enter**.
4. When OpenCode asks for the MCP server type, use the arrow keys to navigate to **"Remote"** and press **Enter**.
5. When OpenCode asks for the MCP server URL, type [https://mcp.pandadoc.com/v1/mcp](https://mcp.pandadoc.com/v1/mcp) and press **Enter**.
6. When OpenCode asks if the server requires OAuth authentication, navigate to **"Yes"** and press **Enter**.
7. When OpenCode asks "Do you have a pre-registered client ID?", navigate to **"No"** and press **Enter**.
8. OpenCode should finish with the message: "MCP server added successfully".
9. Authenticate with your PandaDoc account by running: `opencode mcp auth pandadoc`
10. Press **Enter** to begin the authentication process. An external page will open.
11. Click **Allow access** to consent and begin the authentication process with PandaDoc.
12. Click **Authorize** to authenticate and allow OpenCode to access your PandaDoc account.
13. Once authentication completes, head back to the terminal and start OpenCode with the command `opencode`.
14. Inside OpenCode, type `/mcp` in the prompt and press **Enter**.
15. You should see "pandadoc" listed as "connected".
16. Press **ESC** and you're ready to start prompting in OpenCode.

### Codex

To set up the PandaDoc MCP server in Codex desktop:

1. Open Codex and click **"Settings → Settings"** in the lower-left corner.
2. In the settings view, select **"MCP servers"**.
3. In the MCP servers listing, select **"+ Add server"**.
4. On the "Connect to a custom MCP" screen, enter:

   - Name: `PandaDoc`
   - Select **"Streamable HTTP"**
   - URL: [https://mcp.pandadoc.com/v1/mcp](https://mcp.pandadoc.com/v1/mcp)

5. Click **Save**.
6. Back in the MCP servers list, an **"Authenticate"** button should appear next to the settings gear icon. Click it to begin the authentication process. An external page will open.
7. Click **Allow access** to consent and begin the authentication process with PandaDoc.
8. Click **Authorize** to authenticate and allow Codex to access your PandaDoc account.
9. Once authentication completes, head back to the Codex window, and you're ready to start prompting in Codex.

### Kiro

To install the PandaDoc power from its public GitHub repository:

1. Open the **Powers** panel and select **Add Custom Power**.
2. Select **Import power from GitHub**.
3. Enter `https://github.com/PandaDoc/mcp-server-guide` and click **Install**.
4. Ask Kiro to perform a PandaDoc task and complete the PandaDoc OAuth flow when prompted.

### Cursor

To set up the PandaDoc MCP server in Cursor:

1. Open the command palette:

   - macOS: `CMD + Shift + P`
   - Windows/Linux: `CTRL + Shift + P`

2. From the list, select **"View: Open MCP Settings"** and press **Enter**.
3. Select **"Tools & MCPs"**.
4. Under **"Installed MCP Servers"**, click the **"New MCP Server"** button.
5. An `mcp.json` file should open. Add the PandaDoc MCP server inside the `mcpServers` object. It should look like this:

   ```json
   {
     "mcpServers": {
       "pandadoc": {
         "url": "https://mcp.pandadoc.com/v1/mcp"
       }
     }
   }
   ```

   **Note:** if you already had an MCP server configured, make sure the commas are in the right place, for example:

   ```json
   {
     "mcpServers": {
       "mcp-sample-server": {
         "url": "https://mcp.sample.server.com/mcp"
       },
       "pandadoc": {
         "url": "https://mcp.pandadoc.com/v1/mcp"
       }
     }
   }
   ```

6. Save the file and go back to the previous "Tools & MCPs" screen.
7. An **"Authenticate"** button should appear. Click it to begin the authentication process. An external page will open.
8. Click **Allow access** to consent and begin the authentication process with PandaDoc.
9. Click **Authorize** to authenticate and allow Cursor to access your PandaDoc account.
10. Once authentication completes, head back to the Cursor app, and you're ready to start prompting.

### VS Code

To set up the PandaDoc MCP server in VS Code:

1. Make sure you have GitHub Copilot enabled.
2. Open the command palette and select **"MCP: Add server..."**:

   - macOS: `CMD + Shift + P`
   - Windows/Linux: `CTRL + Shift + P`

3. Select **HTTP**.
4. Paste the server URL https://mcp.pandadoc.com/v1/mcp in the search bar, then hit **Enter**.
5. Type `PandaDoc` when it asks for a server ID, then hit **Enter**.
6. Your `mcp.json` file should be displayed with the PandaDoc MCP server configuration.
7. VS Code will prompt with an alert to allow authentication. Press the **Allow** button.
8. Another alert with a URL will be displayed. Click the **Open** button to begin the authentication process. An external page will open.
9. Click **Allow access** to consent and begin the authentication process with PandaDoc.
10. Click **Authorize** to authenticate and allow VS Code to access your PandaDoc account.
11. Once authentication completes, head back to the VS Code window, and you're ready to start prompting in VS Code.

### Gemini (powered by Gemini CLI)

To set up the PandaDoc MCP server for use with [Gemini](https://geminicli.com/):

1. Open your terminal and go to the folder where you want to work.
2. Run the following command: `gemini extensions install https://github.com/PandaDoc/mcp-server-guide`
3. Press **Enter** to start the process.

---

Instructions vary depending on the client. For other clients, ask your client how to add an MCP server or check your client's documentation.

### OpenClaw

The PandaDoc plugin includes the same document workflows in [`skills/`](skills)
and hosted MCP connector as the Claude plugin.

```sh
openclaw plugins install clawhub:@pandadoc/pandadoc
openclaw mcp set pandadoc '{"url":"https://mcp.pandadoc.com/v1/mcp","transport":"streamable-http","auth":"oauth"}'
openclaw mcp login pandadoc
openclaw mcp doctor pandadoc --probe
```

Complete PandaDoc sign-in and choose the workspace and access you want to grant.
OAuth is a separate step after installation. Start a new agent session to use the
skills. Tool requests go to PandaDoc; returned content enters your agent conversation
and its configured model provider. Sending a document can notify its recipients.

#### Publish a GitHub plugin version to ClawHub

GitHub is the source of truth. The package is built from the selected commit's
`.claude-plugin/plugin.json`, `skills/`, `hooks/`, and `.mcp.json`. The version comes
from that manifest; skills are copied verbatim. OpenClaw metadata and the catalog
icon are generated from the same commit. Local uncommitted files are excluded.

Merging a new plugin version in `.claude-plugin/plugin.json` to `main`
automatically publishes it to ClawHub. The existing skills sync already bumps
that version. Pull requests check the version and preview the package without
publishing or receiving the publishing token.

An already published version is skipped when its installed plugin files match.
Changes to skills, hooks, the MCP configuration, the icon, or the plugin manifest
require a new version. README-only changes do not trigger a release. Publication
waits up to 30 minutes for ClawHub security checks; a failed check fails the run.
Retry a failed release from the **Publish ClawHub** workflow on `main`.

Repository administrators configure the `CLAWHUB_TOKEN` Actions secret once,
using a ClawHub token with publish access to the `pandadoc` organization. The
workflow stores it in a temporary CLI config and removes that file after the
publish command. No PandaDoc account credentials are needed for publication.

For a local preview or manual release, push the commit to GitHub and run:

```sh
# Preview the package, using the commit or release tag you intend to publish.
node scripts/package-plugin.mjs --clawhub <commit-or-tag>
# Publish that exact version under the PandaDoc organization.
node scripts/package-plugin.mjs --clawhub --publish <commit-or-tag>
```

Sign in with `npx --yes clawhub@0.23.3 login` first if needed. Publishing requires
access to the `pandadoc` organization in ClawHub. Each release records its GitHub
commit SHA and uses the plugin's version for the entire bundle. Bump that version
before publishing changed content: patch for fixes, minor for added workflows,
major for breaking changes. The existing skills import also bumps the plugin
version. GitHub remains the source of plugin files and versions; no separate
skills source is maintained for ClawHub. Client manifests, installation paths,
skills, and hooks keep their existing formats.

## PandaDoc Claude Plugin

Beyond the raw connector, this repo also publishes a **Claude plugin** that bundles everything a Claude user needs in a single install:

- **Document-automation skills** — guided workflows for quotes, NDAs, approvals, invoices, renewals, contract insights, and more.
- **The PandaDoc connector, pre-wired** — connect to the MCP server in one click, no manual setup.
- **A quick-start hook** that lists the available skills at the start of a session.

The plugin works in **Claude Code** — the terminal CLI, the **Code** tab in the Claude desktop app, the IDE extensions, and [claude.ai/code](https://claude.ai/code). In any of them:

1. Add this repo as a plugin marketplace:

   ```
   /plugin marketplace add PandaDoc/mcp-server-guide
   ```

2. Install the plugin:

   ```
   /plugin install pandadoc@pandadoc
   ```

3. Connect the bundled **PandaDoc** connector and authorize access to your account — in the terminal, run `/mcp`, select the PandaDoc connector, and complete the OAuth flow; in the desktop app or IDE, click **Connect** on PandaDoc in the plugin's connectors.

The skills are now available — type `/` to browse them, or just describe your task (e.g. _"send this NDA for signature"_). To pull newer skill versions later, run `/plugin marketplace update`.

## PandaDoc Antigravity Plugin

The same skills and connector install as a [Google Antigravity plugin](https://antigravity.google/docs/plugins) straight from this repo:

1. Run `agy plugin install https://github.com/PandaDoc/mcp-server-guide`.
2. Open Antigravity's **Customizations** panel, click **Authenticate** next to the PandaDoc MCP server, and authorize access to your account. Paste the authorization code back into the panel when prompted.

The skills then appear as slash commands such as `/pandadoc-nda-fast-send`, or Antigravity picks them up when you describe a task. Antigravity reads the MCP server from `mcp_config.json`.

## Support and Privacy

- For help, visit the [PandaDoc Help Center](https://support.pandadoc.com/en/).
- Review the [PandaDoc Privacy Notice](https://www.pandadoc.com/legal/privacy-notice/).

## License

[MIT](LICENSE)
