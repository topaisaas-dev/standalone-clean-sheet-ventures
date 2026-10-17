#!/usr/bin/env node

import fs from 'node:fs';
import { Packer3D } from '../src/packer_3d.ts';
import { verifyOfflineLicenseKey } from '../src/license_verifier.ts';
import { DEFAULT_SHOPIFY_BOX_CATALOG } from '../src/shopify_function.ts';
import { InflowPaywall } from '../../shared/inflow-paywall/src/inflow_paywall.ts';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  console.log(`
📦 Pack3D Wasm — High-Performance 3D Bin-Packing & Box Optimizer
Usage:
  pack3d --items <items.json> [--boxes <boxes.json>] [--license <KEY>]

Options:
  --items <path>          JSON file containing items array ([{ id, width, height, depth, weight, quantity? }])
  --boxes <path>          JSON file with available box specs (defaults to standard USPS/FedEx catalog)
  --license <KEY>         Ed25519 commercial license key (or via PACK3D_LICENSE_KEY env)
  --emergency-pass-24h    24-hour temporary grace period bypass for urgent production CI/order fulfillment
  --json                  Output raw JSON packing plan
  -h, --help              Show this help message
`);
  process.exit(0);
}

function getArgValue(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

const itemsPath = getArgValue('--items');
const boxesPath = getArgValue('--boxes');
const licenseKey = getArgValue('--license') || process.env.PACK3D_LICENSE_KEY;
const isJsonOutput = args.includes('--json');
const hasEmergencyGrace = args.includes('--emergency-pass-24h') || !!process.env.PACK3D_EMERGENCY_GRACE;

if (!itemsPath) {
  console.error('Error: --items <path> is required.');
  process.exit(1);
}

try {
  const items = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));
  const boxes = boxesPath
    ? JSON.parse(fs.readFileSync(boxesPath, 'utf8'))
    : DEFAULT_SHOPIFY_BOX_CATALOG;

  const license = verifyOfflineLicenseKey(licenseKey);

  // In-Flow Paywall evaluation if custom box catalog exceeds free tier
  const paywallStatus = InflowPaywall.evaluate({
    productName: 'Pack3D Wasm Logistics & 3PL Engine',
    metricName: 'box specifications',
    currentValue: boxes.length,
    freeLimit: license.allowedBoxes,
    checkoutUrl: 'https://buy.polar.sh/polar_cl_nQ28CN7gE175wwIji5fadiW2BjicQ4CyfJarn3tvVlk',
    priceText: '$19/mo (or $49/mo Plus)'
  }, license.valid, hasEmergencyGrace);

  if (!paywallStatus.allowed) {
    if (paywallStatus.ansiBanner) {
      process.stderr.write(paywallStatus.ansiBanner);
    }
    process.exit(1);
  }

  if (paywallStatus.isEmergencyGrace && paywallStatus.ansiBanner) {
    process.stderr.write(paywallStatus.ansiBanner);
  }

  const plan = Packer3D.pack(boxes, items);

  if (isJsonOutput) {
    console.log(JSON.stringify({ plan, license }, null, 2));
  } else {
    console.log('\n📦 Pack3D Optimization Results:');
    console.log(`- Status: ${plan.success ? '✅ 100% Packed' : '⚠️ Partial Packing'}`);
    console.log(`- Total Boxes Required: ${plan.totalBoxesUsed}`);
    console.log(`- Estimated Volumetric Weight: ${plan.totalVolumetricWeight} kg`);
    console.log(`- Total Packaging Cost: $${(plan.totalCost / 100).toFixed(2)}`);
    console.log(`- Execution Time: ${plan.executionTimeMs.toFixed(3)} ms`);

    plan.packedBoxes.forEach((pb, idx) => {
      console.log(`\n  [Box #${idx + 1}] ${pb.box.name} (${pb.box.width}x${pb.box.height}x${pb.box.depth} cm)`);
      console.log(`    Utilization: ${pb.utilizationPercentage}% | Weight: ${pb.totalWeight}g`);
      console.log(`    Items packed (${pb.items.length}):`);
      pb.items.forEach(it => {
        console.log(`      • ${it.name || it.itemId} @ (${it.x}, ${it.y}, ${it.z}) [${it.width}x${it.height}x${it.depth} cm]`);
      });
    });

    if (plan.unpackedItems.length > 0) {
      console.log(`\n⚠️ Unpacked Items (${plan.unpackedItems.length}):`);
      plan.unpackedItems.forEach(it => console.log(`  • ${it.name || it.id}`));
    }
  }
} catch (err) {
  console.error('Execution error:', err.message);
  process.exit(1);
}
