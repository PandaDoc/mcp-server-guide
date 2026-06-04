# PandaDoc MCP Server Guide

This repository contains configuration files as well as skills and tools to help you integrate PandaDoc with LLMs and agent frameworks.

PandaDoc hosts a remote MCP server at [https://mcp.pandadoc.com/v1/mcp](https://mcp.pandadoc.com/v1/mcp). This allows secure MCP client access via OAuth. View the docs [here](https://developers.pandadoc.com/docs/how-to-use-the-pandadoc-mcp-server).

> [!NOTE]
> PandaDoc document creation, sending, and other operations volume and limits are also applied to the PandaDoc MCP server.
>
> Existing rate limits for PandaDoc Public API also apply to PandaDoc MCP server tools.
> For more information on Public API limts can be found in: https://developers.pandadoc.com/reference/limits

## Installation & Setup

### Connect to the PandaDoc MCP server

Different MCP clients require slightly different setups. Follow the instructions below for your specific client to connect to the PandaDoc MCP server.

#### Claude Desktop

To set up the PandaDoc MCP server in Claude Desktop:

1. Open your Claude Desktop and go to "Customize" -> "Connectors"
2. Click on the "+" button, then select **"... Add custom connector"**
3. You should see the screen for "Add custom connector", there you must enter:

  - Name: PandaDoc
  - Remote MCP server URL: [https://mcp.pandadoc.com/v1/mcp](https://mcp.pandadoc.com/v1/mcp)
  - Add

4. Click **Connect** to begin the authentication process. An external page will open.
5. Then click **Allow access** to consent and begin the authentication process with PandaDoc.
6. Click **Authorize** to authenticate and allow Claude to access your PandaDoc account.
7. After you finished the authentication, you should be prompt with an alert. Press the button "Open Claude" to go back to Claude Desktop.
8. Go back to Claude app, and you should see PandaDoc as one of your Custom connectors, and you're ready to start prompting in Claude.

#### Claude Code

To set up the PandaDoc MCP server in Claude Code:

1. Open your terminal, and run the following command into your terminal, then press enter:
  `claude mcp add pandadoc --transport http https://mcp.pandadoc.com/v1/mcp`
2. Type "claude" to get into Claude Code
3. Type `/mcp` and press **Enter** to open list of MCP servers you have installed.
4. Use the arrow key to navigate to the PandaDoc server and press **Enter** to to begin the authentication process. An external page will open.
5. Then click **Allow access** to consent and begin the authentication process with PandaDoc.
6. Click **Authorize** to authenticate and allow Claude Code to access your PandaDoc account.
7. After you finished the authentication, head back to the terminal and enter the /mcp command again.
8. The PandaDoc server should now display as connected, and you’re ready to start prompting in Claude Code.

#### OpenCode

To set up the PandaDoc MCP server in OpenCode:

1. Open your terminal, and run the following command into your terminal: `opencode mcp add`
2. Press Enter to start the process.
3. OpenCode will ask to enter the MCP server name, type "pandadoc" and press **Enter**
4. Next, OpenCode will ask to select the MCP server type, use the arrow key to navigate to "Remote" and press **Enter**
5. Then, OpenCode will ask to enter the MCP Server URL, type [https://mcp.pandadoc.com/v1/mcp](https://mcp.pandadoc.com/v1/mcp) and press **Enter**
6. Now, OpenCode will ask if the server require OAuth authentication, use the arrow key to navigate to "Yes" and press **Enter**
7. OpenCode will ask if "Do you have a pre-registered client ID?", use the arrow key to navigate to "No" and press **Enter**
8. OpenCode should end with a message: "MCP server added successfully".
9. Now, lets authenticate with your PandaDoc account by using the following command into your terminal: `opencode mcp auth pandadoc`
10. Press Enter again to begin the authentication process. An external page will open.
11. Then click **Allow access** to consent and begin the authentication process with PandaDoc.
12. Click **Authorize** to authenticate and allow OpenCode to access your PandaDoc account.
13. After you finished the authentication, head back to the terminal and enter OpenCode using the command `opencode`
14. Once inside OpenCode type `/mcp` in the prompt and press **Enter**.
15. You should see the "pandadoc" listed and "connected" showing it is connected.
16. Press ESC and you’re ready to start prompting in OpenCode.

#### Codex

To set up the PandaDoc MCP server in Codex desktop:

1. Open your Codex and click on "Settings -> Settings" in the left down corner.
2. In the settings view, select **"MCP servers"**.
3. In the MCP Servers listing, select **"+ Add server"**.
4. You should see the screen for "Connect to a custom MCP", there you must enter
  Name: PandaDoc
  Select "Streamable HTTP"
  URL: [https://mcp.pandadoc.com/v1/mcp](https://mcp.pandadoc.com/v1/mcp)
5. Save
6. Back in the MCP servers list, the button "Authenticate" should be showing next to the "settings" gear icon. **Click** on it to begin the authentication process. An external page will open.
7. Then click **Allow access** to consent and begin the authentication process with PandaDoc.
8. Click **Authorize** to authenticate and allow Codex to access your PandaDoc account.
9. After you finished the authentication, head back to the Codex window and go back to the app, and you’re ready to start prompting in Codex.

#### Cursor

To set up the PandaDoc MCP server in Cursor:

1. Open the command palette.
  
  On MacOS: `CMD + Shift + P`
  On Windows/Linux: `CTRL + Shift + P`

2. A list will be displayed, select the option **"View: Open MCP Settings"** and press **Enter**
3. Select **"Tools & MCPs"**
4. Under **"Installed MCP Servers"**, click in the button **"New MCP Server"**
5. It should open a `mcp.json` file, there make sure you add the PandaDoc MCP server inside the "mcpServers" object. It should look like this:

```json
{
  "mcpServers": {
    "pandadoc": {
      "url": "https://mcp.pandadoc.com/v1/mcp"
    }
  }
}
```

**Note:** if you had a previous MCP server configured, make sure you have the comas in the right place, for example:

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
7. A button "Authenticate" should be showing. **Click** on it to begin the authentication process. An external page will open.
8. Then click **Allow access** to consent and begin the authentication process with PandaDoc.
9. Then click **Authorize** to authenticate and allow Cursor to access your PandaDoc account.
10. After you finished the authentication, head back to the Cursor app, and you’re ready to start prompting in.

#### VSCode

To set up PandaDoc MCP server in VS Code:

1. Make sure you have GitHub co-pilot enabled.
2. Open the command palette and select **MCP: Add server...**
  
  On MacOS: `CMD + Shift + P`
  On Windows/Linux: `CTRL + Shift + P`

3. Select HTTP.
4. Paste the server URL https://mcp.pandadoc.com/v1/mcp in the search bar, then hit Enter.
5. Type in “PandaDoc” when it asks for a server ID, then hit Enter.
6. Your `mcp.json` file should be displayed with the PandaDoc MCP server configuration.
7. VS Code will prompt with an alert message to allow authentication, press the **Allow** button.
8. Another alert message with an URL will be displayed, click on the **Open** button to begin the authentication process. An external page will open.
9. Then click **Allow access** to consent and begin the authentication process with PandaDoc.
10. Click **Authorize** to authenticate and allow VS Code to access your PandaDoc account.
11. After you finished the authentication, head back to the VS Code window and go back to the app, and you’re ready to start prompting in VS Code.

#### Gemini (powered by geminicli)

To set up PandaDoc MCP server to be used with [Gemini](https://geminicli.com/):

1. Open your terminal, go to the folder where you want to work
2. Run the following command into your terminal: `gemini extensions install https://github.com/PandaDoc/mcp-server-guide`
3. Press Enter to start the process.

The instructions vary depending on the client. For instructions about installing skills for other clients, ask your client how to add a server or check your client’s documentation: Supported MCP clients

## License

[MIT](LICENSE)
