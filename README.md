<div align="center">

<img src="./pd-mark_green_pd_white.svg" alt="PandaDoc" width="72" height="72">

# PandaDoc for your AI assistant

**AI drafts it. PandaDoc makes it real.**

Check document status, see who's signed, and understand your agreements.<br>
When you need a new one, create it from a template and send it for signature — right from your AI assistant.

<sub>Official PandaDoc MCP server and AI plugins · Hosted by PandaDoc · OAuth sign-in</sub>

**[Connect your assistant](#installation--setup)** &nbsp;·&nbsp; [Explore workflows](#document-workflows) &nbsp;·&nbsp; [Documentation](https://developers.pandadoc.com/docs/how-to-use-the-pandadoc-mcp-server)

</div>

---

## Start with a question

Use the AI assistant you already work with to find answers and take action in your PandaDoc account.

| What you need | Try asking |
| :--- | :--- |
| **Check signing status** | “What's the status of the Acme contract? Who still needs to sign?” |
| **Understand an agreement** | “Summarize this contract's payment terms and key obligations.” |
| **Review your pipeline** | “Which documents are still waiting for signatures this week?” |
| **Plan for renewals** | “Which signed agreements are coming up for renewal this quarter?” |
| **Prepare a follow-up** | “Find our outstanding proposals and draft a follow-up for each.” |
| **Create and send** | “Create an NDA for Acme from our standard template. Let me review it before sending.” |

Your assistant combines the available PandaDoc tools to carry out your request. PandaDoc handles document delivery, e-signatures, and status tracking.

## Installation & Setup

Choose your assistant, follow its setup steps, then sign in to PandaDoc. For your first request, try: **“Show me my five most recently updated documents.”**

<table>
  <tr>
    <td align="center" width="220"><a href="#chatgpt"><img src="./assets/readme/chatgpt.svg" alt="" width="28" height="28"><br><strong>ChatGPT</strong></a></td>
    <td align="center" width="220"><a href="#claude-desktop"><img src="./assets/readme/claude.svg" alt="" width="28" height="28"><br><strong>Claude Desktop</strong></a></td>
    <td align="center" width="220"><a href="#claude-code"><img src="./assets/readme/claude.svg" alt="" width="28" height="28"><br><strong>Claude Code</strong></a></td>
  </tr>
  <tr>
    <td align="center"><a href="#cursor"><img src="./assets/readme/cursor.svg" alt="" width="28" height="28"><br><strong>Cursor</strong></a></td>
    <td align="center"><a href="#codex"><img src="./assets/readme/codex.svg" alt="" width="28" height="28"><br><strong>Codex</strong></a></td>
    <td align="center"><a href="#vs-code"><img src="./assets/readme/github-copilot.svg" alt="" width="28" height="28"><br><strong>VS Code</strong></a><br><sub>GitHub Copilot</sub></td>
  </tr>
  <tr>
    <td align="center"><a href="#cline"><img src="./assets/readme/cline.svg" alt="" width="28" height="28"><br><strong>Cline</strong></a></td>
    <td align="center"><a href="#opencode"><img src="./assets/readme/opencode.svg" alt="" width="28" height="28"><br><strong>OpenCode</strong></a></td>
    <td align="center"><a href="#gemini-powered-by-gemini-cli"><img src="./assets/readme/gemini.svg" alt="" width="28" height="28"><br><strong>Gemini CLI</strong></a></td>
  </tr>
  <tr>
    <td align="center"><a href="#pandadoc-antigravity-plugin"><img src="./assets/readme/antigravity.svg" alt="" width="28" height="28"><br><strong>Google Antigravity</strong></a></td>
    <td align="center"><a href="#kiro"><img src="./assets/readme/kiro.svg" alt="" width="28" height="28"><br><strong>Kiro</strong></a></td>
    <td align="center"><a href="#openclaw"><img src="./assets/readme/openclaw.svg" alt="" width="28" height="28"><br><strong>OpenClaw</strong></a></td>
  </tr>
</table>

<details>
<summary><strong>Using another assistant or building your own agent?</strong></summary>

Connect it to the hosted PandaDoc MCP server using Streamable HTTP and OAuth. PandaDoc hosts the server; you do not need to run one locally.

| PandaDoc account | Server URL |
| :--- | :--- |
| Global (`app.pandadoc.com`) | `https://mcp.pandadoc.com/v1/mcp` |
| European (`app.pandadoc.eu`) | `https://mcp.pandadoc.eu/v1/mcp` |

Use the endpoint for your account's region. See the [MCP setup guide](https://developers.pandadoc.com/docs/getting-started-with-mcp) and [supported clients](https://developers.pandadoc.com/docs/supported-mcp-clients).

</details>

> **Sign in with PandaDoc.** During authorization, select your workspace and choose what your assistant can access. The manual setup examples below use the global server URL. For a European account, follow the [regional setup instructions](https://developers.pandadoc.com/docs/getting-started-with-mcp).

<a id="chatgpt"></a>

### <img src="./assets/readme/chatgpt.svg" alt="" width="24" height="24" align="absmiddle"> ChatGPT

Connect the [PandaDoc app for ChatGPT](https://www.pandadoc.com/integrations/productivity/chatgpt/) to work with your documents directly in a conversation.

1. In ChatGPT, open **Apps** and search for **PandaDoc**.
2. Select **Connect**, sign in to PandaDoc, and approve the connection.
3. Select **Start chat** and ask about one of your documents.

For European accounts, connect through a custom MCP server as described in the [PandaDoc ChatGPT setup guide](https://support.pandadoc.com/en/articles/15000069-pandadoc-app-for-chatgpt). The app directory listing connects to the global region.

<a id="claude-desktop"></a>

### <img src="./assets/readme/claude.svg" alt="" width="24" height="24" align="absmiddle"> Claude Desktop

1. Open **Customize → Connectors → + → Add custom connector**.
2. Enter **PandaDoc** as the name and this server URL:

   ```text
   https://mcp.pandadoc.com/v1/mcp
   ```

3. Select **Add**, then **Connect**.
4. Complete PandaDoc authorization in your browser, then choose **Open Claude** to return to the app.

PandaDoc should appear in your connected tools. Start a conversation and ask about a document.

<a id="pandadoc-claude-plugin"></a>
<a id="claude-code"></a>

### <img src="./assets/readme/claude.svg" alt="" width="24" height="24" align="absmiddle"> Claude Code

The PandaDoc Claude plugin includes the connector, guided document workflows, and a session-start overview of the available skills. It works in the terminal, the **Code** tab in Claude Desktop, IDE extensions, and [Claude Code on the web](https://claude.ai/code).

1. Add the PandaDoc plugin marketplace:

   ```text
   /plugin marketplace add PandaDoc/mcp-server-guide
   ```

2. Install the plugin:

   ```text
   /plugin install pandadoc@pandadoc
   ```

3. Run `/mcp`, select **PandaDoc**, and complete authorization. In the desktop app or IDE, select **Connect** on the plugin's PandaDoc connector.
4. Type `/` to browse the skills, or describe your task.

Use `/plugin marketplace update` to refresh the marketplace when updating the plugin.

<details>
<summary>Connect the MCP server without installing the plugin</summary>

Run this command in your terminal:

```sh
claude mcp add pandadoc --transport http https://mcp.pandadoc.com/v1/mcp
```

Start `claude`, run `/mcp`, and select **PandaDoc** to authorize. Return to `/mcp` after signing in to confirm the server is connected.

</details>

<a id="cursor"></a>

### <img src="./assets/readme/cursor.svg" alt="" width="24" height="24" align="absmiddle"> Cursor

1. Open the command palette with **⌘⇧P** on macOS or **Ctrl+Shift+P** on Windows/Linux.
2. Select **View: Open MCP Settings → Tools & MCPs → New MCP Server**.
3. Add PandaDoc to the `mcpServers` object in the configuration file:

   ```json
   {
     "mcpServers": {
       "pandadoc": {
         "url": "https://mcp.pandadoc.com/v1/mcp"
       }
     }
   }
   ```

4. Save the file, return to **Tools & MCPs**, and select **Authenticate**.
5. Complete PandaDoc authorization in your browser, then return to Cursor.

<details>
<summary>Already have another MCP server configured?</summary>

Keep your existing entries and add `pandadoc` alongside them, with a comma between entries:

```json
{
  "mcpServers": {
    "existing-server": {
      "url": "https://mcp.example.com/mcp"
    },
    "pandadoc": {
      "url": "https://mcp.pandadoc.com/v1/mcp"
    }
  }
}
```

</details>

<a id="codex"></a>

### <img src="./assets/readme/codex.svg" alt="" width="24" height="24" align="absmiddle"> Codex

1. In Codex desktop, open **Settings → Settings → MCP servers → + Add server**.
2. Enter **PandaDoc**, select **Streamable HTTP**, and use this URL:

   ```text
   https://mcp.pandadoc.com/v1/mcp
   ```

3. Select **Save**, then **Authenticate** beside the new server.
4. Complete PandaDoc authorization in your browser and return to Codex.

<a id="vs-code"></a>

### <img src="./assets/readme/github-copilot.svg" alt="" width="24" height="24" align="absmiddle"> VS Code

1. Enable **GitHub Copilot** and open the command palette with **⌘⇧P** on macOS or **Ctrl+Shift+P** on Windows/Linux.
2. Select **MCP: Add server… → HTTP**.
3. Enter `https://mcp.pandadoc.com/v1/mcp` and use **PandaDoc** as the server ID.
4. Review the generated configuration. When prompted, select **Allow**, then **Open** to start authorization.
5. Complete PandaDoc authorization in your browser and return to VS Code.

<a id="cline"></a>

### <img src="./assets/readme/cline.svg" alt="" width="24" height="24" align="absmiddle"> Cline

1. Install or update the Cline CLI:

   ```sh
   npm install -g cline
   ```

2. Start the connection wizard:

   ```sh
   cline mcp add pandadoc --transport streamable-http https://mcp.pandadoc.com/v1/mcp
   ```

3. Review the prefilled details and complete the wizard.
4. Complete PandaDoc authorization in your browser, then return to Cline and check that the server is connected.

Run `cline mcp` to manage the connection later.

<a id="opencode"></a>

### <img src="./assets/readme/opencode.svg" alt="" width="24" height="24" align="absmiddle"> OpenCode

1. Run the setup wizard:

   ```sh
   opencode mcp add
   ```

2. Use these values when prompted:

   | Setting | Value |
   | :--- | :--- |
   | Server name | `pandadoc` |
   | Server type | **Remote** |
   | Server URL | `https://mcp.pandadoc.com/v1/mcp` |
   | Requires OAuth | **Yes** |
   | Pre-registered client ID | **No** |

3. Sign in to PandaDoc:

   ```sh
   opencode mcp auth pandadoc
   ```

4. Complete authorization in your browser. Start `opencode` and run `/mcp` to confirm PandaDoc is connected.

<a id="gemini-powered-by-gemini-cli"></a>

### <img src="./assets/readme/gemini.svg" alt="" width="24" height="24" align="absmiddle"> Gemini (powered by Gemini CLI)

Install the PandaDoc extension from this repository:

```sh
gemini extensions install https://github.com/PandaDoc/mcp-server-guide
```

Follow the installation prompts and complete PandaDoc authorization when requested.

<a id="pandadoc-antigravity-plugin"></a>
<a id="google-antigravity"></a>

### <img src="./assets/readme/antigravity.svg" alt="" width="24" height="24" align="absmiddle"> Google Antigravity

Install the [Google Antigravity plugin](https://antigravity.google/docs/plugins) with the PandaDoc connector and document workflows:

```sh
agy plugin install https://github.com/PandaDoc/mcp-server-guide
```

Open **Customizations**, select **Authenticate** beside PandaDoc, and authorize access. Paste the authorization code into the panel when prompted.

Use a slash command such as `/pandadoc-nda-fast-send`, or describe your task. Antigravity reads the connector configuration from `mcp_config.json`.

<a id="kiro"></a>

### <img src="./assets/readme/kiro.svg" alt="" width="24" height="24" align="absmiddle"> Kiro

1. Open **Powers → Add Custom Power → Import power from GitHub**.
2. Enter `https://github.com/PandaDoc/mcp-server-guide` and select **Install**.
3. Ask Kiro to perform a PandaDoc task and complete authorization when prompted.

<a id="openclaw"></a>

### <img src="./assets/readme/openclaw.svg" alt="" width="24" height="24" align="absmiddle"> OpenClaw

Install the PandaDoc plugin, connect the hosted server, and sign in:

```sh
openclaw plugins install clawhub:@pandadoc/pandadoc
openclaw mcp set pandadoc '{"url":"https://mcp.pandadoc.com/v1/mcp","transport":"streamable-http","auth":"oauth"}'
openclaw mcp login pandadoc
openclaw mcp doctor pandadoc --probe
```

Complete PandaDoc authorization in your browser. Start a new agent session to use the included skills.

## Document workflows

PandaDoc plugins include guided workflows called **skills**. They help your assistant check the details, work through a task, and ask for confirmation before sending a document. Availability depends on your client's support for plugin skills.

| Workflow | What it helps you do |
| :--- | :--- |
| [Signing progress](skills/pandadoc-engagement-tracker/SKILL.md) | See who has signed, who is outstanding, and which documents have stalled. |
| [Follow-up list](skills/pandadoc-followup-list/SKILL.md) | Prioritize unsigned documents and draft follow-up messages. |
| [Signing pipeline report](skills/pandadoc-signing-velocity/SKILL.md) | Review status counts, time to sign, and value in flight. |
| [Contract register](skills/pandadoc-contract-register/SKILL.md) | Gather signed agreements and their extracted key terms. |
| [NDA](skills/pandadoc-nda-fast-send/SKILL.md) | Prepare an NDA from your template, check recipients, and send on confirmation. |
| [Quotes and proposals](skills/pandadoc-quote-builder/SKILL.md) | Populate pricing, verify totals, and prepare a proposal for signature. |
| [Internal approvals](skills/pandadoc-approval-send/SKILL.md) | Route a document through its configured approval chain. |
| [Onboarding agreements](skills/pandadoc-onboarding-agreement/SKILL.md) | Fill in onboarding paperwork and assign fields to the right signer. |
| [Invoice handoff](skills/pandadoc-invoice-handoff/SKILL.md) | Create an invoice from a signed quote's pricing. |

## Support and Privacy

Sign-in connects your assistant to the PandaDoc workspace you select. Actions follow the access you grant and your existing PandaDoc permissions.

Requests go to PandaDoc. Returned document content becomes part of your assistant's conversation and may be processed by its configured model provider. Sending a document can notify its recipients.

PandaDoc document and operation limits apply when using the connector. See [API rate limits](https://developers.pandadoc.com/reference/limits) for details.

| Resource | Where to go |
| :--- | :--- |
| Setup and connection help | [Getting started](https://developers.pandadoc.com/docs/getting-started-with-mcp) |
| More things to try | [PandaDoc prompt library](https://developers.pandadoc.com/docs/what-you-can-do-with-pandadoc-mcp) |
| Product support | [PandaDoc Help Center](https://support.pandadoc.com/en/) |
| Privacy | [PandaDoc Privacy Notice](https://www.pandadoc.com/legal/privacy-notice/) |

## License

[MIT](LICENSE)
