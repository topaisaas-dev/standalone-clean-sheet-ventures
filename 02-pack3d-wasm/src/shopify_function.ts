import { Packer3D } from './packer_3d.ts';
import type { BoxSpecification, Item3D, PackingPlan } from './types.ts';

export interface ShopifyCartLine {
  id: string;
  quantity: number;
  cost?: {
    amountPerQuantity: {
      amount: string;
      currencyCode: string;
    };
  };
  merchandise: {
    id: string;
    title: string;
    weight?: number; // in grams
    dimensions?: {
      width: number; // in cm
      height: number;
      depth: number;
    };
    customAttributes?: Array<{ key: string; value: string }>;
  };
}

export interface ShopifyFunctionInput {
  cart: {
    lines: ShopifyCartLine[];
  };
  fulfillmentConfiguration?: {
    availableBoxes: Array<{
      id: string;
      name: string;
      width: number;
      height: number;
      depth: number;
      maxWeight: number;
      costCents?: number;
    }>;
  };
}

export interface ShopifyFunctionOutput {
  operations: Array<{
    setCartMetafield?: {
      namespace: string;
      key: string;
      value: string;
      type: string;
    };
  }>;
  packingPlan: PackingPlan;
}

// Standard default carrier packaging catalog if store does not specify custom boxes
export const DEFAULT_SHOPIFY_BOX_CATALOG: BoxSpecification[] = [
  { id: 'usps-small-frb', name: 'USPS Small Flat Rate Box', width: 21.9, height: 13.6, depth: 4.4, maxWeight: 31750, cost: 1040 },
  { id: 'usps-med-frb-1', name: 'USPS Medium Flat Rate Box (Top)', width: 27.9, height: 21.6, depth: 14.0, maxWeight: 31750, cost: 1840 },
  { id: 'usps-med-frb-2', name: 'USPS Medium Flat Rate Box (Side)', width: 34.6, height: 30.2, depth: 8.9, maxWeight: 31750, cost: 1840 },
  { id: 'usps-lrg-frb', name: 'USPS Large Flat Rate Box', width: 30.5, height: 30.5, depth: 14.0, maxWeight: 31750, cost: 2475 },
  { id: 'custom-standard-mailer', name: 'Padded Mailer #0', width: 25.4, height: 15.2, depth: 2.5, maxWeight: 2000, cost: 150 },
  { id: 'custom-master-carton', name: 'Master Shipping Carton', width: 50.0, height: 40.0, depth: 35.0, maxWeight: 30000, cost: 450 }
];

export function runShopifyPackFunction(input: ShopifyFunctionInput): ShopifyFunctionOutput {
  const boxes: BoxSpecification[] = input.fulfillmentConfiguration?.availableBoxes &&
    input.fulfillmentConfiguration.availableBoxes.length > 0
      ? input.fulfillmentConfiguration.availableBoxes.map(b => ({
          id: b.id,
          name: b.name,
          width: b.width,
          height: b.height,
          depth: b.depth,
          maxWeight: b.maxWeight,
          cost: b.costCents
        }))
      : DEFAULT_SHOPIFY_BOX_CATALOG;

  const items: Item3D[] = [];

  for (const line of input.cart.lines) {
    const dims = line.merchandise.dimensions || { width: 10, height: 10, depth: 5 };
    const weight = line.merchandise.weight || 250;

    items.push({
      id: line.merchandise.id || line.id,
      name: line.merchandise.title,
      width: dims.width,
      height: dims.height,
      depth: dims.depth,
      weight,
      quantity: line.quantity
    });
  }

  const plan = Packer3D.pack(boxes, items);

  return {
    operations: [
      {
        setCartMetafield: {
          namespace: 'pack3d',
          key: 'shipping_box_manifest',
          value: JSON.stringify({
            boxesUsed: plan.totalBoxesUsed,
            boxIds: plan.packedBoxes.map(pb => pb.box.id),
            volumetricWeightKg: plan.totalVolumetricWeight,
            packingSuccess: plan.success,
            execMs: plan.executionTimeMs
          }),
          type: 'json'
        }
      }
    ],
    packingPlan: plan
  };
}
