"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  fetchProfitLossAction,
  fetchTradingAccountAction,
  fetchBalanceSheetAction,
  fetchTrialBalanceDataAction,
  fetchSalesSummaryAction,
  fetchItemWiseSalesAction,
  fetchAgingReportAction,
  fetchStockValuationAction,
  fetchABCAnalysisAction,
  fetchProjectProfitabilityAction,
  fetchCashFlowAction,
  fetchPurchaseSummaryAction,
  fetchVendorOutstandingAction
} from "@/modules/accounting/actions";
import {
  exportProfitLossExcel,
  exportTradingAccountExcel,
  exportBalanceSheetExcel,
  exportTrialBalanceExcel,
  exportSalesSummaryExcel,
  exportItemWiseSalesExcel,
  exportAgingExcel,
  exportStockValuationExcel,
  exportABCAnalysisExcel,
  exportProjectProfitabilityExcel,
  exportCashFlowExcel,
  exportPurchaseSummaryExcel,
  exportVendorOutstandingExcel
} from "@/lib/export/reports-excel";
import {
  downloadProfitLossPDF,
  downloadTradingAccountPDF,
  downloadBalanceSheetPDF,
  downloadTrialBalancePDF,
  downloadAgingPDF,
  downloadProjectProfitabilityPDF,
  downloadCashFlowPDF,
  downloadSalesSummaryPDF,
  downloadItemWiseSalesPDF,
  downloadStockValuationPDF,
  downloadABCAnalysisPDF,
  downloadPurchaseSummaryPDF,
  downloadVendorOutstandingPDF
} from "@/lib/export/reports-pdf";

import { ProfitLossReport } from "./ProfitLossReport";
import { BalanceSheetReport } from "./BalanceSheetReport";
import { TradingAccountReport } from "./TradingAccountReport";
import { OutstandingAgingReport } from "./OutstandingAgingReport";
import { CashFlowReport } from "./CashFlowReport";

import { NPRAmount } from "@/components/shared/NPRAmount";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Download, RefreshCw, BarChart, ShoppingBag } from "lucide-react";

interface ReportViewerProps {
  reportKey: string;
  onBack: () => void;
}

export function ReportViewer({ reportKey, onBack }: ReportViewerProps) {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  // Filters state
  const todayStr = new Date().toISOString().split("T")[0];
  const lastMonthStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [asOf, setAsOf] = useState<string>(todayStr);
  const [dateFrom, setDateFrom] = useState<string>(lastMonthStr);
  const [dateTo, setDateTo] = useState<string>(todayStr);
  const [channel, setChannel] = useState<string>("ALL");

  // Fetch Report Data
  const generateReport = async () => {
    setLoading(true);
    setReportData(null);
    try {
      let res: any = null;
      switch (reportKey) {
        case "profit_loss":
          res = await fetchProfitLossAction(month, year);
          break;
        case "trading_account":
          res = await fetchTradingAccountAction(month, year);
          break;
        case "balance_sheet":
          res = await fetchBalanceSheetAction(asOf);
          break;
        case "trial_balance":
          res = await fetchTrialBalanceDataAction(asOf);
          break;
        case "sales_summary":
          res = await fetchSalesSummaryAction(dateFrom, dateTo, channel === "ALL" ? undefined : (channel as any));
          break;
        case "item_wise_sales":
          res = await fetchItemWiseSalesAction(dateFrom, dateTo);
          break;
        case "customer_aging":
          res = await fetchAgingReportAction();
          break;
        case "stock_valuation":
          res = await fetchStockValuationAction();
          break;
        case "abc_analysis":
          res = await fetchABCAnalysisAction();
          break;
        case "project_profitability":
          res = await fetchProjectProfitabilityAction();
          break;
        case "cash_flow":
          res = await fetchCashFlowAction(month, year);
          break;
        case "purchase_summary":
          res = await fetchPurchaseSummaryAction(dateFrom, dateTo);
          break;
        case "vendor_outstanding":
          res = await fetchVendorOutstandingAction();
          break;
        default:
          throw new Error("Invalid report key requested");
      }

      setReportData(res);
      toast.success("Analytical Report compiled successfully");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to compile reporting data");
    } finally {
      setLoading(false);
    }
  };

  // Run on mount for instant visual load
  useEffect(() => {
    generateReport();
  }, [reportKey]);

  // Excel triggers
  const triggerExcelDownload = () => {
    if (!reportData) return;
    try {
      let blob: Blob;
      let filename = `${reportKey}_report.xlsx`;
      switch (reportKey) {
        case "profit_loss":
          blob = exportProfitLossExcel(reportData);
          break;
        case "trading_account":
          blob = exportTradingAccountExcel(reportData);
          break;
        case "balance_sheet":
          blob = exportBalanceSheetExcel(reportData);
          break;
        case "trial_balance":
          blob = exportTrialBalanceExcel(reportData);
          break;
        case "sales_summary":
          blob = exportSalesSummaryExcel(reportData);
          break;
        case "item_wise_sales":
          blob = exportItemWiseSalesExcel(reportData);
          break;
        case "customer_aging":
          blob = exportAgingExcel(reportData);
          break;
        case "stock_valuation":
          blob = exportStockValuationExcel(reportData);
          break;
        case "abc_analysis":
          blob = exportABCAnalysisExcel(reportData);
          break;
        case "project_profitability":
          blob = exportProjectProfitabilityExcel(reportData);
          break;
        case "cash_flow":
          blob = exportCashFlowExcel(reportData);
          break;
        case "purchase_summary":
          blob = exportPurchaseSummaryExcel(reportData);
          break;
        case "vendor_outstanding":
          blob = exportVendorOutstandingExcel(reportData);
          break;
        default:
          return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      toast.success("Excel Spreadsheet statement downloaded");
    } catch (e) {
      toast.error("Failed to generate Excel download");
    }
  };

  // PDF triggers
  const triggerPDFDownload = async () => {
    if (!reportData) return;
    try {
      let blob: Blob;
      let filename = `${reportKey}_report.pdf`;
      switch (reportKey) {
        case "profit_loss":
          blob = await downloadProfitLossPDF(reportData);
          break;
        case "trading_account":
          blob = await downloadTradingAccountPDF(reportData);
          break;
        case "balance_sheet":
          blob = await downloadBalanceSheetPDF(reportData);
          break;
        case "trial_balance":
          blob = await downloadTrialBalancePDF(reportData);
          break;
        case "customer_aging":
          blob = await downloadAgingPDF(reportData);
          break;
        case "project_profitability":
          blob = await downloadProjectProfitabilityPDF(reportData);
          break;
        case "cash_flow":
          blob = await downloadCashFlowPDF(reportData);
          break;
        case "sales_summary":
          blob = await downloadSalesSummaryPDF(reportData);
          break;
        case "item_wise_sales":
          blob = await downloadItemWiseSalesPDF(reportData);
          break;
        case "stock_valuation":
          blob = await downloadStockValuationPDF(reportData);
          break;
        case "abc_analysis":
          blob = await downloadABCAnalysisPDF(reportData);
          break;
        case "purchase_summary":
          blob = await downloadPurchaseSummaryPDF(reportData);
          break;
        case "vendor_outstanding":
          blob = await downloadVendorOutstandingPDF(reportData);
          break;
        default:
          toast.error("PDF download not supported for this report type.");
          return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      toast.success("Certified A4 PDF statement downloaded");
    } catch (e) {
      toast.error("Failed to generate PDF document");
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters Header bar */}
      <Card className="border border-zinc-100 shadow-sm rounded-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="px-4 py-2 border border-zinc-200 text-xs font-bold rounded-xl text-zinc-500 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 transition-colors"
            >
              ← Back to Menu
            </button>
            <div>
              <h1 className="text-base font-bold text-zinc-800 dark:text-zinc-100 uppercase tracking-wide">
                Configure Report Filters
              </h1>
              <p className="text-xs text-zinc-400 font-medium">Select the boundaries to compile ledger logs.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Months filters */}
            {(reportKey === "profit_loss" || reportKey === "trading_account" || reportKey === "cash_flow") && (
              <div className="flex items-center gap-2">
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="px-3 py-2 border border-zinc-200 text-xs font-semibold rounded-xl dark:border-zinc-800 dark:bg-zinc-900 focus:outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString("default", { month: "long" })}
                    </option>
                  ))}
                </select>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="px-3 py-2 border border-zinc-200 text-xs font-semibold rounded-xl dark:border-zinc-800 dark:bg-zinc-900 focus:outline-none"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* AsOf target date picker */}
            {(reportKey === "balance_sheet" || reportKey === "trial_balance") && (
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="text-zinc-400">As Of:</span>
                <input
                  type="date"
                  value={asOf}
                  onChange={(e) => setAsOf(e.target.value)}
                  className="px-3 py-2 border border-zinc-200 rounded-xl dark:border-zinc-800 dark:bg-zinc-900 focus:outline-none"
                />
              </div>
            )}

            {/* Date range filters */}
            {(reportKey === "sales_summary" || reportKey === "item_wise_sales" || reportKey === "purchase_summary") && (
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="text-zinc-400">From:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 border border-zinc-200 rounded-xl dark:border-zinc-800 dark:bg-zinc-900 focus:outline-none"
                />
                <span className="text-zinc-400">To:</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 border border-zinc-200 rounded-xl dark:border-zinc-800 dark:bg-zinc-900 focus:outline-none"
                />

                {reportKey === "sales_summary" && (
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="px-3 py-2 border border-zinc-200 rounded-xl dark:border-zinc-800 dark:bg-zinc-900 focus:outline-none"
                  >
                    <option value="ALL">All Channels</option>
                    <option value="RETAIL">Retail Only</option>
                    <option value="WHOLESALE">Wholesale Only</option>
                    <option value="PROJECT">Project Only</option>
                  </select>
                )}
              </div>
            )}

            <button
              onClick={generateReport}
              disabled={loading}
              className="px-4 py-2 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 text-xs font-bold rounded-xl flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Run Query
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Downloader toolbar */}
      {reportData && !loading && (
        <div className="flex justify-end gap-3 animate-fade-in">
          {reportData && !loading && (
            <button
              onClick={triggerPDFDownload}
              className="px-4 py-2.5 bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold rounded-2xl flex items-center gap-2 border border-zinc-200/40 dark:border-zinc-800/40 transition-colors"
            >
              <Download className="h-4.5 w-4.5 text-zinc-500" />
              Download A4 PDF Statement
            </button>
          )}

          <button
            onClick={triggerExcelDownload}
            className="px-4 py-2.5 bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold rounded-2xl flex items-center gap-2 border border-zinc-200/40 dark:border-zinc-800/40 transition-colors"
          >
            <Download className="h-4.5 w-4.5 text-emerald-500" />
            Download Excel Spreadsheet
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="space-y-6">
          <div className="h-16 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-2xl w-full" />
          <div className="h-64 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-3xl w-full" />
        </div>
      )}

      {/* Compiled Reports Renders */}
      {!loading && reportData && (
        <div className="space-y-6 animate-fade-in">
          {reportKey === "profit_loss" && <ProfitLossReport data={reportData} />}
          {reportKey === "balance_sheet" && <BalanceSheetReport data={reportData} />}
          {reportKey === "trading_account" && <TradingAccountReport data={reportData} />}
          {reportKey === "customer_aging" && <OutstandingAgingReport data={reportData} />}
          {reportKey === "cash_flow" && <CashFlowReport data={reportData} />}

          {/* 4. TRIAL BALANCE */}
          {reportKey === "trial_balance" && (
            <Card className="border border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 shadow-md rounded-3xl overflow-hidden">
              <div className="bg-zinc-900 text-zinc-100 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Analytical Trial Balance</h2>
                  <p className="text-xs text-zinc-400 font-medium mt-1">Aggregated Sum of accounts as of: {asOf}</p>
                </div>
                <div className="p-3 bg-zinc-800 rounded-2xl"><RefreshCw className="h-5 w-5 text-indigo-400" /></div>
              </div>
              <CardContent className="p-8">
                <div className="border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden text-sm font-semibold">
                  <div className="grid grid-cols-5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-400">
                    <span>Account Code</span>
                    <span className="col-span-2">Account Name Particulars</span>
                    <span className="text-right">Debit Balance (Dr)</span>
                    <span className="text-right">Credit Balance (Cr)</span>
                  </div>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {reportData.rows.map((r: any, idx: number) => (
                      <div key={idx} className="grid grid-cols-5 px-6 py-3.5 items-center">
                        <span className="text-xs font-bold text-zinc-400">{r.code}</span>
                        <span className="col-span-2 text-zinc-800 dark:text-zinc-200">{r.name} <span className="text-[10px] text-zinc-400">({r.type})</span></span>
                        <span className="text-right text-zinc-800 dark:text-zinc-200">{r.debit !== "0" ? <NPRAmount amount={Number(r.debit)} /> : "-"}</span>
                        <span className="text-right text-zinc-800 dark:text-zinc-200">{r.credit !== "0" ? <NPRAmount amount={Number(r.credit)} /> : "-"}</span>
                      </div>
                    ))}
                    <div className="grid grid-cols-5 px-6 py-5 items-center bg-zinc-50/50 dark:bg-zinc-900/30 font-extrabold border-t border-zinc-300 dark:border-zinc-600 text-zinc-800 dark:text-zinc-200 uppercase tracking-wider text-xs">
                      <span>-</span>
                      <span className="col-span-2">TOTAL COMPREHENSIVE BALANCES</span>
                      <span className="text-right"><NPRAmount amount={Number(reportData.totals.debit)} /></span>
                      <span className="text-right"><NPRAmount amount={Number(reportData.totals.credit)} /></span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 5. SALES SUMMARY (Grid + Simple Table) */}
          {reportKey === "sales_summary" && (
            <Card className="border border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 shadow-md rounded-3xl overflow-hidden">
              <div className="bg-zinc-900 text-zinc-100 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Sales Chronological log</h2>
                  <p className="text-xs text-zinc-400 font-medium mt-1">Daily taxable sales amounts between {dateFrom} and {dateTo}</p>
                </div>
                <div className="p-3 bg-zinc-800 rounded-2xl"><BarChart className="h-5 w-5 text-indigo-400" /></div>
              </div>
              <CardContent className="p-8">
                <div className="border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden text-sm font-semibold">
                  <div className="grid grid-cols-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-400">
                    <span>Date</span>
                    <span className="text-right">Daily Invoice count</span>
                    <span className="text-right">Taxable Sales Amount</span>
                  </div>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 max-h-[400px] overflow-y-auto">
                    {reportData.map((r: any, idx: number) => (
                      <div key={idx} className="grid grid-cols-3 px-6 py-3">
                        <span className="text-zinc-800 dark:text-zinc-200">{r.date}</span>
                        <span className="text-right text-zinc-800 dark:text-zinc-200">{r.count}</span>
                        <span className="text-right text-zinc-900 dark:text-zinc-50"><NPRAmount amount={r.amount} /></span>
                      </div>
                    ))}
                    {reportData.length === 0 && (
                      <div className="p-8 text-center text-zinc-400">No sales logged in this period.</div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 px-6 py-5 items-center bg-zinc-50/50 dark:bg-zinc-900/30 font-extrabold border-t border-zinc-300 dark:border-zinc-600 text-zinc-800 dark:text-zinc-200 uppercase tracking-wider text-xs">
                    <span>TOTAL COMPILATION</span>
                    <span className="text-right">{reportData.reduce((acc: number, curr: any) => acc + curr.count, 0)}</span>
                    <span className="text-right text-zinc-900 dark:text-zinc-50"><NPRAmount amount={reportData.reduce((acc: number, curr: any) => acc + curr.amount, 0)} /></span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 6. ITEM-WISE SALES */}
          {reportKey === "item_wise_sales" && (
            <Card className="border border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 shadow-md rounded-3xl overflow-hidden">
              <div className="bg-zinc-900 text-zinc-100 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Product Sales Volumes & Profits</h2>
                  <p className="text-xs text-zinc-400 font-medium mt-1">Item-wise sales performance breakdown</p>
                </div>
                <div className="p-3 bg-zinc-800 rounded-2xl"><ShoppingBag className="h-5 w-5 text-indigo-400" /></div>
              </div>
              <CardContent className="p-8">
                <div className="border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden text-sm font-semibold">
                  <div className="grid grid-cols-6 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-400">
                    <span>Code</span>
                    <span className="col-span-2">Product Description Name</span>
                    <span className="text-right">Qty Sold</span>
                    <span className="text-right">Sales Revenue</span>
                    <span className="text-right">Direct Net profit</span>
                  </div>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {reportData.map((r: any, idx: number) => (
                      <div key={idx} className="grid grid-cols-6 px-6 py-3.5 items-center">
                        <span className="text-xs font-bold text-zinc-400">{r.code}</span>
                        <span className="col-span-2 text-zinc-800 dark:text-zinc-200">{r.name}</span>
                        <span className="text-right text-zinc-800 dark:text-zinc-200">{r.quantity}</span>
                        <span className="text-right text-zinc-800 dark:text-zinc-200"><NPRAmount amount={r.revenue} /></span>
                        <span className="text-right text-emerald-600 dark:text-emerald-400 font-bold"><NPRAmount amount={r.profit} /></span>
                      </div>
                    ))}
                    {reportData.length === 0 && (
                      <div className="p-8 text-center text-zinc-400">No product sales mapped in this period.</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 8. STOCK VALUATION (FIFO) */}
          {reportKey === "stock_valuation" && (
            <Card className="border border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 shadow-md rounded-3xl overflow-hidden">
              <div className="bg-zinc-900 text-zinc-100 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">FIFO Inventory Stock Valuation</h2>
                  <p className="text-xs text-zinc-400 font-medium mt-1">Real-time valuation based on chronological procurement costs</p>
                </div>
                <div className="p-3 bg-zinc-800 rounded-2xl"><RefreshCw className="h-5 w-5 text-indigo-400" /></div>
              </div>
              <CardContent className="p-8">
                <div className="border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden text-sm font-semibold">
                  <div className="grid grid-cols-5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-400">
                    <span>Item Code</span>
                    <span className="col-span-2">Product Description Particulars</span>
                    <span className="text-right">In-Stock Qty</span>
                    <span className="text-right">FIFO Valuation</span>
                  </div>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {reportData.map((r: any, idx: number) => (
                      <div key={idx} className="grid grid-cols-5 px-6 py-3.5 items-center">
                        <span className="text-xs font-bold text-zinc-400">{r.code}</span>
                        <span className="col-span-2 text-zinc-800 dark:text-zinc-200">{r.name} <span className="text-[10px] text-zinc-400 font-medium"> (Avg Cost: <NPRAmount amount={r.avgCost} />)</span></span>
                        <span className="text-right text-zinc-800 dark:text-zinc-200">{r.currentStock}</span>
                        <span className="text-right text-zinc-900 dark:text-zinc-50 font-bold"><NPRAmount amount={r.totalValuation} /></span>
                      </div>
                    ))}
                    <div className="grid grid-cols-5 px-6 py-5 items-center bg-zinc-50/50 dark:bg-zinc-900/30 font-extrabold border-t border-zinc-300 dark:border-zinc-600 text-zinc-800 dark:text-zinc-200 uppercase tracking-wider text-xs">
                      <span>-</span>
                      <span className="col-span-2">AGGREGATED INVENTORY VALUE</span>
                      <span className="text-right">{reportData.reduce((acc: number, curr: any) => acc + curr.currentStock, 0)}</span>
                      <span className="text-right text-zinc-900 dark:text-zinc-50"><NPRAmount amount={reportData.reduce((acc: number, curr: any) => acc + curr.totalValuation, 0)} /></span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 9. ABC ANALYSIS */}
          {reportKey === "abc_analysis" && (
            <Card className="border border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 shadow-md rounded-3xl overflow-hidden">
              <div className="bg-zinc-900 text-zinc-100 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">ABC Revenue Pareto Categorization</h2>
                  <p className="text-xs text-zinc-400 font-medium mt-1">Products classified into A (Top 70% share), B (Next 20%), C (Bottom 10%)</p>
                </div>
                <div className="p-3 bg-zinc-800 rounded-2xl"><RefreshCw className="h-5 w-5 text-indigo-400" /></div>
              </div>
              <CardContent className="p-8">
                <div className="border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden text-sm font-semibold">
                  <div className="grid grid-cols-6 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-400">
                    <span>Item Code</span>
                    <span className="col-span-2">Product Description Name</span>
                    <span className="text-right">Revenue Earned</span>
                    <span className="text-right">Share %</span>
                    <span className="text-center">ABC Class</span>
                  </div>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {reportData.map((r: any, idx: number) => {
                      const isA = r.category === "A";
                      const isB = r.category === "B";
                      return (
                        <div key={idx} className="grid grid-cols-6 px-6 py-3.5 items-center">
                          <span className="text-xs font-bold text-zinc-400">{r.code}</span>
                          <span className="col-span-2 text-zinc-800 dark:text-zinc-200">{r.name}</span>
                          <span className="text-right text-zinc-800 dark:text-zinc-200"><NPRAmount amount={r.revenue} /></span>
                          <span className="text-right text-zinc-500">{r.percentage.toFixed(2)}% <span className="text-[10px] text-zinc-400">(cum: {r.cumulativePercentage.toFixed(1)}%)</span></span>
                          <span className="text-center">
                            <span className={`px-3 py-1 text-xs font-extrabold rounded-xl ${isA ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400" : isB ? "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-850 dark:text-zinc-400"}`}>
                              Class {r.category}
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 10. PROJECT PROFITABILITY */}
          {reportKey === "project_profitability" && (
            <Card className="border border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 shadow-md rounded-3xl overflow-hidden">
              <div className="bg-zinc-900 text-zinc-100 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Projects Contract Profitability Summary</h2>
                  <p className="text-xs text-zinc-400 font-medium mt-1">Milestones billed vs material consumption job costing margins</p>
                </div>
                <div className="p-3 bg-zinc-800 rounded-2xl"><RefreshCw className="h-5 w-5 text-indigo-400" /></div>
              </div>
              <CardContent className="p-8">
                <div className="border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden text-sm font-semibold">
                  <div className="grid grid-cols-8 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-400">
                    <span>PRJ Code</span>
                    <span className="col-span-2">Project contract Name</span>
                    <span className="text-right">Contract Amt</span>
                    <span className="text-right">Total Billed</span>
                    <span className="text-right">Material Cost</span>
                    <span className="text-right">Gross Profit</span>
                    <span className="text-right">Margin %</span>
                  </div>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {reportData.map((r: any, idx: number) => {
                      const isHigh = r.margin >= 20;
                      const isLow = r.margin < 10;
                      return (
                        <div key={idx} className="grid grid-cols-8 px-6 py-3.5 items-center">
                          <span className="text-xs font-bold text-zinc-400">{r.code}</span>
                          <div className="col-span-2 pr-4">
                            <span className="text-zinc-800 dark:text-zinc-200 block truncate">{r.name}</span>
                            <span className="text-[10px] text-zinc-400 font-medium block">Client: {r.clientName}</span>
                          </div>
                          <span className="text-right text-zinc-800 dark:text-zinc-200"><NPRAmount amount={r.contractAmount} /></span>
                          <span className="text-right text-zinc-800 dark:text-zinc-200"><NPRAmount amount={r.totalBilled} /></span>
                          <span className="text-right text-rose-600 dark:text-rose-400"><NPRAmount amount={r.materialCost} /></span>
                          <span className="text-right text-zinc-900 dark:text-zinc-50"><NPRAmount amount={r.profit} /></span>
                          <span className={`text-right font-extrabold ${isHigh ? "text-emerald-600 dark:text-emerald-400" : isLow ? "text-rose-600 dark:text-rose-400" : "text-amber-500"}`}>
                            {r.margin.toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {/* 12. PURCHASE SUMMARY (similar to sales_summary) */}
          {reportKey === "purchase_summary" && (
            <Card className="border border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 shadow-md rounded-3xl overflow-hidden">
              <div className="bg-zinc-900 text-zinc-100 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Purchase Chronological Log</h2>
                  <p className="text-xs text-zinc-400 font-medium mt-1">Daily procurement purchase amounts between {dateFrom} and {dateTo}</p>
                </div>
                <div className="p-3 bg-zinc-800 rounded-2xl"><BarChart className="h-5 w-5 text-indigo-400" /></div>
              </div>
              <CardContent className="p-8">
                <div className="border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden text-sm font-semibold">
                  <div className="grid grid-cols-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-400">
                    <span>Date</span>
                    <span className="text-right">Daily Purchase Count</span>
                    <span className="text-right">Taxable Purchase Amount</span>
                  </div>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 max-h-[400px] overflow-y-auto">
                    {reportData.map((r: any, idx: number) => (
                      <div key={idx} className="grid grid-cols-3 px-6 py-3">
                        <span className="text-zinc-800 dark:text-zinc-200">{r.date}</span>
                        <span className="text-right text-zinc-800 dark:text-zinc-200">{r.count}</span>
                        <span className="text-right text-zinc-900 dark:text-zinc-50"><NPRAmount amount={r.amount} /></span>
                      </div>
                    ))}
                    {reportData.length === 0 && (
                      <div className="p-8 text-center text-zinc-400">No purchases logged in this period.</div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 px-6 py-5 items-center bg-zinc-50/50 dark:bg-zinc-900/30 font-extrabold border-t border-zinc-300 dark:border-zinc-600 text-zinc-800 dark:text-zinc-200 uppercase tracking-wider text-xs">
                    <span>TOTAL COMPILATION</span>
                    <span className="text-right">{reportData.reduce((acc: number, curr: any) => acc + curr.count, 0)}</span>
                    <span className="text-right text-zinc-900 dark:text-zinc-50"><NPRAmount amount={reportData.reduce((acc: number, curr: any) => acc + curr.amount, 0)} /></span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 13. VENDOR OUTSTANDING PAYABLES */}
          {reportKey === "vendor_outstanding" && (
            <Card className="border border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 shadow-md rounded-3xl overflow-hidden">
              <div className="bg-zinc-900 text-zinc-100 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Vendor Outstanding Payables</h2>
                  <p className="text-xs text-zinc-400 font-medium mt-1">Outstanding balances owed to suppliers/creditors</p>
                </div>
                <div className="p-3 bg-zinc-800 rounded-2xl"><RefreshCw className="h-5 w-5 text-rose-400" /></div>
              </div>
              <CardContent className="p-8">
                <div className="border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden text-sm font-semibold">
                  <div className="grid grid-cols-4 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-400">
                    <span>Vendor Code</span>
                    <span className="col-span-2">Vendor / Supplier Particulars</span>
                    <span className="text-right">Outstanding Balance</span>
                  </div>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {reportData.map((r: any, idx: number) => (
                      <div key={idx} className="grid grid-cols-4 px-6 py-3.5 items-center">
                        <span className="text-xs font-bold text-zinc-400">{r.code}</span>
                        <span className="col-span-2 text-zinc-800 dark:text-zinc-200">
                          {r.name} <span className="text-[10px] text-zinc-400 font-medium">(PAN: {r.pan})</span>
                        </span>
                        <span className="text-right text-rose-600 font-bold"><NPRAmount amount={r.balance} /></span>
                      </div>
                    ))}
                    {reportData.length === 0 && (
                      <div className="p-8 text-center text-zinc-400">No outstanding vendor balances.</div>
                    )}
                    <div className="grid grid-cols-4 px-6 py-5 items-center bg-zinc-50/50 dark:bg-zinc-900/30 font-extrabold border-t border-zinc-300 dark:border-zinc-600 text-zinc-800 dark:text-zinc-200 uppercase tracking-wider text-xs">
                      <span>-</span>
                      <span className="col-span-2">TOTAL OUTSTANDING AP</span>
                      <span className="text-right text-rose-600"><NPRAmount amount={reportData.reduce((acc: number, curr: any) => acc + curr.balance, 0)} /></span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
