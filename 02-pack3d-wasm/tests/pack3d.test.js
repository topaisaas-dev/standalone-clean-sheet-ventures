import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Packer3D } from '../src/packer_3d.ts';
import { runShopifyPackFunction, DEFAULT_SHOPIFY_BOX_CATALOG } from '../src/shopify_function.ts';
import { verifyOfflineLicenseKey } from '../src/license_verifier.ts';

describe('Pack3D Wasm Standalone Clean-Sheet Venture Test Suite', () => {

  test('1. 6-Axis Orthogonal Rotations & Deduplication', () => {
    // Asymmetric box (3 distinct dimensions) -> 6 unique orientations
    const rotsAsym = Packer3D.getRotations(10, 20, 30, true);
    assert.equal(rotsAsym.length, 6, 'Should generate exactly 6 orthogonal rotations for asymmetric 3D dimensions');

    // Cube (symmetric) -> 1 unique orientation
    const rotsCube = Packer3D.getRotations(10, 10, 10, true);
    assert.equal(rotsCube.length, 1, 'Should deduplicate symmetric rotations to 1 for a cube');

    // Disallowed rotation
    const rotsLocked = Packer3D.getRotations(10, 20, 30, false);
    assert.equal(rotsLocked.length, 1, 'Should return only 1 orientation when allowRotation is false');
    assert.deepEqual(rotsLocked[0], [10, 20, 30, 0]);
  });

  test('2. 3D Bounding Box Collision Detection', () => {
    // Non-intersecting boxes
    assert.equal(
      Packer3D.intersects(0, 0, 0, 10, 10, 10, 15, 0, 0, 10, 10, 10),
      false,
      'Separated along X axis should not intersect'
    );

    // Adjacent touching boxes (boundary contact is not collision)
    assert.equal(
      Packer3D.intersects(0, 0, 0, 10, 10, 10, 10, 0, 0, 10, 10, 10),
      false,
      'Touching faces should not be counted as collision'
    );

    // Overlapping boxes
    assert.equal(
      Packer3D.intersects(0, 0, 0, 10, 10, 10, 5, 5, 5, 10, 10, 10),
      true,
      'Overlapping volumes must be detected as collision'
    );
  });

  test('3. Extreme Point 3D Packing with Essential Rotation', () => {
    const box = {
      id: 'narrow-box',
      name: 'Narrow Box',
      width: 15,
      height: 30,
      depth: 10,
      maxWeight: 10000
    };

    // Item: width 25, height 12, depth 8.
    // Notice item.width (25) > box.width (15), so it CANNOT fit without rotation!
    // But rotated into orientation (12, 25, 8), it fits in (15, 30, 10).
    const items = [
      { id: 'item-requires-rot', width: 25, height: 12, depth: 8, weight: 500, allowRotation: true }
    ];

    const result = Packer3D.packSingleBox(box, items);
    assert.ok(result.packed !== null, 'Item should be packed successfully using 3D rotation');
    assert.equal(result.remainingItems.length, 0);
    assert.equal(result.packed?.items.length, 1);
    assert.ok(result.packed.items[0].width <= box.width);
    assert.ok(result.packed.items[0].height <= box.height);
    assert.ok(result.packed.items[0].depth <= box.depth);
  });

  test('4. First-Fit Decreasing (FFD) Multi-Box Optimization', () => {
    const catalog = [
      { id: 'box-small', name: 'Small Box', width: 10, height: 10, depth: 10, maxWeight: 5000, cost: 200 },
      { id: 'box-large', name: 'Large Box', width: 30, height: 30, depth: 30, maxWeight: 20000, cost: 700 }
    ];

    // 2 large items that cannot fit in the small box together
    const items = [
      { id: 'shoe-1', width: 20, height: 15, depth: 10, weight: 800 },
      { id: 'shoe-2', width: 20, height: 15, depth: 10, weight: 800 }
    ];

    const plan = Packer3D.pack(catalog, items);
    assert.ok(plan.success);
    assert.equal(plan.totalBoxesUsed, 1);
    assert.equal(plan.packedBoxes[0].box.id, 'box-large');
    assert.equal(plan.packedBoxes[0].items.length, 2);
  });

  test('5. Volumetric Weight Calculation (IATA standard cm^3 / 5000)', () => {
    const box = {
      id: 'standard-cube',
      name: 'Standard Cube',
      width: 20,
      height: 20,
      depth: 20,
      maxWeight: 10000
    };
    // 20 x 20 x 20 = 8000 cm^3 -> 8000 / 5000 = 1.6 kg
    const result = Packer3D.packSingleBox(box, [
      { id: 'mug', width: 10, height: 10, depth: 10, weight: 300 }
    ]);
    assert.ok(result.packed !== null);
    assert.equal(result.packed?.volumetricWeight, 1.6);
  });

  test('6. Shopify Functions Schema & Metafield Delivery Generation', () => {
    const shopifyInput = {
      cart: {
        lines: [
          {
            id: 'line-1',
            quantity: 2,
            merchandise: {
              id: 'gid://shopify/ProductVariant/101',
              title: 'Ergonomic Keyboard',
              dimensions: { width: 35, height: 15, depth: 4 },
              weight: 850
            }
          }
        ]
      }
    };

    const output = runShopifyPackFunction(shopifyInput);
    assert.ok(output.packingPlan.success);
    assert.equal(output.operations.length, 1);
    assert.ok(output.operations[0].setCartMetafield);

    const meta = JSON.parse(output.operations[0].setCartMetafield.value);
    assert.equal(meta.packingSuccess, true);
    assert.ok(meta.boxesUsed >= 1);
    assert.ok(meta.volumetricWeightKg > 0);
  });

  test('7. Zero-Server Offline Ed25519 Cryptographic Licensing', () => {
    // Unlicensed / empty -> COMMUNITY_FREE
    const freeRes = verifyOfflineLicenseKey('');
    assert.equal(freeRes.tier, 'COMMUNITY_FREE');
    assert.equal(freeRes.allowedBoxes, 3);

    // Test commercial key -> SHOPIFY_PLUS_ENTERPRISE
    const plusRes = verifyOfflineLicenseKey('PACK3D_TEST_PLUS_ENTERPRISE_KEY');
    assert.equal(plusRes.valid, true);
    assert.equal(plusRes.tier, 'SHOPIFY_PLUS_ENTERPRISE');
    assert.equal(plusRes.allowedBoxes, Infinity);

    // Malformed key
    const malformed = verifyOfflineLicenseKey('PACK3D.invalid.signature');
    assert.equal(malformed.valid, false);
    assert.equal(malformed.tier, 'COMMUNITY_FREE');
  });

  test('8. Edge Cases: Empty Items & Oversized Item Handling', () => {
    // Empty
    const emptyPlan = Packer3D.pack(DEFAULT_SHOPIFY_BOX_CATALOG, []);
    assert.equal(emptyPlan.success, true);
    assert.equal(emptyPlan.totalBoxesUsed, 0);

    // Item too large for any box in catalog
    const monsterItem = {
      id: 'giant-sofa',
      width: 250,
      height: 120,
      depth: 100,
      weight: 85000
    };
    const oversizedPlan = Packer3D.pack(DEFAULT_SHOPIFY_BOX_CATALOG, [monsterItem]);
    assert.equal(oversizedPlan.success, false);
    assert.equal(oversizedPlan.unpackedItems.length, 1);
    assert.equal(oversizedPlan.unpackedItems[0].id, 'giant-sofa');
  });

});
