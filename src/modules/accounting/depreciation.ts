import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/modules/auth/session";
import Decimal from "decimal.js";
import { FixedAsset } from "@/generated/prisma/client";

// Nepali BS date helper to extract year, month (1-12) and fiscal year label (e.g., "2081-82")
export function getNepaliBSDate(date: Date) {
  const gYear = date.getFullYear();
  const gMonth = date.getMonth() + 1; // 1-12
  const gDay = date.getDate();

  let bsYear = gYear + 57;
  let bsMonth = 1;

  // Gregorian dates to Nepali BS months (starting day averages)
  if (gMonth === 1) {
    bsMonth = gDay >= 15 ? 10 : 9; // Magh or Poush
    bsYear = gYear + 56;
  } else if (gMonth === 2) {
    bsMonth = gDay >= 13 ? 11 : 10; // Fagun or Magh
    bsYear = gYear + 56;
  } else if (gMonth === 3) {
    bsMonth = gDay >= 14 ? 12 : 11; // Chaitra or Fagun
    bsYear = gYear + 56;
  } else if (gMonth === 4) {
    bsMonth = gDay >= 14 ? 1 : 12; // Baisakh or Chaitra
    bsYear = gDay >= 14 ? gYear + 57 : gYear + 56;
  } else if (gMonth === 5) {
    bsMonth = gDay >= 15 ? 2 : 1; // Jestha or Baisakh
  } else if (gMonth === 6) {
    bsMonth = gDay >= 15 ? 3 : 2; // Asar or Jestha
  } else if (gMonth === 7) {
    bsMonth = gDay >= 17 ? 4 : 3; // Shrawan or Asar
  } else if (gMonth === 8) {
    bsMonth = gDay >= 17 ? 5 : 4; // Bhadra or Shrawan
  } else if (gMonth === 9) {
    bsMonth = gDay >= 17 ? 6 : 5; // Ashwin or Bhadra
  } else if (gMonth === 10) {
    bsMonth = gDay >= 18 ? 7 : 6; // Kartik or Ashwin
  } else if (gMonth === 11) {
    bsMonth = gDay >= 17 ? 8 : 7; // Mangsir or Kartik
  } else if (gMonth === 12) {
    bsMonth = gDay >= 16 ? 9 : 8; // Poush or Mangsir
  }

  // Shrawan (Month 4) starts Nepali Fiscal Year.
  let fiscalYear = "";
  if (bsMonth >= 4) {
    fiscalYear = `${bsYear}-${String(bsYear + 1).slice(-2)}`;
  } else {
    fiscalYear = `${bsYear - 1}-${String(bsYear).slice(-2)}`;
  }

  return { bsYear, bsMonth, fiscalYear };
}

// 1. CALCULATE MONTHLY DEPRECIATION VALUE
export function calculateMonthlyDepreciation(asset: FixedAsset): Decimal {
  const years = asset.usefulLifeYears;
  if (years <= 0) return new Decimal(0);

  const purchasePrice = new Decimal(asset.purchasePrice);
  const currentValue = new Decimal(asset.currentValue);

  if (currentValue.lessThanOrEqualTo(0)) return new Decimal(0);

  if (asset.depreciationMethod === "STRAIGHT_LINE") {
    // SL = purchasePrice / (years * 12)
    const monthlyAmt = purchasePrice.div(years * 12);
    return Decimal.min(monthlyAmt, currentValue);
  } else {
    // Double Declining Balance (DDB): rate = 2 / years. Monthly = currentValue * rate / 12
    const annualRate = new Decimal(2).div(years);
    const monthlyAmt = currentValue.times(annualRate).div(12);
    return Decimal.min(monthlyAmt, currentValue);
  }
}

// 2. RUN MONTHLY DEPRECIATION BATCH FOR ALL ACTIVE FIXED ASSETS
export async function runMonthlyDepreciationForAll() {
  const db = await getDb();
  const session = await getCurrentUser();
  if (!session?.id) throw new Error("Unauthorized");

  const today = new Date();
  const { fiscalYear, bsMonth } = getNepaliBSDate(today);

  return db.$transaction(async (tx) => {
    // Fetch active fixed assets with depreciable value remaining
    const assets = await tx.fixedAsset.findMany({
      where: { isActive: true, currentValue: { gt: 0 } },
    });

    const entriesCreated = [];

    for (const asset of assets) {
      // 1. Safety check: Verify if a depreciation entry is already posted for this month + year
      const existing = await tx.depreciationEntry.findUnique({
        where: {
          assetId_fiscalYear_month: {
            assetId: asset.id,
            fiscalYear,
            month: bsMonth,
          },
        },
      });

      if (existing) continue; // Already posted, skip to prevent double depreciation

      // 2. Calculate monthly amount
      const amt = calculateMonthlyDepreciation(asset);
      if (amt.lessThanOrEqualTo(0)) continue;

      const before = new Decimal(asset.currentValue);
      const after = before.minus(amt);

      // 3. Post Depreciation Entry log
      const depEntry = await tx.depreciationEntry.create({
        data: {
          assetId: asset.id,
          fiscalYear,
          month: bsMonth,
          amount: amt,
          bookValueBefore: before,
          bookValueAfter: after,
        },
      });

      // 4. Update currentValue inside FixedAsset
      await tx.fixedAsset.update({
        where: { id: asset.id },
        data: { currentValue: after },
      });

      entriesCreated.push(depEntry);
    }

    // 5. Add manual Audit Log trace
    if (entriesCreated.length > 0) {
      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: "RUN_DEPRECIATION",
          module: "ACCOUNTING",
          recordId: "BATCH",
          newValues: {
            fiscalYear,
            month: bsMonth,
            count: entriesCreated.length,
          },
        },
      });
    }

    return entriesCreated;
  });
}

// 3. GET PROJECTED & RECORDED DEPRECIATION SCHEDULE FOR AN ASSET
export async function getDepreciationSchedule(assetId: string) {
  const db = await getDb();
  
  const asset = await db.fixedAsset.findUnique({
    where: { id: assetId },
    include: { depreciationEntries: { orderBy: [{ fiscalYear: "asc" }, { month: "asc" }] } },
  });
  if (!asset) throw new Error("Fixed asset not found");

  // Format existing entries
  const actualEntries = asset.depreciationEntries.map((e) => ({
    type: "ACTUAL" as const,
    fiscalYear: e.fiscalYear,
    month: e.month,
    amount: e.amount.toString(),
    bookValueBefore: e.bookValueBefore.toString(),
    bookValueAfter: e.bookValueAfter.toString(),
  }));

  const projectedEntries = [];
  let simulatedValue = new Decimal(asset.currentValue);
  const years = asset.usefulLifeYears;

  // Project future entries up to remaining useful life months if there is value left
  if (simulatedValue.greaterThan(0) && years > 0) {
    const today = new Date();
    let { bsMonth, bsYear } = getNepaliBSDate(today);

    // Project for next remaining months
    const maxMonths = years * 12 - actualEntries.length;
    let monthsSimulated = 0;

    while (simulatedValue.greaterThan(0) && monthsSimulated < maxMonths) {
      // Increment month calendar BS
      bsMonth++;
      if (bsMonth > 12) {
        bsMonth = 1;
        bsYear++;
      }

      let fiscalYear = "";
      if (bsMonth >= 4) {
        fiscalYear = `${bsYear}-${String(bsYear + 1).slice(-2)}`;
      } else {
        fiscalYear = `${bsYear - 1}-${String(bsYear).slice(-2)}`;
      }

      // Calculate simulated depreciation
      let simulatedDep = new Decimal(0);
      if (asset.depreciationMethod === "STRAIGHT_LINE") {
        simulatedDep = new Decimal(asset.purchasePrice).div(years * 12);
      } else {
        const annualRate = new Decimal(2).div(years);
        simulatedDep = simulatedValue.times(annualRate).div(12);
      }
      simulatedDep = Decimal.min(simulatedDep, simulatedValue);

      const before = simulatedValue;
      simulatedValue = simulatedValue.minus(simulatedDep);
      monthsSimulated++;

      projectedEntries.push({
        type: "PROJECTED" as const,
        fiscalYear,
        month: bsMonth,
        amount: simulatedDep.toString(),
        bookValueBefore: before.toString(),
        bookValueAfter: simulatedValue.toString(),
      });
    }
  }

  return {
    asset: {
      ...asset,
      purchasePrice: asset.purchasePrice.toString(),
      currentValue: asset.currentValue.toString(),
    },
    entries: [...actualEntries, ...projectedEntries],
  };
}

// 4. GET ASSET REGISTER LIST
export async function getAssetRegister() {
  const db = await getDb();

  const assets = await db.fixedAsset.findMany({
    orderBy: { purchaseDate: "desc" },
    include: { depreciationEntries: true },
  });

  return assets.map((a) => {
    let accumulated = new Decimal(0);
    for (const e of a.depreciationEntries) {
      accumulated = accumulated.plus(e.amount);
    }

    return {
      ...a,
      purchasePrice: a.purchasePrice.toString(),
      currentValue: a.currentValue.toString(),
      accumulatedDepreciation: accumulated.toString(),
    };
  });
}

// 5. CREATE A FIXED ASSET
export async function createFixedAsset(data: {
  name: string;
  category: string;
  purchaseDate: Date | string;
  purchasePrice: number | string;
  usefulLifeYears: number;
  depreciationMethod: "STRAIGHT_LINE" | "DECLINING_BALANCE";
}) {
  const db = await getDb();
  const session = await getCurrentUser();
  if (!session?.id) throw new Error("Unauthorized");

  const purchasePrice = new Decimal(data.purchasePrice);
  const purchaseDate = new Date(data.purchaseDate);

  const asset = await db.fixedAsset.create({
    data: {
      name: data.name,
      category: data.category,
      purchaseDate,
      purchasePrice,
      usefulLifeYears: data.usefulLifeYears,
      depreciationMethod: data.depreciationMethod,
      currentValue: purchasePrice, // Initial book value is purchase price
      isActive: true,
    },
  });

  await db.auditLog.create({
    data: {
      userId: session.id,
      action: "CREATE",
      module: "FIXED_ASSETS",
      recordId: asset.id,
      newValues: {
        name: asset.name,
        price: purchasePrice.toString(),
      },
    },
  });

  return asset;
}
