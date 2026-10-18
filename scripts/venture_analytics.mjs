#!/usr/bin/env node
/**
 * TopAI Sovereign Studio — Quantitative Venture Analytics & Traction Dashboard
 * Queries GitHub Traffic API and NPM Registry autonomously with zero external SaaS dependencies.
 * Run: node scripts/venture_analytics.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const PACKAGES = [
  { name: '@topaisaas/sqltwin-stream', repo: 'sqltwin-stream', id: '01' },
  { name: '@topaisaas/pack3d-wasm', repo: 'pack3d-wasm', id: '02' },
  { name: '@topaisaas/cidr-shield-mmdb', repo: 'cidr-shield-mmdb', id: '03' },
  { name: '@topaisaas/flaky-quarantine', repo: 'flaky-quarantine', id: '04' },
  { name: '@topaisaas/terracost-blast', repo: 'terracost-blast', id: '05' },
  { name: '@topaisaas/edgarpulse-8k', repo: 'edgarpulse-8k', id: '06' },
  { name: '@topaisaas/agentpr-guard', repo: 'agentpr-guard', id: '07' },
  { name: '@topaisaas/tokenprune-wasm', repo: 'tokenprune-wasm', id: '08' },
  { name: '@topaisaas/dockerlean-wasm', repo: 'dockerlean-wasm', id: '09' },
  { name: '@topaisaas/mcp-suite', repo: 'mcp-suite', id: '10' }
];

// Try reading GitHub token from parent workspace .env.local
let githubToken = process.env.GITHUB_TOKEN || '';
try {
  const envPath = 'C:\\Users\\Admin\\Desktop\\projet 1 full IA\\.env.local';
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      if (line.startsWith('GITHUB_TOKEN=')) {
        githubToken = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
        break;
      }
    }
  }
} catch {}

async function fetchNpmMetadata(pkgName) {
  try {
    const res = await fetch(`https://registry.npmjs.org/${pkgName}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const data = await res.json();
    const versions = Object.keys(data.versions || {});
    return {
      latest: data['dist-tags']?.latest || 'N/A',
      versionCount: versions.length,
      publishedAt: data.time?.[versions[versions.length - 1]] || data.time?.modified || 'N/A'
    };
  } catch (err) {
    return { error: err.message };
  }
}

async function fetchGithubTraffic(repoName) {
  if (!githubToken) return { error: 'No GITHUB_TOKEN' };
  try {
    const headers = {
      'Authorization': `token ${githubToken}`,
      'User-Agent': 'TopAI-Venture-Tracker',
      'Accept': 'application/vnd.github.v3+json'
    };

    const [viewsRes, clonesRes, referrersRes] = await Promise.all([
      fetch(`https://api.github.com/repos/topaisaas-dev/${repoName}/traffic/views`, { headers }),
      fetch(`https://api.github.com/repos/topaisaas-dev/${repoName}/traffic/clones`, { headers }),
      fetch(`https://api.github.com/repos/topaisaas-dev/${repoName}/traffic/popular/referrers`, { headers })
    ]);

    const views = viewsRes.ok ? await viewsRes.json() : { count: 0, uniques: 0 };
    const clones = clonesRes.ok ? await clonesRes.json() : { count: 0, uniques: 0 };
    const referrers = referrersRes.ok ? await referrersRes.json() : [];

    return {
      views: views.count || 0,
      uniqueVisitors: views.uniques || 0,
      clones: clones.count || 0,
      uniqueCloners: clones.uniques || 0,
      topReferrers: referrers.map(r => `${r.referrer} (${r.count})`).join(', ') || 'Direct'
    };
  } catch (err) {
    return { error: err.message };
  }
}

async function run() {
  console.log('\n========================================================================================');
  console.log('       TOPAI SOVEREIGN STUDIO — QUANTITATIVE VENTURE TRACTION DASHBOARD');
  console.log('========================================================================================\n');
  console.log(`[Target Organization] : github.com/topaisaas-dev | npmjs.com/org/topaisaas`);
  console.log(`[Timestamp]           : ${new Date().toISOString()}\n`);

  const results = [];

  for (const pkg of PACKAGES) {
    process.stdout.write(`Fetching metrics for ${pkg.name}... `);
    const [npm, gh] = await Promise.all([
      fetchNpmMetadata(pkg.name),
      fetchGithubTraffic(pkg.repo)
    ]);
    process.stdout.write('Done.\n');

    results.push({
      id: pkg.id,
      name: pkg.name.replace('@topaisaas/', ''),
      npmVersion: npm.latest || 'N/A',
      views: gh.views ?? '-',
      uniques: gh.uniqueVisitors ?? '-',
      clones: gh.clones ?? '-',
      uniquesCloners: gh.uniqueCloners ?? '-',
      topReferrers: gh.topReferrers || '-'
    });
  }

  console.log('\n----------------------------------------------------------------------------------------');
  console.log('| ID | Venture Package            | NPM Ver | Views | Visitors | Clones | Cloners | Referrers   |');
  console.log('----------------------------------------------------------------------------------------');
  for (const r of results) {
    const id = r.id.padEnd(2);
    const name = r.name.padEnd(26);
    const ver = r.npmVersion.padEnd(7);
    const views = String(r.views).padStart(5);
    const visitors = String(r.uniques).padStart(8);
    const clones = String(r.clones).padStart(6);
    const cloners = String(r.uniquesCloners).padStart(7);
    const ref = (r.topReferrers.length > 11 ? r.topReferrers.substring(0, 11) : r.topReferrers).padEnd(11);
    console.log(`| ${id} | ${name} | ${ver} | ${views} | ${visitors} | ${clones} | ${cloners} | ${ref} |`);
  }
  console.log('----------------------------------------------------------------------------------------\n');

  console.log('💡 DIAGNOSTIC GUIDANCE & INTERPRETATION:');
  console.log('1. NPM Downloads aggregate daily at ~04:00 UTC via npm batch data.');
  console.log('2. GitHub Traffic indicates initial crawler and developer clone activities.');
  console.log('3. Bottom-of-Funnel collisions can be tracked via Polar checkout visits & webhooks.\n');
}

run().catch(console.error);
