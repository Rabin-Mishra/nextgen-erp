import React from "react";
import { getCurrentUser } from "@/auth/session";
import { getSettingsWarehouses, getSettingsFiscalYears } from "../../../modules/settings/queries";
import { getSystemSettings } from "../../../lib/settings-store";
import { SettingsPage } from "../../../components/settings/SettingsPage";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page() {
  const sessionUser = await getCurrentUser();

  if (!sessionUser) {
    redirect("/login");
  }

  // Pre-fetch all settings structures in parallel on the server
  const [warehouses, fiscalYears] = await Promise.all([
    getSettingsWarehouses(),
    getSettingsFiscalYears(),
  ]);

  const systemSettings = getSystemSettings();

  return (
    <SettingsPage
      initialSettings={systemSettings}
      initialWarehouses={warehouses}
      initialFiscalYears={fiscalYears}
      sessionUser={{
        role: (sessionUser as any).role || "VIEWER",
      }}
    />
  );
}
