#!/usr/bin/env node

import { McpServer } from '../src/index.ts';

if (process.argv.includes('-h') || process.argv.includes('--help')) {
  console.log(`
🌐 TopAI Sovereign MCP Suite — Unified Model Context Protocol Server
Exposes all 9 local developer appliances natively to Claude Desktop, Cursor, and Windsurf.

Usage in Claude Desktop / Cursor (claude_desktop_config.json):
{
  "mcpServers": {
    "topai-suite": {
      "command": "npx",
      "args": ["-y", "@topaisaas/mcp-suite"]
    }
  }
}
`);
  process.exit(0);
}

const server = new McpServer();
server.startStdio();
