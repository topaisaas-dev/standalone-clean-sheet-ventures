import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { McpServer, MCP_TOOLS, QuotaManager } from '../dist/index.js';

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

  test('6. QuotaManager allows free tier calls up to 25 and blocks call 26 with paywall', () => {
    const quota = QuotaManager.getInstance();
    quota.resetForTesting({ totalCalls: 0 });

    for (let i = 1; i <= 25; i++) {
      const evalResult = quota.recordAndEvaluate({ toolName: 'tokenprune_wasm_trim' });
      assert.equal(evalResult.allowed, true);
      assert.equal(evalResult.callCount, i);
      assert.equal(evalResult.isLicensed, false);
    }

    // Call 26 must trigger paywall
    const blockedEval = quota.recordAndEvaluate({ toolName: 'tokenprune_wasm_trim' });
    assert.equal(blockedEval.allowed, false);
    assert.equal(blockedEval.callCount, 26);
    assert.ok(blockedEval.paywallMessage.includes('TOPAI SUITE QUOTA EXCEEDED'));
    assert.ok(blockedEval.paywallMessage.includes('https://buy.polar.sh/'));
  });

  test('7. QuotaManager bypasses paywall under emergency grace', () => {
    const quota = QuotaManager.getInstance();
    quota.resetForTesting({ totalCalls: 30 }); // over quota

    const evalGrace = quota.recordAndEvaluate({ toolName: 'tokenprune_wasm_trim', hasEmergencyGrace: true });
    assert.equal(evalGrace.allowed, true);
    assert.equal(evalGrace.isEmergencyGrace, true);
    assert.ok(evalGrace.roiFooter.includes('Emergency Grace Active'));
  });

  test('8. QuotaManager verifies offline Pro license key', () => {
    const quota = QuotaManager.getInstance();
    quota.resetForTesting({ totalCalls: 50 }); // over quota

    const validKey = 'AGENTPR-ED25519-VERIFIED-PRO';
    const evalLicensed = quota.recordAndEvaluate({
      toolName: 'agentpr_guard_audit',
      licenseKey: validKey
    });

    assert.equal(evalLicensed.allowed, true);
    assert.equal(evalLicensed.isLicensed, true);
    assert.ok(evalLicensed.roiFooter.includes('Pro License Active'));
  });

  test('9. QuotaManager accumulates tokens saved and calculates dollars saved', () => {
    const quota = QuotaManager.getInstance();
    quota.resetForTesting({ totalCalls: 0, tokensSavedTotal: 0, dollarsSavedTotal: 0 });

    quota.recordCallMetrics(1_000_000, true);
    const evalResult = quota.recordAndEvaluate({ toolName: 'tokenprune_wasm_trim' });

    assert.equal(evalResult.tokensSavedTotal, 1_000_000);
    assert.equal(evalResult.dollarsSavedTotal, 3.0);
    assert.ok(evalResult.roiFooter.includes('$3.00'));
  });

  test('10. MCP_TOOLS have licenseKey and strict TDQS annotations', () => {
    for (const tool of MCP_TOOLS) {
      assert.ok(tool.inputSchema.properties.licenseKey, `Tool ${tool.name} must declare licenseKey`);
      assert.equal(tool.inputSchema.additionalProperties, false);
      assert.ok(tool.annotations);
      assert.equal(tool.annotations.readOnlyHint, true);
      assert.equal(tool.annotations.idempotentHint, true);
    }
  });

});
