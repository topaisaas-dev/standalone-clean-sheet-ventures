# @topaisaas/mcp-suite

> **Unified Model Context Protocol (MCP) Server for the TopAI Sovereign Appliance Suite.**  
> Exposes 9 high-performance, deterministic developer tools natively to Claude Desktop, Cursor, and Windsurf via standard JSON-RPC 2.0 stdio.

[![npm version](https://img.shields.io/npm/v/@topaisaas/mcp-suite.svg)](https://www.npmjs.com/package/@topaisaas/mcp-suite)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io)

---

## ⚡ 1-Click Integration in Claude Desktop or Cursor

Add this to your `claude_desktop_config.json` or `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "topai-suite": {
      "command": "npx",
      "args": ["-y", "@topaisaas/mcp-suite"]
    }
  }
}
```

---

## 🛠️ The 9 Built-in Developer Tools

| MCP Tool Name | Description |
| :--- | :--- |
| `agentpr_guard_audit` | Audits git diffs for AI hallucinations, typosquatting & architectural leaks. |
| `tokenprune_wasm_trim` | Prunes source code AST to save 50%-70% of prompt tokens in LLMs. |
| `dockerlean_wasm_audit` | Audits Dockerfile for 12 layer bloat anti-patterns and security risks. |
| `sqltwin_stream_anonymize` | Anonymizes SQL dumps preserving 100% of foreign keys and unique constraints. |
| `terracost_blast_evaluate` | Air-gapped blast radius & monthly FinOps cost delta for Terraform plans. |
| `flaky_quarantine_analyze` | Markov chain flaky test detection and automated Playwright/Jest isolation. |
| `pack3d_wasm_pack` | 3D extreme point container packing and volumetric weight calculation. |
| `cidr_shield_lookup` | Microsecond threat & cloud datacenter IP range detection. |
| `edgarpulse_parse_filing` | Deterministic SEC Form 4 and Form 8-K insider cluster buying alpha engine. |

---

## 📄 License

Apache-2.0. Copyright (c) 2026 TopAI Sovereign Studio.
