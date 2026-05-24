import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Decimal } from "decimal.js";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number using the Indian/Nepali numbering system (2,2,3 layout)
 * e.g., 142500 -> 1,42,500
 */
export function formatNepaliNumber(n: number): string {
  const parts = n.toString().split(".");
  let integerPart = parts[0];
  const decimalPart = parts[1] ? "." + parts[1] : "";

  if (integerPart.length <= 3) {
    return integerPart + decimalPart;
  }

  const lastThree = integerPart.substring(integerPart.length - 3);
  const remaining = integerPart.substring(0, integerPart.length - 3);

  // Comma formatting for every two digits after the last three digits
  const remainingFormatted = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",");

  return remainingFormatted + "," + lastThree + decimalPart;
}

/**
 * Formats financial amounts into NPR format
 * e.g., 142500.5 -> NPR 1,42,500.50
 */
export function formatNPR(amount: Decimal | number): string {
  let val: number;
  if (amount instanceof Decimal) {
    val = amount.toNumber();
  } else if (amount && typeof (amount as any).toNumber === "function") {
    val = (amount as any).toNumber();
  } else {
    val = Number(amount) || 0;
  }

  const fixedVal = val.toFixed(2);
  const parts = fixedVal.split(".");
  const integerFormatted = formatNepaliNumber(Number(parts[0]));
  
  // Keep decimals formatted as .XX
  return `NPR ${integerFormatted}.${parts[1]}`;
}

/**
 * Generate Next Invoice Number
 * e.g. prefix = "INV", lastNumber = 5 -> "INV-0006"
 */
export function generateInvoiceNumber(prefix: string, lastNumber: number): string {
  const nextNumber = lastNumber + 1;
  return `${prefix}-${String(nextNumber).padStart(4, "0")}`;
}

/**
 * Generate Next Purchase Order Number
 * e.g. lastNumber = 12 -> "PO-0013"
 */
export function generatePONumber(lastNumber: number): string {
  const nextNumber = lastNumber + 1;
  return `PO-${String(nextNumber).padStart(4, "0")}`;
}

/**
 * General helper to generate prefixed items codes (e.g. ITM-001, SUP-012)
 */
export function generateCode(prefix: string, lastNumber: number): string {
  const nextNumber = lastNumber + 1;
  return `${prefix}-${String(nextNumber).padStart(3, "0")}`;
}

/**
 * Formats a date into a clean text representation
 * e.g., Date -> "May 7, 2026"
 */
export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Calculates current Nepali Fiscal Year boundaries in AD Gregorian calendar
 * Mid-July (July 16) to Mid-July (July 15) of the following year
 */
export function getFinancialYear(): { start: Date; end: Date; label: string } {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  let startYearAD: number;
  let endYearAD: number;
  
  // Fiscal year boundary is July 16
  const boundaryDate = new Date(currentYear, 6, 16); // 6 is July (0-indexed)
  
  if (now < boundaryDate) {
    startYearAD = currentYear - 1;
    endYearAD = currentYear;
  } else {
    startYearAD = currentYear;
    endYearAD = currentYear + 1;
  }
  
  const start = new Date(startYearAD, 6, 16, 0, 0, 0, 0); // July 16
  const end = new Date(endYearAD, 6, 15, 23, 59, 59, 999); // July 15 next year
  
  // BS offset: July 16, 2025 corresponds to Shrawan 1, 2082. Label is "2082-83"
  const startYearBS = startYearAD + 57;
  const endYearBS = endYearAD + 57;
  const label = `${startYearBS}-${String(endYearBS).substring(2)}`;
  
  return { start, end, label };
}

/**
 * Formats financial amounts into local Nepalese/Indian style Rupees (Rs.)
 * e.g., 25840 -> Rs.25,840
 * e.g., 10000000 -> Rs.1,00,00,000
 */
export function formatRs(amount: Decimal | number): string {
  let val: number;
  if (amount instanceof Decimal) {
    val = amount.toNumber();
  } else if (amount && typeof (amount as any).toNumber === "function") {
    val = (amount as any).toNumber();
  } else {
    val = Number(amount) || 0;
  }

  const isNegative = val < 0;
  const absVal = Math.abs(val);

  // Format as integer if no decimal part, otherwise with 2 decimals
  const formattedNum = formatNepaliNumber(Math.round(absVal));
  const prefix = isNegative ? "-Rs." : "Rs.";
  return `${prefix}${formattedNum}`;
}

/**
 * Converts AD Date to approximate Bikram Sambat (BS) Date string YYYY-MM-DD
 * This provides local-compliant representation on the dashboard tables
 */
export function convertToBS(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";

  // Simple, consistent Bikram Sambat date mapping based on the standard +57 years offset
  const bsYear = d.getFullYear() + 57;
  // BS month mapping: July (month 6, 0-indexed) aligns roughly with Shrawan (month 4)
  // Shift by 8 months to match Nepal calendars roughly
  const bsMonth = String(((d.getMonth() + 8) % 12) + 1).padStart(2, "0");
  const bsDay = String(d.getDate()).padStart(2, "0");

  return `${bsYear}-${bsMonth}-${bsDay}`;
}

