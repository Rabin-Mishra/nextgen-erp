import React from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  getDashboardKPIs,
  getRecentInvoices,
  getCashSummary,
  getLowStockAlerts,
  getPendingVendorPayments,
  getActiveProjectsSummary,
  getMonthlyRevenueByChannel,
  getDashboardSearchData
} from "@/modules/dashboard/queries";
import { getDailyCashFlow } from "@/modules/accounting/cashbook";

// Import presentation components
import { KPICards } from "@/components/dashboard/KPICards";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { CashFlowChart } from "@/components/dashboard/CashFlowChart";
import { RecentInvoicesTable } from "@/components/dashboard/RecentInvoicesTable";
import { CashSummaryCard } from "@/components/dashboard/CashSummaryCard";
import { LowStockWidget } from "@/components/dashboard/LowStockWidget";
import { PendingPaymentsWidget } from "@/components/dashboard/PendingPaymentsWidget";
import { ProjectCards } from "@/components/dashboard/ProjectCards";
import { DashboardSearchWidget } from "@/components/dashboard/DashboardSearchWidget";

export default async function DashboardPage() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  const todayStr = today.toISOString().split("T")[0];

  let dashboardData;
  try {
    const [
      kpis,
      recentInvoices,
      cashSummary,
      lowStockAlerts,
      pendingPayments,
      projectsSummary,
      revenueByChannel,
      dailyFlow,
      searchData
    ] = await Promise.all([
      getDashboardKPIs(month, year),
      getRecentInvoices(5),
      getCashSummary(todayStr),
      getLowStockAlerts(20),
      getPendingVendorPayments(20),
      getActiveProjectsSummary(),
      getMonthlyRevenueByChannel(6),
      getDailyCashFlow(month, year),
      getDashboardSearchData()
    ]);
    dashboardData = {
      kpis,
      recentInvoices,
      cashSummary,
      lowStockAlerts,
      pendingPayments,
      projectsSummary,
      revenueByChannel,
      dailyFlow,
      searchData
    };
  } catch (error) {
    console.error("Dashboard database connection error:", error);
  }

  if (!dashboardData) {
    return (
      <div className="space-y-8 animate-fade-in pb-10 font-sans">
        <PageHeader
          title="Executive Control Panel"
          description="Real-time operations tracking, multi-channel revenues, material costing margins, and live secure vaults."
        />
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl space-y-6">
          <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-500 animate-pulse">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-10 animate-ping"></span>
          </div>
          <div className="text-center max-w-md space-y-2">
            <h3 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">Database Connection Error</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              We couldn't connect to the database to fetch your dashboard KPIs. This is usually caused by temporary network DNS resolution issues, local hostname lookup errors, or database server downtime.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row w-full max-w-xs justify-center">
            <a 
              href="/dashboard"
              className="px-6 py-2 text-center text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 rounded-lg shadow transition-all duration-200"
            >
              Retry Connection
            </a>
          </div>
        </div>
      </div>
    );
  }

  const {
    kpis,
    recentInvoices,
    cashSummary,
    lowStockAlerts,
    pendingPayments,
    projectsSummary,
    revenueByChannel,
    dailyFlow,
    searchData
  } = dashboardData;

  return (
    <div className="space-y-8 animate-fade-in pb-10 font-sans">
      <PageHeader
        title="Executive Control Panel"
        description="Real-time operations tracking, multi-channel revenues, material costing margins, and live secure vaults."
      />

      {/* ROW 1: KPI STAT CARDS */}
      <KPICards data={kpis} />

      {/* NEW: DYNAMIC SEARCH CONSOLE FOR CUSTOMERS, VENDORS & BILLS */}
      <DashboardSearchWidget data={searchData} />

      {/* ROW 2: DATA-DENSE GRAPH CHARTS */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueChart data={revenueByChannel} />
        <CashFlowChart dailyFlow={dailyFlow} openingBalance={Number(cashSummary.openingBalance)} />
      </div>

      {/* ROW 3: RECENT SALES & LIVE VAULTS */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentInvoicesTable invoices={recentInvoices} />
        <CashSummaryCard initialData={cashSummary as any} />
      </div>

      {/* ROW 4: CRITICAL ALERTS & PAYABLES */}
      <div className="flex flex-col gap-4">
        {/* Row 1 — Critical Inventory (full width): */}
        <div className="w-full">
          <LowStockWidget items={lowStockAlerts} />
        </div>

        {/* Row 2 — Accounts Payable (full width): */}
        <div className="w-full">
          <PendingPaymentsWidget payments={pendingPayments} />
        </div>
      </div>

      {/* ROW 5: ACTIVE PROJECT SITES */}
      <ProjectCards projects={projectsSummary} />
    </div>
  );
}
