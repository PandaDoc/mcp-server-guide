<div align="center">

<picture>
  <source media="(
  )" srcset="./pd-mark_green_pd_white.svg">
  <img src="./pd-mark_black_pd.svg" alt="PandaDoc" width="90">
</picture>

# PandaDoc MCP Server Guide

Configuration files, skills, and tools to integrate PandaDoc with LLMs and agent frameworks.

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
  - [OpenCode](#opencode)
  - [Codex](#codex)
  - [Cursor](#cursor)
  - [VS Code](#vs-code)
  - [Gemini (powered by Gemini CLI)](#gemini-powered-by-gemini-cli)
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

## License

[MIT](LICENSE)
