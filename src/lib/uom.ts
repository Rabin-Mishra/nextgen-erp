import Decimal from "decimal.js";

/**
 * Converts a quantity in a transaction unit (e.g. BOX) to the base unit (e.g. PCS) equivalent.
 */
export function convertToBaseQty(qty: number | string | Decimal, factor: number | string | Decimal | null | undefined): Decimal {
  const q = new Decimal(qty || 0);
  const f = new Decimal(factor || 1);
  return q.times(f);
}

/**
 * Converts a base quantity (e.g. PCS) to a transaction unit (e.g. BOX) equivalent.
 */
export function convertToTransQty(baseQty: number | string | Decimal, factor: number | string | Decimal | null | undefined): Decimal {
  const b = new Decimal(baseQty || 0);
  const f = new Decimal(factor || 1);
  if (f.isZero()) return new Decimal(0);
  return b.div(f);
}

/**
 * Adjusts price per base unit to price per transaction unit.
 * e.g. Rs. 50/PCS * 10 PCS/BOX = Rs. 500/BOX
 */
export function getPriceForUom(basePrice: number | string | Decimal, factor: number | string | Decimal | null | undefined): Decimal {
  const p = new Decimal(basePrice || 0);
  const f = new Decimal(factor || 1);
  return p.times(f);
}

/**
 * Formats stock quantities showing both base UoM and packaging UoM equivalent if different.
 * e.g. "50 PCS (5 BOX)" or "25 PCS (2.5 BOX)"
 */
export function formatUomDisplay(
  baseQty: number | string | Decimal,
  factor: number | string | Decimal | null | undefined,
  baseUnit: string,
  altUnit: string | null | undefined
): string {
  const b = new Decimal(baseQty || 0);
  const qtyStr = parseFloat(b.toString()).toString(); // remove trailing zeroes after decimal if integer
  
  if (!altUnit || altUnit === baseUnit) {
    return `${qtyStr} ${baseUnit}`;
  }
  
  const f = new Decimal(factor || 1);
  if (f.isZero() || f.equals(1)) {
    return `${qtyStr} ${baseUnit}`;
  }

  const altQty = b.div(f);
  const altQtyStr = parseFloat(altQty.toString()).toString();
  return `${qtyStr} ${baseUnit} (${altQtyStr} ${altUnit})`;
}
