import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { McpServer, MCP_TOOLS } from '../dist/index.js';

describe('TopAI MCP Suite Standalone Clean-Sheet Venture Test Suite', () => {

  const server = new McpServer();

  test('1. Exposes all 9 Standard Developer Appliance Tools', () => {
    assert.equal(MCP_TOOLS.length, 9);
    const toolNames = MCP_TOOLS.map(t => t.name);

    assert.ok(toolNames.includes('agentpr_guard_audit'));
    assert.ok(toolNames.includes('tokenprune_wasm_trim'));
    assert.ok(toolNames.includes('dockerlean_wasm_audit'));
    assert.ok(toolNames.includes('cidr_shield_lookup'));
    assert.ok(toolNames.includes('terracost_blast_evaluate'));
    assert.ok(toolNames.includes('pack3d_wasm_pack'));
    assert.ok(toolNames.includes('flaky_quarantine_analyze'));
    assert.ok(toolNames.includes('sqltwin_stream_anonymize'));
    assert.ok(toolNames.includes('edgarpulse_parse_filing'));
  });

  test('2. Executes tokenprune_wasm_trim via MCP', async () => {
    const res = await server.executeTool('tokenprune_wasm_trim', {
      sourceCode: `export function hello(): string { return "world"; }`,
      filename: 'hello.ts'
    });

    assert.ok(res.prunedContent.includes('export function hello(): string'));
    assert.ok(res.tokensSaved >= 0);
  });

  test('3. Executes agentpr_guard_audit via MCP', async () => {
    const sampleDiff = `
diff --git a/app.ts b/app.ts
--- a/app.ts
+++ b/app.ts
@@ -1,1 +1,2 @@
+import { test } from 'react-use-modal-helper';
`;
    const res = await server.executeTool('agentpr_guard_audit', { diff: sampleDiff });
    assert.ok(res.report);
    assert.equal(res.report.isApproved, false);
    assert.ok(res.markdown.includes('Agent-PR Guard'));
  });

  test('4. Executes dockerlean_wasm_audit via MCP', async () => {
    const dockerfile = `
FROM node:latest
WORKDIR /app
COPY . .
RUN npm install
`;
    const res = await server.executeTool('dockerlean_wasm_audit', { dockerfileContent: dockerfile });
    assert.ok(res.report);
    assert.ok(res.report.leanScore < 80);
    assert.ok(res.markdown.includes('DockerLean'));
  });

  test('5. Executes cidr_shield_lookup via MCP', async () => {
    const res = await server.executeTool('cidr_shield_lookup', { ip: '3.5.10.1' });
    assert.ok(res);
    assert.equal(res.provider, 'AWS');
    assert.equal(res.category, 'DATACENTER');
  });

});
