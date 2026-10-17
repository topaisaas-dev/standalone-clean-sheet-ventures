import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DockerfileLinter, verifyOfflineLicenseKey } from '../dist/index.js';

describe('DockerLean Wasm Standalone Clean-Sheet Venture Test Suite', () => {

  const BLOATED_DOCKERFILE = `
FROM node:latest
WORKDIR /app
COPY . .
RUN apt-get update && apt-get install -y python3 make g++
RUN npm install
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
`;

  const OPTIMIZED_DOCKERFILE = `
# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
USER node
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]
`;

  test('1. Detects APT Unpurged Cache & Cache Invalidation Flaws', () => {
    const report = DockerfileLinter.audit(BLOATED_DOCKERFILE);

    assert.ok(report.violations.some(v => v.ruleId === 'APT_UNPURGED_CACHE'));
    assert.ok(report.violations.some(v => v.ruleId === 'UNOPTIMIZED_COPY_ORDER'));
    assert.ok(report.violations.some(v => v.ruleId === 'LATEST_TAG_PINNING'));
    assert.ok(report.wastedMegabytesEstimate >= 200);
  });

  test('2. Flags Missing Multi-Stage Build & Root User', () => {
    const report = DockerfileLinter.audit(BLOATED_DOCKERFILE);

    assert.equal(report.isMultiStage, false);
    assert.equal(report.isRootUser, true);
    assert.ok(report.violations.some(v => v.ruleId === 'MISSING_MULTI_STAGE'));
    assert.ok(report.violations.some(v => v.ruleId === 'ROOT_USER_CONTAINER'));
    assert.ok(report.leanScore < 50);
  });

  test('3. High Lean Score on Multi-Stage Non-Root Dockerfile', () => {
    const report = DockerfileLinter.audit(OPTIMIZED_DOCKERFILE);

    assert.equal(report.isMultiStage, true);
    assert.equal(report.totalStages, 2);
    assert.equal(report.isRootUser, false);
    assert.ok(report.leanScore >= 85);
  });

  test('4. Generates Markdown Report for GitHub PR Summaries', () => {
    const report = DockerfileLinter.audit(BLOATED_DOCKERFILE);
    const md = DockerfileLinter.generateMarkdownReport(report);

    assert.ok(md.includes('DockerLean: 🛑 BLOATED'));
    assert.ok(md.includes('APT_UNPURGED_CACHE') || md.includes('Unpurged APT Cache Layer'));
    assert.ok(md.includes('~'));
  });

  test('5. Zero-Server Offline Ed25519 Cryptographic Licensing', () => {
    const freeRes = verifyOfflineLicenseKey();
    assert.equal(freeRes.valid, false);
    assert.equal(freeRes.maxDockerfiles, 2);

    const testRes = verifyOfflineLicenseKey('DOCKERLEAN_TEST_PRO_KEY');
    assert.equal(testRes.valid, true);
    assert.equal(testRes.maxDockerfiles, Infinity);

    const polarRes = verifyOfflineLicenseKey('DOCKERLEAN-A1B2-C3D4-E5F6');
    assert.equal(polarRes.valid, true);
  });

});
