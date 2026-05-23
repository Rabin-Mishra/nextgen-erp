import { getDb } from "../../lib/db";

export async function getSettingsWarehouses() {
  const db = await getDb();
  return db.warehouse.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getSettingsFiscalYears() {
  const db = await getDb();
  return db.fiscalYear.findMany({
    orderBy: { startDate: "desc" },
  });
}
