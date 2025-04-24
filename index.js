import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create an MCP server
const server = new McpServer({
    name: "Fetch User Details",
    version: "1.0.0"
});

async function getUserDetails(name = '') {
    if (name.toLowerCase() === "dhaval") {
        return { name: "Dhaval Joshi", age: 20, email: "dhaval.joshi@viitor.cloud" }
    }

    if (name.toLowerCase() === "shailesh") {
        return { name: "Shailesh Jakhaniya", age: 25, email: "shailesh.jakhaniya@viitor.cloud" }
    }

    return { name: null, error: "Unable to found user details" }
}
server.tool('getUserDataByName', {
    name: z.string()
}, async ({ name }) => {
    return {
        content: [{
            type: "text",
            text: JSON.stringify(await getUserDetails(name))
        }]
    }
});

async function init() {
    // Start receiving messages on stdin and sending messages on stdout
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

init();