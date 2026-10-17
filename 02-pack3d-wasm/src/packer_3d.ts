import type {
  Item3D,
  BoxSpecification,
  Point3D,
  PackedItemPlacement,
  PackedBox,
  PackingPlan
} from './types.ts';

export class Packer3D {
  private static readonly DIM_DIVISOR = 5000; // IATA standard (cm^3 to kg)

  /**
   * Generates all valid orthogonal rotations (up to 6) for a 3D item.
   */
  public static getRotations(
    w: number,
    h: number,
    d: number,
    allowRotation = true
  ): Array<[number, number, number, number]> {
    if (!allowRotation) {
      return [[w, h, d, 0]];
    }

    const uniqueRotations = new Map<string, [number, number, number, number]>();
    const permutations: Array<[number, number, number, number]> = [
      [w, h, d, 0],
      [w, d, h, 1],
      [h, w, d, 2],
      [h, d, w, 3],
      [d, w, h, 4],
      [d, h, w, 5]
    ];

    for (const rot of permutations) {
      const key = `${rot[0]}x${rot[1]}x${rot[2]}`;
      if (!uniqueRotations.has(key)) {
        uniqueRotations.set(key, rot);
      }
    }

    return Array.from(uniqueRotations.values());
  }

  /**
   * Checks if candidate item placement intersects with any existing placed item.
   */
  public static intersects(
    x1: number, y1: number, z1: number, w1: number, h1: number, d1: number,
    x2: number, y2: number, z2: number, w2: number, h2: number, d2: number
  ): boolean {
    return (
      x1 < x2 + w2 && x1 + w1 > x2 &&
      y1 < y2 + h2 && y1 + h1 > y2 &&
      z1 < z2 + d2 && z1 + d1 > z2
    );
  }

  /**
   * Attempts to pack a list of items into a single specific box specification
   * using the Extreme Point (EP) 3D heuristic.
   */
  public static packSingleBox(
    box: BoxSpecification,
    itemsToPack: Item3D[]
  ): { packed: PackedBox | null; remainingItems: Item3D[] } {
    const placedItems: PackedItemPlacement[] = [];
    const extremePoints: Point3D[] = [{ x: 0, y: 0, z: 0 }];
    const remainingItems: Item3D[] = [];

    let currentItemWeight = 0;
    const boxVol = box.width * box.height * box.depth;

    for (const item of itemsToPack) {
      // Check weight limit
      if (currentItemWeight + item.weight > box.maxWeight) {
        remainingItems.push(item);
        continue;
      }

      const rotations = this.getRotations(
        item.width,
        item.height,
        item.depth,
        item.allowRotation ?? true
      );

      let placed = false;

      // Sort extreme points to prioritize compact ground-level placement (lowest z, then y, then x)
      extremePoints.sort((a, b) => {
        if (a.z !== b.z) return a.z - b.z;
        if (a.y !== b.y) return a.y - b.y;
        return a.x - b.x;
      });

      // Try placing item at each extreme point with valid rotations
      for (let pIdx = 0; pIdx < extremePoints.length; pIdx++) {
        const ep = extremePoints[pIdx];

        for (const [rw, rh, rd, rotIdx] of rotations) {
          // Check box boundaries
          if (ep.x + rw > box.width || ep.y + rh > box.height || ep.z + rd > box.depth) {
            continue;
          }

          // Check collisions with already placed items
          let hasCollision = false;
          for (const placed of placedItems) {
            if (
              this.intersects(
                ep.x, ep.y, ep.z, rw, rh, rd,
                placed.x, placed.y, placed.z, placed.width, placed.height, placed.depth
              )
            ) {
              hasCollision = true;
              break;
            }
          }

          if (!hasCollision) {
            // Placement successful!
            placedItems.push({
              itemId: item.id,
              name: item.name,
              x: ep.x,
              y: ep.y,
              z: ep.z,
              width: rw,
              height: rh,
              depth: rd,
              rotationIndex: rotIdx
            });

            currentItemWeight += item.weight;
            placed = true;

            // Remove used extreme point
            extremePoints.splice(pIdx, 1);

            // Generate new candidate extreme points
            const newEps: Point3D[] = [
              { x: ep.x + rw, y: ep.y, z: ep.z },
              { x: ep.x, y: ep.y + rh, z: ep.z },
              { x: ep.x, y: ep.y, z: ep.z + rd }
            ];

            // Project on other items for structural stability
            for (const other of placedItems) {
              if (other === placedItems[placedItems.length - 1]) continue;

              // Projection along X
              if (other.x + other.width > ep.x && other.x + other.width <= box.width) {
                newEps.push({ x: other.x + other.width, y: ep.y, z: ep.z });
              }
              // Projection along Y
              if (other.y + other.height > ep.y && other.y + other.height <= box.height) {
                newEps.push({ x: ep.x, y: other.y + other.height, z: ep.z });
              }
              // Projection along Z
              if (other.z + other.depth > ep.z && other.z + other.depth <= box.depth) {
                newEps.push({ x: ep.x, y: ep.y, z: other.z + other.depth });
              }
            }

            // Filter out invalid/duplicate extreme points
            for (const nep of newEps) {
              if (
                nep.x >= box.width || nep.y >= box.height || nep.z >= box.depth ||
                nep.x < 0 || nep.y < 0 || nep.z < 0
              ) {
                continue;
              }

              // Check if point is inside any placed item
              let insideAny = false;
              for (const other of placedItems) {
                if (
                  nep.x >= other.x && nep.x < other.x + other.width &&
                  nep.y >= other.y && nep.y < other.y + other.height &&
                  nep.z >= other.z && nep.z < other.z + other.depth
                ) {
                  insideAny = true;
                  break;
                }
              }

              if (!insideAny) {
                const alreadyExists = extremePoints.some(
                  pt => pt.x === nep.x && pt.y === nep.y && pt.z === nep.z
                );
                if (!alreadyExists) {
                  extremePoints.push(nep);
                }
              }
            }

            break;
          }
        }

        if (placed) break;
      }

      if (!placed) {
        remainingItems.push(item);
      }
    }

    if (placedItems.length === 0) {
      return { packed: null, remainingItems: itemsToPack };
    }

    const packedVolume = placedItems.reduce((acc, it) => acc + (it.width * it.height * it.depth), 0);
    const utilization = boxVol > 0 ? (packedVolume / boxVol) * 100 : 0;
    const volumetricWeight = (box.width * box.height * box.depth) / this.DIM_DIVISOR;

    const packedBox: PackedBox = {
      box,
      items: placedItems,
      totalItemWeight: currentItemWeight,
      totalWeight: currentItemWeight + (box.emptyWeight || 0),
      packedVolume,
      boxVolume: boxVol,
      utilizationPercentage: Math.round(utilization * 100) / 100,
      volumetricWeight: Math.round(volumetricWeight * 100) / 100
    };

    return { packed: packedBox, remainingItems };
  }

  /**
   * Master Packing Optimizer:
   * 1. Expands quantities into individual 3D items.
   * 2. Sorts items using First-Fit Decreasing (FFD) order.
   * 3. Selects optimal single box if possible, or multi-box combination.
   */
  public static pack(
    boxesCatalog: BoxSpecification[],
    items: Item3D[]
  ): PackingPlan {
    const startTime = performance.now();

    // 1. Expand items by quantity
    const expandedItems: Item3D[] = [];
    for (const it of items) {
      const qty = it.quantity && it.quantity > 0 ? it.quantity : 1;
      for (let q = 0; q < qty; q++) {
        expandedItems.push({
          ...it,
          id: qty > 1 ? `${it.id}_#${q + 1}` : it.id,
          quantity: 1
        });
      }
    }

    if (expandedItems.length === 0) {
      return {
        success: true,
        packedBoxes: [],
        unpackedItems: [],
        totalBoxesUsed: 0,
        totalCost: 0,
        totalVolumetricWeight: 0,
        executionTimeMs: performance.now() - startTime
      };
    }

    // 2. First-Fit Decreasing (FFD): sort items descending by volume, then max dimension, then weight
    expandedItems.sort((a, b) => {
      const volA = a.width * a.height * a.depth;
      const volB = b.width * b.height * b.depth;
      if (volB !== volA) return volB - volA;
      const maxDimA = Math.max(a.width, a.height, a.depth);
      const maxDimB = Math.max(b.width, b.height, b.depth);
      if (maxDimB !== maxDimA) return maxDimB - maxDimA;
      return b.weight - a.weight;
    });

    // 3. Try to fit everything into a single box first (lowest cost or smallest volume)
    const sortedBoxes = [...boxesCatalog].sort((a, b) => {
      if (a.cost !== undefined && b.cost !== undefined && a.cost !== b.cost) {
        return a.cost - b.cost;
      }
      return (a.width * a.height * a.depth) - (b.width * b.height * b.depth);
    });

    for (const box of sortedBoxes) {
      const { packed, remainingItems } = this.packSingleBox(box, expandedItems);
      if (packed && remainingItems.length === 0) {
        // Fits 100% in a single box!
        return {
          success: true,
          packedBoxes: [packed],
          unpackedItems: [],
          totalBoxesUsed: 1,
          totalCost: box.cost || 0,
          totalVolumetricWeight: packed.volumetricWeight,
          executionTimeMs: performance.now() - startTime
        };
      }
    }

    // 4. Multi-box greedy packing: fill boxes one by one until all items are packed or no progress
    const packedBoxes: PackedBox[] = [];
    let itemsToPack = [...expandedItems];

    while (itemsToPack.length > 0) {
      let bestPacked: PackedBox | null = null;
      let bestRemaining: Item3D[] = itemsToPack;
      let minRemainingCount = itemsToPack.length;

      for (const box of sortedBoxes) {
        const { packed, remainingItems } = this.packSingleBox(box, itemsToPack);
        if (packed && remainingItems.length < minRemainingCount) {
          bestPacked = packed;
          bestRemaining = remainingItems;
          minRemainingCount = remainingItems.length;
        }
      }

      if (!bestPacked || minRemainingCount === itemsToPack.length) {
        // Cannot fit remaining items in any available box
        break;
      }

      packedBoxes.push(bestPacked);
      itemsToPack = bestRemaining;
    }

    const totalCost = packedBoxes.reduce((acc, b) => acc + (b.box.cost || 0), 0);
    const totalVolumetricWeight = packedBoxes.reduce((acc, b) => acc + b.volumetricWeight, 0);

    return {
      success: itemsToPack.length === 0,
      packedBoxes,
      unpackedItems: itemsToPack,
      totalBoxesUsed: packedBoxes.length,
      totalCost,
      totalVolumetricWeight: Math.round(totalVolumetricWeight * 100) / 100,
      executionTimeMs: performance.now() - startTime
    };
  }
}
