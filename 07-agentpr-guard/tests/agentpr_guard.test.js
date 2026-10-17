import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  DiffParser,
  SupplyChainAudit,
  BoundaryEnforcer,
  AgentPrGuard,
  verifyOfflineLicenseKey
} from '../dist/index.js';

describe('Agent-PR Guard Standalone Clean-Sheet Venture Test Suite', () => {

  const SAMPLE_DIFF = `
diff --git a/src/components/UserProfile.tsx b/src/components/UserProfile.tsx
index 1234567..89abcdef 100644
--- a/src/components/UserProfile.tsx
+++ b/src/components/UserProfile.tsx
@@ -1,5 +1,8 @@
 import React from 'react';
+import { useModal } from 'react-use-modal-helper';
+import { Client } from 'pg';
 
 export function UserProfile() {
+  const client = new Client();
   return <div>User Profile</div>;
 }
diff --git a/package.json b/package.json
index 1111111..2222222 100644
--- a/package.json
+++ b/package.json
@@ -10,6 +10,7 @@
   "dependencies": {
     "react": "^18.0.0",
+    "recat": "^18.0.0",
+    "react-use-modal-helper": "^1.0.0"
   }
 }
`;

  test('1. Unified Diff Parsing and Line Extraction', () => {
    const scan = DiffParser.parseUnifiedDiff(SAMPLE_DIFF);
    assert.equal(scan.totalFiles, 2);
    assert.ok(scan.totalAdditions >= 5);
    
    const uiFile = scan.files.find(f => f.path.includes('UserProfile.tsx'));
    assert.ok(uiFile);
    assert.ok(uiFile.addedImports.includes('react-use-modal-helper'));
    assert.ok(uiFile.addedImports.includes('pg'));
  });

  test('2. Supply Chain Hallucination & Typosquatting Detection', () => {
    const hallucination = SupplyChainAudit.auditPackage('react-use-modal-helper');
    assert.ok(hallucination);
    assert.equal(hallucination.type, 'HALLUCINATED_PACKAGE');

    const typosquat = SupplyChainAudit.auditPackage('recat');
    assert.ok(typosquat);
    assert.equal(typosquat.type, 'TYPOSQUATTING_RISK');

    const validPkg = SupplyChainAudit.auditPackage('react');
    assert.equal(validPkg, null);
  });

  test('3. Boundary Enforcer: Client-Backend Boundary Breaches', () => {
    const scan = DiffParser.parseUnifiedDiff(SAMPLE_DIFF);
    const uiFile = scan.files.find(f => f.path.includes('UserProfile.tsx'));
    const violations = BoundaryEnforcer.evaluateFile(uiFile);

    assert.ok(violations.some(v => v.rule === 'CLIENT_BACKEND_LEAK' && v.message.includes('pg')));
  });

  test('4. Full PR Audit Report Generation & Scoring', () => {
    const report = AgentPrGuard.auditDiff(SAMPLE_DIFF);
    assert.equal(report.isApproved, false);
    assert.ok(report.integrityScore < 75);
    assert.ok(report.supplyChainViolations.length >= 2);
    assert.ok(report.architectureViolations.length >= 1);

    const md = AgentPrGuard.generateMarkdownReport(report);
    assert.ok(md.includes('Agent-PR Guard: 🛑 REJECTED'));
    assert.ok(md.includes('react-use-modal-helper'));
  });

  test('5. Zero-Server Offline Ed25519 Cryptographic Licensing', () => {
    const freeRes = verifyOfflineLicenseKey();
    assert.equal(freeRes.valid, false);
    assert.equal(freeRes.maxPrsPerDay, 3);

    const testRes = verifyOfflineLicenseKey('AGENTPR_TEST_PRO_KEY');
    assert.equal(testRes.valid, true);
    assert.equal(testRes.maxPrsPerDay, Infinity);

    const polarRes = verifyOfflineLicenseKey('AGENTPR-A1B2-C3D4-E5F6');
    assert.equal(polarRes.valid, true);
  });

});
