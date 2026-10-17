export interface Dimensions3D {
  width: number;
  height: number;
  depth: number;
}

export interface Item3D extends Dimensions3D {
  id: string;
  name?: string;
  weight: number; // in grams or kg
  quantity?: number;
  allowRotation?: boolean; // defaults to true
  maxStackWeight?: number;
}

export interface BoxSpecification extends Dimensions3D {
  id: string;
  name: string;
  maxWeight: number;
  emptyWeight?: number;
  cost?: number; // monetary cost (in cents or currency units)
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface PackedItemPlacement {
  itemId: string;
  name?: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  rotationIndex: number;
}

export interface PackedBox {
  box: BoxSpecification;
  items: PackedItemPlacement[];
  totalItemWeight: number;
  totalWeight: number;
  packedVolume: number;
  boxVolume: number;
  utilizationPercentage: number;
  volumetricWeight: number; // Dimensional weight standard (e.g. cm^3 / 5000)
}

export interface PackingPlan {
  success: boolean;
  packedBoxes: PackedBox[];
  unpackedItems: Item3D[];
  totalBoxesUsed: number;
  totalCost: number;
  totalVolumetricWeight: number;
  executionTimeMs: number;
}
