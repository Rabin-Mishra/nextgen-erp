"use client";

import React, { useState } from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { ReportViewer } from "../../../components/reports/ReportViewer";
import {
  TrendingUp,
  Calculator,
  Scale,
  RefreshCw,
  BarChart,
  ShoppingBag,
  AlertCircle,
  FileCheck,
  Percent,
  Briefcase,
  DollarSign
} from "lucide-react";

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const reportGroups = [
    {
      groupName: "Financial Accounts & Statements",
      desc: "Compile GAAP-compliant tax audit ledgers, trading margins, and snapshots.",
      reports: [
        {
          key: "profit_loss",
          title: "Profit & Loss Statement",
          desc: "Chronological Sales Revenues minus procurement COGS and operating expenses.",
          icon: TrendingUp,
          color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
        },
        {
          key: "trading_account",
          title: "Trading Account Margin",
          desc: "Compare opening inventory and purchases against closing stock to calculate trade COGS.",
          icon: Calculator,
          color: "text-amber-500 bg-amber-50 dark:bg-amber-950/20"
        },
        {
          key: "balance_sheet",
          title: "Balance Sheet Snapshot",
          desc: "Statements of financial position comparing safe assets against AP liabilities and equities.",
          icon: Scale,
          color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20"
        },
        {
          key: "trial_balance",
          title: "Trial Balance Sheet",
          desc: "Aggregated listing of all debtor and creditor ledgers ensuring balances match.",
          icon: RefreshCw,
          color: "text-teal-500 bg-teal-50 dark:bg-teal-950/20"
        },
        {
          key: "cash_flow",
          title: "Cash Flow Statement",
          desc: "GAAP direct-method flows tracking operating receipts, suppliers, capital, and assets.",
          icon: DollarSign,
          color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
        }
      ]
    },
    {
      groupName: "Sales & Receivables Analytics",
      desc: "Assess daily income velocities, product performances, and outstanding aging debts.",
      reports: [
        {
          key: "sales_summary",
          title: "Sales Summary",
          desc: "Daily sales billing volumes and counts filtered by date range and channels.",
          icon: BarChart,
          color: "text-blue-500 bg-blue-50 dark:bg-blue-950/20"
        },
        {
          key: "item_wise_sales",
          title: "Item-Wise Sales Volume",
          desc: "Top selling products showing quantity, contribution revenues, and profit margins.",
          icon: ShoppingBag,
          color: "text-rose-500 bg-rose-50 dark:bg-rose-950/20"
        },
        {
          key: "customer_aging",
          title: "Receivables Dues Aging",
          desc: "Aged debtor receivables broken down into 30, 60, 90, and 90+ overdue brackets.",
          icon: AlertCircle,
          color: "text-red-500 bg-red-50 dark:bg-red-950/20"
        }
      ]
    },
    {
      groupName: "Inventory Valuation & ABC Pareto",
      desc: "Manage stock values based on standard procurement logs and classifications.",
      reports: [
        {
          key: "stock_valuation",
          title: "FIFO Stock Valuation",
          desc: "Calculate in-hand stock value valued at chronological first-in-first-out costs.",
          icon: FileCheck,
          color: "text-cyan-500 bg-cyan-50 dark:bg-cyan-950/20"
        },
        {
          key: "abc_analysis",
          title: "ABC Pareto Analysis",
          desc: "Categorize inventory into A (top 70% revenue), B (next 20%), or C (rest) shares.",
          icon: Percent,
          color: "text-purple-500 bg-purple-50 dark:bg-purple-950/20"
        }
      ]
    },
    {
      groupName: "Projects Site Costings",
      desc: "Evaluate construction contract profit margins and dispatch costings.",
      reports: [
        {
          key: "project_profitability",
          title: "Projects Job Margin Costing",
          desc: "Compare project contract budgets against site dispatches and Direct P&L.",
          icon: Briefcase,
          color: "text-orange-500 bg-orange-50 dark:bg-orange-950/20"
        }
      ]
    },
    {
      groupName: "Purchase & Payables Analysis",
      desc: "Analyze procurement expenses, outstanding vendor balances, and order pipelines.",
      reports: [
        {
          key: "purchase_summary",
          title: "Purchase Summary",
          desc: "Daily procurement purchase volumes and count analytics within period boundaries.",
          icon: FileCheck,
          color: "text-blue-500 bg-blue-50 dark:bg-blue-950/20"
        },
        {
          key: "vendor_outstanding",
          title: "Vendor Outstanding AP",
          desc: "Summary of outstanding balances and payables owed to suppliers/creditors.",
          icon: AlertCircle,
          color: "text-rose-500 bg-rose-50 dark:bg-rose-950/20"
        }
      ]
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title={selectedReport ? "Dynamic Report Viewer" : "Analytical Reports Menu"}
        description={selectedReport ? "Configure filters, run database queries, and download client sheets." : "Review tax compliance reports, dynamic Balance Sheets, stock valuations, and project profit margins."}
      />

      {/* RENDER DYNAMIC REPORT VIEW OR MAIN GRID MENU */}
      {selectedReport ? (
        <ReportViewer reportKey={selectedReport} onBack={() => setSelectedReport(null)} />
      ) : (
        <div className="space-y-12">
          {reportGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50 tracking-wide uppercase">
                  {group.groupName}
                </h2>
                <p className="text-xs text-zinc-400 font-medium">{group.desc}</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.reports.map((rep) => {
                  const Icon = rep.icon;
                  return (
                    <Card
                      key={rep.key}
                      className="border border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 shadow-sm rounded-2xl flex flex-col justify-between hover:border-zinc-200 dark:hover:border-zinc-700 transition-all duration-300"
                    >
                      <CardHeader className="flex flex-row items-start justify-between pb-4">
                        <div className="space-y-1 pr-4">
                          <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                            {rep.title}
                          </CardTitle>
                        </div>
                        <div className={`p-2.5 rounded-xl ${rep.color}`}>
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0 pb-6 flex-grow flex flex-col justify-between space-y-4">
                        <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                          {rep.desc}
                        </p>
                        <button
                          onClick={() => setSelectedReport(rep.key)}
                          className="w-full py-2.5 text-center text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-xl transition-all duration-300"
                        >
                          View Statement
                        </button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
