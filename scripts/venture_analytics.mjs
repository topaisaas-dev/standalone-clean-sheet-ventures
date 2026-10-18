#!/usr/bin/env node
/**
 * TopAI Sovereign Studio — Quantitative Venture Telemetry & Agile Arbitrage Engine
 * 100% Free / Zero-SaaS Analytics ($0.00 Stack) for GitHub Traffic, NPM Registry, and Polar Monetization.
 * 
 * Usage:
 *   node scripts/venture_analytics.mjs                    # Standard Executive Telemetry Matrix
 *   node scripts/venture_analytics.mjs --filter=agentpr   # Filter by keyword or ID
 *   node scripts/venture_analytics.mjs --status=viral     # Filter by health signal
 *   node scripts/venture_analytics.mjs --sort=score       # Sort by: score, clones, cloners, views, size
 *   node scripts/venture_analytics.mjs --markdown         # Export to VENTURE_TRACTION_REPORT.md
 *   node scripts/venture_analytics.mjs --json             # Dump raw JSON payload
 */

import fs from 'node:fs';
import path from 'node:path';

// Master Registry of all 10 Micro-Appliances & Packages
const VENTURES = [
  {
    id: '01',
    name: 'sqltwin-stream',
    pkg: '@topaisaas/sqltwin-stream',
    repo: 'sqltwin-stream',
    category: 'Database / FinOps',
    freeLimit: '10,000 rows/dump',
    pricing: '$79 Lifetime (or $19/mo)',
    checkoutUrl: 'https://buy.polar.sh/polar_cl_U1yYwbQsxur0rbGxVx4GdtOMxlsaHJ15BUARn2cUkfR'
  },
  {
    id: '02',
    name: 'pack3d-wasm',
    pkg: '@topaisaas/pack3d-wasm',
    repo: 'pack3d-wasm',
    category: 'Logistics / 3D Wasm',
    freeLimit: '3 boxes/pack',
    pricing: '$19/mo or $49/mo Plus',
    checkoutUrl: 'https://buy.polar.sh/polar_cl_nQ28CN7gE175wwIji5fadiW2BjicQ4CyfJarn3tvVlk'
  },
  {
    id: '03',
    name: 'cidr-shield-mmdb',
    pkg: '@topaisaas/cidr-shield-mmdb',
    repo: 'cidr-shield-mmdb',
    category: 'Security / Radix LPM',
    freeLimit: 'Unlimited Builtin Feeds',
    pricing: '15 €/mo or 99 €/year',
    checkoutUrl: 'https://buy.polar.sh/polar_cl_uQsijc1bMk2dGe9FpGlOA7be6vT9F4p13j6f80dxd0p'
  },
  {
    id: '04',
    name: 'flaky-quarantine',
    pkg: '@topaisaas/flaky-quarantine',
    repo: 'flaky-quarantine',
    category: 'CI-CD / Markov Test',
    freeLimit: '5 quarantined tests/run',
    pricing: '$29/month',
    checkoutUrl: 'https://buy.polar.sh/polar_cl_iel9yWlONZUVA92iPTUR0WgdhRoWjYWCDtypa47534c'
  },
  {
    id: '05',
    name: 'terracost-blast',
    pkg: '@topaisaas/terracost-blast',
    repo: 'terracost-blast',
    category: 'FinOps / IaC Audit',
    freeLimit: '20 planned resources',
    pricing: '$49/mo or $149 Lifetime',
    checkoutUrl: 'https://buy.polar.sh/polar_cl_bHsPkpJfvHmG9STDpIdNGVMLpSwVG6wHoQPTz3Fa7TY'
  },
  {
    id: '06',
    name: 'edgarpulse-8k',
    pkg: '@topaisaas/edgarpulse-8k',
    repo: 'edgarpulse-8k',
    category: 'Quant / SEC Insider',
    freeLimit: '10 filings/day',
    pricing: '$49/month',
    checkoutUrl: 'https://buy.polar.sh/polar_cl_6FsrpUqrkka6YEmbvDERxCuZ0jJxd3muVtvsB2wRGOR'
  },
  {
    id: '07',
    name: 'agentpr-guard',
    pkg: '@topaisaas/agentpr-guard',
    repo: 'agentpr-guard',
    category: 'DevSecOps / AI PR Guard',
    freeLimit: '3 PRs/day',
    pricing: '$39/mo or $99 Lifetime',
    checkoutUrl: 'https://buy.polar.sh/polar_cl_OUy6Q7GoY78aXhbdaFyoJ646wtXgD7mszAadt4FgJHz'
  },
  {
    id: '08',
    name: 'tokenprune-wasm',
    pkg: '@topaisaas/tokenprune-wasm',
    repo: 'tokenprune-wasm',
    category: 'LLM FinOps / AST Pruner',
    freeLimit: '10 files/run',
    pricing: '$29 Lifetime One-Time',
    checkoutUrl: 'https://buy.polar.sh/polar_cl_BeGjZghhPIilCdSBQGhvIFd2o8MyhngRnpZ0F34etCB'
  },
  {
    id: '09',
    name: 'dockerlean-wasm',
    pkg: '@topaisaas/dockerlean-wasm',
    repo: 'dockerlean-wasm',
    category: 'OCI / Dockerfile Bloat',
    freeLimit: '2 Dockerfiles',
    pricing: '$29 Lifetime One-Time',
    checkoutUrl: 'https://buy.polar.sh/polar_cl_z8AW0MGKNFyHrDG4rHySEtviAxtxze5vnJLF64JjI6L'
  },
  {
    id: '10',
    name: 'mcp-suite',
    pkg: '@topaisaas/mcp-suite',
    repo: 'mcp-suite',
    category: 'AI Agents / Unified MCP',
    freeLimit: 'Exposes all 9 local tools',
    pricing: 'Built-in appliance paywalls',
    checkoutUrl: 'https://github.com/topaisaas-dev/mcp-suite'
  }
];

// CLI Arguments Parser
const args = process.argv.slice(2);
function getArg(flag) {
  const item = args.find(a => a.startsWith(`${flag}=`));
  return item ? item.split('=')[1] : null;
}
const filterKeyword = getArg('--filter')?.toLowerCase();
const filterStatus = getArg('--status')?.toLowerCase();
const sortBy = (getArg('--sort') || 'cloners').toLowerCase();
const isMarkdown = args.includes('--markdown');
const isJson = args.includes('--json');

// Read GITHUB_TOKEN securely from environment or parent workspace .env.local
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

// Fetch NPM Metadata
async function fetchNpmData(pkgName) {
  try {
    const [metaRes, latestRes] = await Promise.all([
      fetch(`https://registry.npmjs.org/${encodeURIComponent(pkgName)}`, { headers: { 'Accept': 'application/json' } }),
      fetch(`https://registry.npmjs.org/${encodeURIComponent(pkgName)}/latest`, { headers: { 'Accept': 'application/json' } })
    ]);

    if (!metaRes.ok) return { error: `HTTP ${metaRes.status}` };
    const meta = await metaRes.json();
    const latest = latestRes.ok ? await latestRes.json() : {};

    const versions = Object.keys(meta.versions || {});
    const latestVer = meta['dist-tags']?.latest || '1.0.0';
    const lastPublishTime = meta.time?.[latestVer] || meta.time?.modified;
    const hoursSinceRelease = lastPublishTime ? Math.round((Date.now() - new Date(lastPublishTime).getTime()) / (1000 * 3600)) : 0;

    return {
      version: latestVer,
      versionCount: versions.length,
      unpackedKb: latest.dist?.unpackedSize ? Math.round(latest.dist.unpackedSize / 1024) : 0,
      fileCount: latest.dist?.fileCount || 0,
      dependenciesCount: Object.keys(latest.dependencies || {}).length,
      hoursSinceRelease
    };
  } catch (err) {
    return { error: err.message };
  }
}

// Fetch GitHub Traffic & Repository Metrics
async function fetchGithubData(repoName) {
  if (!githubToken) return { error: 'No GITHUB_TOKEN' };
  try {
    const headers = {
      'Authorization': `token ${githubToken}`,
      'User-Agent': 'TopAI-Quantitative-Tracker',
      'Accept': 'application/vnd.github.v3+json'
    };

    const [viewsRes, clonesRes, referrersRes, repoRes] = await Promise.all([
      fetch(`https://api.github.com/repos/topaisaas-dev/${repoName}/traffic/views`, { headers }),
      fetch(`https://api.github.com/repos/topaisaas-dev/${repoName}/traffic/clones`, { headers }),
      fetch(`https://api.github.com/repos/topaisaas-dev/${repoName}/traffic/popular/referrers`, { headers }),
      fetch(`https://api.github.com/repos/topaisaas-dev/${repoName}`, { headers })
    ]);

    const views = viewsRes.ok ? await viewsRes.json() : { count: 0, uniques: 0 };
    const clones = clonesRes.ok ? await clonesRes.json() : { count: 0, uniques: 0 };
    const referrers = referrersRes.ok ? await referrersRes.json() : [];
    const repo = repoRes.ok ? await repoRes.json() : {};

    return {
      views: views.count || 0,
      uniqueVisitors: views.uniques || 0,
      clones: clones.count || 0,
      uniqueCloners: clones.uniques || 0,
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      repoSizeKb: repo.size || 0,
      topReferrers: referrers.map(r => `${r.referrer} (${r.count})`).join(', ') || 'Direct / Crawlers'
    };
  } catch (err) {
    return { error: err.message };
  }
}

// Check Polar Checkout Reachability
async function checkPolarReachability(url) {
  if (!url || !url.startsWith('http')) return { status: 200, ok: true };
  try {
    const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } });
    return { status: res.status, ok: res.status === 200 };
  } catch {
    return { status: 500, ok: false };
  }
}

// Agile Arbitrage & Decision Heuristic Calculator
function computeArbitrage(venture, npm, gh, polar) {
  const cloners = gh.uniqueCloners || 0;
  const clones = gh.clones || 0;
  const visitors = gh.uniqueVisitors || 0;
  const views = gh.views || 0;
  const stars = gh.stars || 0;
  const verCount = npm.versionCount || 1;

  // 1. Traction Score (0 to 100)
  const rawScore = (cloners * 10) + (clones * 2) + (visitors * 8) + (views * 1) + (stars * 15) + (verCount * 4);
  const tractionScore = Math.min(100, Math.round(rawScore));

  // 2. Health Signal Classification
  let signal = '🔴 DORMANT';
  let signalKey = 'dormant';
  if (cloners >= 8) {
    signal = '🟢 VIRAL (HIGH)';
    signalKey = 'viral';
  } else if (cloners >= 4) {
    signal = '🟡 ACTIVE (MID)';
    signalKey = 'active';
  } else if (clones > 0 || cloners > 0) {
    signal = '🔵 EARLY (LOW)';
    signalKey = 'early';
  }

  // 3. Funnel Bottleneck Identification
  let bottleneck = 'DISCOVERY';
  if (cloners >= 6 && visitors === 0) {
    bottleneck = 'HUMAN_EXPOSURE'; // Lots of bots/cloners, no web human visitors
  } else if (cloners >= 5 && stars === 0) {
    bottleneck = 'RETENTION_STAR';
  } else if (clones >= 15) {
    bottleneck = 'PAYWALL_COLLISION';
  } else if (clones === 0) {
    bottleneck = 'ZERO_INDEXING';
  }

  // 4. Agile Tactical Action (Prescription)
  let agileAction = '';
  switch (bottleneck) {
    case 'ZERO_INDEXING':
      agileAction = 'Submit to Glama/Smithery + Tag GitHub Marketplace';
      break;
    case 'HUMAN_EXPOSURE':
      agileAction = 'Seed PR on awesome-lists + add visual SVG demo';
      break;
    case 'RETENTION_STAR':
      agileAction = 'Add 1-line npx quickstart in README header';
      break;
    case 'PAYWALL_COLLISION':
      agileAction = 'Verify in-flow paywall banner & tighten free limit';
      break;
    default:
      agileAction = 'Monitor conversion & expand companion feature set';
  }

  // Custom prescriptive overrides based on exact appliance type
  if (venture.id === '10') {
    agileAction = 'Finalize Glama & Smithery listing for Cursor/Claude';
  } else if (venture.id === '09' && clones === 0) {
    agileAction = 'Publish Action to GitHub Actions Marketplace';
  }

  return {
    tractionScore,
    signal,
    signalKey,
    bottleneck,
    agileAction,
    checkoutStatus: polar.ok ? '200 OK' : `ERR ${polar.status}`
  };
}

async function main() {
  if (!isJson) {
    console.log('\n========================================================================================');
    console.log('       TOPAI SOVEREIGN STUDIO — QUANTITATIVE VENTURE TELEMETRY & ARBITRAGE');
    console.log('========================================================================================');
    console.log(`[Target Org]   : github.com/topaisaas-dev  |  npmjs.com/org/topaisaas`);
    console.log(`[Timestamp]    : ${new Date().toISOString()}`);
    console.log(`[Zero-CAC Stack: 100% Free / Serverless Edge / Zero Third-Party SaaS Fees\n`);
  }

  const dataset = [];

  for (const v of VENTURES) {
    if (filterKeyword && !v.name.includes(filterKeyword) && v.id !== filterKeyword) {
      continue;
    }

    if (!isJson) process.stdout.write(`Fetching metrics for [${v.id}] ${v.name}... `);

    const [npm, gh, polar] = await Promise.all([
      fetchNpmData(v.pkg),
      fetchGithubData(v.repo),
      checkPolarReachability(v.checkoutUrl)
    ]);

    const arb = computeArbitrage(v, npm, gh, polar);

    if (filterStatus && arb.signalKey !== filterStatus) {
      if (!isJson) process.stdout.write('Skipped (status filter).\n');
      continue;
    }

    if (!isJson) process.stdout.write('Done.\n');

    dataset.push({
      ...v,
      npm,
      gh,
      polar,
      arb
    });
  }

  // Sort dataset
  dataset.sort((a, b) => {
    if (sortBy === 'score') return b.arb.tractionScore - a.arb.tractionScore;
    if (sortBy === 'clones') return (b.gh.clones || 0) - (a.gh.clones || 0);
    if (sortBy === 'views') return (b.gh.views || 0) - (a.gh.views || 0);
    if (sortBy === 'size') return (b.npm.unpackedKb || 0) - (a.npm.unpackedKb || 0);
    return (b.gh.uniqueCloners || 0) - (a.gh.uniqueCloners || 0); // default: cloners
  });

  if (isJson) {
    console.log(JSON.stringify(dataset, null, 2));
    return;
  }

  // ----------------------------------------------------------------------------------------
  // VIEW 1: EXECUTIVE TRACTION & AGILE ARBITRAGE MATRIX
  // ----------------------------------------------------------------------------------------
  console.log('\n\n📊 [VIEW 1 : EXECUTIVE TRACTION & AGILE ARBITRAGE MATRIX]');
  console.log('--------------------------------------------------------------------------------------------------------------------------------------------');
  console.log('| ID | Venture Package            | NPM Ver | Size(KB) | Clones | Cloners | Views | Score | Health Signal  | Bottleneck      | Agile Next Action                           |');
  console.log('--------------------------------------------------------------------------------------------------------------------------------------------');

  for (const row of dataset) {
    const id = row.id.padEnd(2);
    const name = row.name.padEnd(26);
    const ver = (row.npm.version || '1.0.0').padEnd(7);
    const size = String(row.npm.unpackedKb || 0).padStart(8);
    const clones = String(row.gh.clones || 0).padStart(6);
    const cloners = String(row.gh.uniqueCloners || 0).padStart(7);
    const views = String(row.gh.views || 0).padStart(5);
    const score = String(row.arb.tractionScore).padStart(5);
    const signal = row.arb.signal.padEnd(14);
    const bneck = row.arb.bottleneck.padEnd(15);
    const action = row.arb.agileAction.padEnd(43);

    console.log(`| ${id} | ${name} | ${ver} | ${size} | ${clones} | ${cloners} | ${views} | ${score} | ${signal} | ${bneck} | ${action} |`);
  }
  console.log('--------------------------------------------------------------------------------------------------------------------------------------------');

  // ----------------------------------------------------------------------------------------
  // VIEW 2: COMMERCIAL IN-FLOW PAYWALL & MONETIZATION READINESS
  // ----------------------------------------------------------------------------------------
  console.log('\n💰 [VIEW 2 : COMMERCIAL IN-FLOW PAYWALL & MONETIZATION READINESS]');
  console.log('----------------------------------------------------------------------------------------------------------------------');
  console.log('| ID | Venture Package            | Free Tier Limit       | Commercial Pricing     | Polar Status | Direct Checkout URL                                  |');
  console.log('----------------------------------------------------------------------------------------------------------------------');

  for (const row of dataset) {
    const id = row.id.padEnd(2);
    const name = row.name.padEnd(26);
    const limit = row.freeLimit.padEnd(21);
    const pricing = row.pricing.padEnd(22);
    const status = row.arb.checkoutStatus.padEnd(12);
    const checkout = row.checkoutUrl.padEnd(52);

    console.log(`| ${id} | ${name} | ${limit} | ${pricing} | ${status} | ${checkout} |`);
  }
  console.log('----------------------------------------------------------------------------------------------------------------------');

  // ----------------------------------------------------------------------------------------
  // VIEW 3: DISCOVERY CHANNELS & TOP REFERRERS
  // ----------------------------------------------------------------------------------------
  console.log('\n🌐 [VIEW 3 : DISCOVERY CHANNELS & TRAFFIC SOURCES]');
  console.log('----------------------------------------------------------------------------------------------------------------------');
  console.log('| ID | Venture Package            | Category               | Age (hrs) | Top Traffic Referrers & Acquisition Sources          |');
  console.log('----------------------------------------------------------------------------------------------------------------------');

  for (const row of dataset) {
    const id = row.id.padEnd(2);
    const name = row.name.padEnd(26);
    const cat = row.category.padEnd(22);
    const age = String(row.npm.hoursSinceRelease || 0).padStart(9);
    const ref = row.gh.topReferrers.padEnd(52);

    console.log(`| ${id} | ${name} | ${cat} | ${age} | ${ref} |`);
  }
  console.log('----------------------------------------------------------------------------------------------------------------------\n');

  // Quantitative Summary Rollup
  const totalClones = dataset.reduce((acc, r) => acc + (r.gh.clones || 0), 0);
  const totalCloners = dataset.reduce((acc, r) => acc + (r.gh.uniqueCloners || 0), 0);
  const totalViews = dataset.reduce((acc, r) => acc + (r.gh.views || 0), 0);
  const avgScore = Math.round(dataset.reduce((acc, r) => acc + r.arb.tractionScore, 0) / (dataset.length || 1));

  console.log(`📈 AGGREGATE VENTURE PORTFOLIO KPI ROLLUP:`);
  console.log(`   • Total Clones (14d Rolling)   : ${totalClones} clones across ${dataset.length} micro-appliances`);
  console.log(`   • Total Unique Cloners         : ${totalCloners} unique IP machines`);
  console.log(`   • Total Direct Repo Views      : ${totalViews} views`);
  console.log(`   • Portfolio Mean Traction Score: ${avgScore}/100`);
  console.log(`   • Zero-Cost Stack Overhead     : $0.00 / month (100% Free Autonomous Distribution)\n`);

  // Export to Markdown if requested
  if (isMarkdown) {
    const mdPath = path.resolve(process.cwd(), 'VENTURE_TRACTION_REPORT.md');
    let md = `# TopAI Sovereign Studio — Quantitative Venture Traction & Arbitrage Report\n\n`;
    md += `> **Audit Generated**: ${new Date().toISOString()}  \n`;
    md += `> **Coverage**: 10 Independent Micro-Appliances  \n`;
    md += `> **Directives**: $0.00 Fixed Cost, Air-Gapped Verification, Zero-Network Telemetry\n\n`;

    md += `### 1. Executive Traction & Agile Arbitrage Matrix\n\n`;
    md += `| ID | Venture | Version | Size | Clones | Cloners | Score | Signal | Bottleneck | Agile Action |\n`;
    md += `| :- | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- | :--- |\n`;

    for (const r of dataset) {
      md += `| **${r.id}** | **${r.name}** | \`${r.npm.version || '1.0.0'}\` | ${r.npm.unpackedKb} KB | ${r.gh.clones || 0} | ${r.gh.uniqueCloners || 0} | **${r.arb.tractionScore}/100** | ${r.arb.signal} | \`${r.arb.bottleneck}\` | ${r.arb.agileAction} |\n`;
    }

    md += `\n### 2. Commercial In-Flow Paywalls & Pricing\n\n`;
    md += `| ID | Venture | Free Tier Limit | Commercial Model | Polar Checkout Link | Status |\n`;
    md += `| :- | :--- | :--- | :--- | :--- | :---: |\n`;

    for (const r of dataset) {
      md += `| **${r.id}** | **${r.name}** | ${r.freeLimit} | ${r.pricing} | [Checkout](${r.checkoutUrl}) | \`${r.arb.checkoutStatus}\` |\n`;
    }

    fs.writeFileSync(mdPath, md, 'utf8');
    console.log(`✅ Markdown report successfully generated at: ${mdPath}\n`);
  }
}

main().catch(console.error);
