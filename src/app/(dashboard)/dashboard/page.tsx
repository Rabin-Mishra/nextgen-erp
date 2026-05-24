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

  // Fetch all dashboard data in parallel using Promise.all to avoid waterfall delays
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
    getLowStockAlerts(5),
    getPendingVendorPayments(5),
    getActiveProjectsSummary(),
    getMonthlyRevenueByChannel(6),
    getDailyCashFlow(month, year),
    getDashboardSearchData()
  ]);

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
      <div className="grid gap-6 lg:grid-cols-2">
        <LowStockWidget items={lowStockAlerts} />
        <PendingPaymentsWidget payments={pendingPayments} />
      </div>

      {/* ROW 5: ACTIVE PROJECT SITES */}
      <ProjectCards projects={projectsSummary} />
    </div>
  );
}
