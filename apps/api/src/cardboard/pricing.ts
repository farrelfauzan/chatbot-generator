/**
 * Formula-based pricing for cardboard boxes.
 *
 * Dus Baru (regular RSC box):
 *   Surface Area = 2 × (P×L + P×T + L×T)
 *   Price = round(SA × material_rate)
 *
 * Dus Pizza (die-cut pizza box):
 *   Sheet Width  = P + 2T + 5
 *   Sheet Height = P + L + 2T + 2
 *   Sheet Area   = Width × Height
 *   Price = round(SheetArea × 1.1)
 *
 * Sablon: +Rp 500 per side (1-4 sides)
 */

// Rates per cm² of surface area (derived from spreadsheet)
const RATES_DUS_BARU: Record<string, number> = {
  singlewall: 714 / 528, // ≈ 1.3523
  cflute: 840 / 528, // ≈ 1.5909
  doublewall: 1229 / 528, // ≈ 2.3277
};

const RATE_DUS_PIZZA = 1.1; // per cm² of sheet area
const SABLON_PER_SIDE = 500; // Rp per side

export type BoxType = 'dus_baru' | 'dus_pizza';
export type Material = 'singlewall' | 'cflute' | 'doublewall';

export function calculateSurfaceArea(p: number, l: number, t: number): number {
  return 2 * (p * l + p * t + l * t);
}

export function calculatePizzaSheet(
  p: number,
  l: number,
  t: number,
): { width: number; height: number; area: number } {
  const width = p + 2 * t + 5;
  const height = p + l + 2 * t + 2;
  return { width, height, area: width * height };
}

export function calculatePrice(
  type: BoxType,
  p: number,
  l: number,
  t: number,
  material: Material = 'singlewall',
): number {
  if (type === 'dus_pizza') {
    const sheet = calculatePizzaSheet(p, l, t);
    return Math.round(sheet.area * RATE_DUS_PIZZA);
  }

  // dus_baru
  const sa = calculateSurfaceArea(p, l, t);
  const rate = RATES_DUS_BARU[material] ?? RATES_DUS_BARU.singlewall;
  return Math.round(sa * rate);
}

export function calculateTotal(
  pricePerPcs: number,
  quantity: number,
  sablonSides: number = 0,
): {
  pricePerPcs: number;
  sablonPerPcs: number;
  totalPerPcs: number;
  subtotal: number;
  sablonTotal: number;
  grandTotal: number;
} {
  const sablonPerPcs = sablonSides * SABLON_PER_SIDE;
  const totalPerPcs = pricePerPcs + sablonPerPcs;
  return {
    pricePerPcs,
    sablonPerPcs,
    totalPerPcs,
    subtotal: pricePerPcs * quantity,
    sablonTotal: sablonPerPcs * quantity,
    grandTotal: totalPerPcs * quantity,
  };
}

export const MATERIALS_DUS_BARU: Material[] = [
  'singlewall',
  'cflute',
  'doublewall',
];
