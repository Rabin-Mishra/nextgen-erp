"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddExpenseModal } from "./AddExpenseModal";
import { deleteExpense } from "@/modules/expenses/actions";
import { formatDate, formatNPR, formatAmountOnly } from "@/lib/utils";
import { toast } from "sonner";
import { DualDateDisplay } from "@/components/shared/DualDateDisplay";
import {
  Trash2,
  TrendingDown,
  Eye,
  Pencil,
  X,
  Download,
  CalendarDays,
  FileSpreadsheet,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { hasPermission } from "@/auth/permissions";
import { Role } from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { updateExpense } from "@/modules/expenses/actions";
import { useRouter } from "next/navigation";

interface Expense {
  id: string;
  expenseCode: string;
  category: string;
  amount: number;
  expenseDate: string;
  paymentMethod: string;
  notes?: string | null;
}

interface ExpensesPageProps {
  expenses: Expense[];
  availableMonths: string[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  searchQuery: string;
  selectedMonthFilter: string | null;
  stats: {
    totalThisMonth: string;
    breakdown: Array<{ category: string; amount: string }>;
  };
  userId: string;
  role?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMonthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(key: string) {
  const [year, month] = key.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function downloadCSV(rows: Expense[], monthLabel: string) {
  const header = ["Code", "Date", "Category", "Amount (NPR)", "Payment Method", "Notes"];
  const csvRows = rows.map((e) => [
    e.expenseCode,
    new Date(e.expenseDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    e.category,
    Number(e.amount).toFixed(2),
    e.paymentMethod,
    (e.notes || "").replace(/,/g, " "),
  ]);

  const total = rows.reduce((s, e) => s + Number(e.amount), 0);
  csvRows.push(["", "", "TOTAL", total.toFixed(2), "", ""]);

  const content = [header, ...csvRows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Expenses_${monthLabel.replace(/\s/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPDF(rows: Expense[], monthLabel: string) {
  const total = rows.reduce((s, e) => s + Number(e.amount), 0);
  const printDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // Build category summary
  const byCategory: Record<string, number> = {};
  rows.forEach((e) => { byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount); });
  const catSummaryRows = Object.entries(byCategory)
    .map(([cat, amt]) => `<tr><td style="padding:6px 12px;border:1px solid #e5e7eb">${cat}</td><td style="padding:6px 12px;border:1px solid #e5e7eb;text-align:right;font-weight:600">NPR ${Number(amt).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></tr>`)
    .join("");

  // Build expense rows
  const expenseRows = rows.map((e, i) => `
    <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f9fafb"}">
      <td style="padding:7px 10px;border:1px solid #e5e7eb;font-family:monospace;color:#e11d48;font-weight:700">${e.expenseCode}</td>
      <td style="padding:7px 10px;border:1px solid #e5e7eb;color:#374151">${new Date(e.expenseDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</td>
      <td style="padding:7px 10px;border:1px solid #e5e7eb">
        <span style="padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;background:#fef3c7;color:#92400e">${e.category}</span>
      </td>
      <td style="padding:7px 10px;border:1px solid #e5e7eb;text-align:right;font-weight:700;color:#111827">NPR ${Number(e.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
      <td style="padding:7px 10px;border:1px solid #e5e7eb;text-align:center">
        <span style="padding:2px 8px;border-radius:4px;font-size:11px;background:#f3f4f6;color:#374151">${e.paymentMethod}</span>
      </td>
      <td style="padding:7px 10px;border:1px solid #e5e7eb;color:#9ca3af;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.notes || "—"}</td>
    </tr>
  `).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Expense Report — ${monthLabel}</title>
  <style>
    @page { size: A4 landscape; margin: 18mm 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #e11d48; padding-bottom: 14px; margin-bottom: 20px; }
    .company-name { font-size: 22px; font-weight: 800; color: #111827; letter-spacing: -0.5px; }
    .company-sub { font-size: 11px; color: #6b7280; margin-top: 3px; }
    .report-title { text-align: right; }
    .report-title h2 { font-size: 16px; font-weight: 700; color: #e11d48; }
    .report-title p { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .section-title { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; margin-top: 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead tr { background: #111827; color: #ffffff; }
    thead th { padding: 9px 10px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
    thead th:nth-child(4) { text-align: right; }
    .tfoot-row td { padding: 9px 10px; background: #f3f4f6; font-weight: 700; border: 1px solid #e5e7eb; }
    .summary-table { width: auto; min-width: 300px; }
    .total-box { margin-top: 16px; background: #fef2f2; border: 2px solid #e11d48; border-radius: 8px; padding: 12px 18px; display: inline-block; }
    .total-box .label { font-size: 10px; color: #9b1c1c; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
    .total-box .amount { font-size: 22px; font-weight: 800; color: #e11d48; margin-top: 2px; }
    .footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 12px; display: flex; justify-content: space-between; font-size: 10px; color: #9ca3af; }
    .sig { margin-top: 40px; border-top: 1px solid #374151; width: 180px; padding-top: 6px; font-size: 10px; color: #6b7280; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">NextGen ERP</div>
      <div class="company-sub">Operating Expenses Report</div>
    </div>
    <div class="report-title">
      <h2>Expense Ledger — ${monthLabel}</h2>
      <p>Generated: ${printDate} &nbsp;|&nbsp; Total Entries: ${rows.length}</p>
    </div>
  </div>

  <div class="section-title">Category Summary</div>
  <table class="summary-table">
    <thead><tr><th>Category</th><th style="text-align:right">Total (NPR)</th></tr></thead>
    <tbody>${catSummaryRows}</tbody>
  </table>

  <div class="total-box" style="margin-top:12px">
    <div class="label">${monthLabel} — Grand Total</div>
    <div class="amount">NPR ${total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
  </div>

  <div class="section-title" style="margin-top:24px">Detailed Expense Journal Entries</div>
  <table>
    <thead>
      <tr>
        <th>Code</th>
        <th>Date</th>
        <th>Category</th>
        <th style="text-align:right">Amount (NPR)</th>
        <th style="text-align:center">Vault</th>
        <th>Memo / Notes</th>
      </tr>
    </thead>
    <tbody>${expenseRows}</tbody>
    <tfoot>
      <tr class="tfoot-row">
        <td colspan="3" style="font-weight:700;font-size:12px">TOTAL</td>
        <td style="text-align:right;font-weight:800;font-size:13px;color:#e11d48">NPR ${total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        <td colspan="2"></td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">
    <span>NextGen Interior &amp; Waterproofing ERP &nbsp;|&nbsp; Confidential</span>
    <span>Printed: ${printDate}</span>
  </div>

  <div style="margin-top:40px;display:flex;gap:80px">
    <div class="sig">Prepared By</div>
    <div class="sig">Approved By</div>
    <div class="sig">Accounts</div>
  </div>

  <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };<\/script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=1000,height=700");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ExpensesPage({
  expenses,
  availableMonths,
  pagination,
  searchQuery,
  selectedMonthFilter,
  stats,
  userId,
  role,
}: ExpensesPageProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const currentMonthKey = getMonthKey(new Date().toISOString());
  const [selectedMonth, setSelectedMonth] = useState<string>(selectedMonthFilter || currentMonthKey);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    setSelectedMonth(selectedMonthFilter || currentMonthKey);
  }, [selectedMonthFilter, currentMonthKey]);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const urlSearch = new URLSearchParams(window.location.search).get("search") ?? "";
    if (localSearch === urlSearch) {
      return;
    }

    const timer = setTimeout(() => {
      const current = new URLSearchParams(window.location.search);
      if (localSearch) {
        current.set("search", localSearch);
      } else {
        current.delete("search");
      }
      current.set("page", "1"); // Reset to page 1 on search
      router.push(`${window.location.pathname}?${current.toString()}`);
    }, 350);

    return () => clearTimeout(timer);
  }, [localSearch, router]);

  const handleMonthChange = (val: string) => {
    setSelectedMonth(val);
    const current = new URLSearchParams(window.location.search);
    if (val && val !== "all") {
      current.set("month", val);
    } else {
      current.delete("month");
    }
    current.set("page", "1"); // Reset to page 1 on month change
    router.push(`${window.location.pathname}?${current.toString()}`);
  };

  const handlePageChange = (pageIndex: number) => {
    const current = new URLSearchParams(window.location.search);
    current.set("page", String(pageIndex + 1));
    router.push(`${window.location.pathname}?${current.toString()}`);
  };

  // With server-side pagination/filtering, expenses is already pre-filtered
  const filteredExpenses = expenses;

  const filteredTotal = useMemo(
    () => filteredExpenses.reduce((s, e) => s + Number(e.amount), 0),
    [filteredExpenses]
  );

  // View modal state
  const [viewExpense, setViewExpense] = useState<Expense | null>(null);

  // Edit modal state
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editPayment, setEditPayment] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const openEdit = (e: Expense) => {
    setEditExpense(e);
    setEditCategory(e.category);
    setEditAmount(String(e.amount));
    setEditDate(e.expenseDate.split("T")[0]);
    setEditPayment(e.paymentMethod);
    setEditNotes(e.notes || "");
  };

  const handleDelete = (id: string, code: string) => {
    if (!confirm(`Delete expense ${code}? This will reverse the cash book entry.`)) return;
    startTransition(async () => {
      try {
        await deleteExpense(id, userId);
        toast.success("Expense deleted successfully!");
      } catch (err: any) {
        toast.error("Error: " + (err.message || "Failed to delete expense"));
      }
    });
  };

  const handleUpdate = () => {
    if (!editExpense) return;
    if (!editAmount || parseFloat(editAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    startTransition(async () => {
      try {
        await updateExpense(editExpense.id, {
          category: editCategory as any,
          amount: Number(editAmount),
          expenseDate: new Date(editDate),
          paymentMethod: editPayment as any,
          notes: editNotes || undefined,
        }, userId);
        toast.success("Expense updated successfully!");
        setEditExpense(null);
        router.refresh();
      } catch (err: any) {
        toast.error("Error: " + (err.message || "Failed to update expense"));
      }
    });
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "Office Rent": return "text-blue-700 bg-blue-50 border-blue-200";
      case "Travelling Expenses":
      case "Transport Inward":
        return "text-amber-700 bg-amber-50 border-amber-200";
      case "Salary": return "text-emerald-700 bg-emerald-50 border-emerald-200";
      default: return "text-purple-700 bg-purple-50 border-purple-200";
    }
  };

  const getCategoryIconColor = (cat: string) => {
    switch (cat) {
      case "Office Rent": return "text-blue-500 bg-blue-50 border-blue-200";
      case "Travelling Expenses":
      case "Transport Inward":
        return "text-amber-500 bg-amber-50 border-amber-200";
      case "Salary": return "text-emerald-500 bg-emerald-50 border-emerald-200";
      default: return "text-purple-500 bg-purple-50 border-purple-200";
    }
  };

  const selectClass = "w-full h-10 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-rose-400/50 focus:border-rose-400";

  const currentMonthLabel = selectedMonth === "all" ? "All Months" : getMonthLabel(selectedMonth);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Operating Expenses Ledger"
          description="Log daily running cost, Office Rent, Salary, Travelling Expenses, and double-entry vault allocations."
        />
        {hasPermission(role as Role, "expenses", "create") && <AddExpenseModal userId={userId} />}
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border border-zinc-200 bg-white rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 text-rose-500 rounded-xl border border-rose-200">
              <TrendingDown size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Total This Month</span>
              <span className="text-sm font-bold text-zinc-900">{formatNPR(Number(stats.totalThisMonth))}</span>
            </div>
          </CardContent>
        </Card>

        {stats.breakdown.map((b) => (
          <Card key={b.category} className="border border-zinc-200 bg-white rounded-2xl shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border font-bold text-base w-9 h-9 flex items-center justify-center ${getCategoryIconColor(b.category)}`}>
                ₨
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">{b.category}</span>
                <span className="text-sm font-bold text-zinc-900">{formatNPR(Number(b.amount))}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table section */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6">

        {/* Table header row with filter + download */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-bold text-zinc-900 uppercase tracking-wider">Expense Journal Entries</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {selectedMonth === "all"
                ? `Showing all ${expenses.length} entries`
                : `${filteredExpenses.length} entries · ${currentMonthLabel} · Total: ${formatNPR(filteredTotal)}`}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative flex-1 sm:flex-none sm:w-48">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search expenses..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="pl-8 h-9 w-full rounded-lg bg-zinc-50 border-zinc-200 focus:bg-white dark:bg-zinc-900/40 dark:border-zinc-800 text-xs"
              />
            </div>

            {/* Month selector */}
            <div className="relative flex items-center gap-1.5">
              <CalendarDays size={15} className="text-zinc-400 absolute left-2.5 pointer-events-none" />
              <select
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="h-9 pl-8 pr-3 rounded-lg border border-zinc-300 bg-white text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-rose-400/40 focus:border-rose-400 shadow-sm cursor-pointer"
              >
                <option value="all">All Months</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>{getMonthLabel(m)}</option>
                ))}
              </select>
            </div>

            {/* Download CSV button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadCSV(filteredExpenses, currentMonthLabel)}
              disabled={filteredExpenses.length === 0}
              className="h-9 px-3 gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 bg-white rounded-lg text-xs font-semibold shadow-sm"
            >
              <FileSpreadsheet size={14} />
              CSV
              {filteredExpenses.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                  {filteredExpenses.length}
                </span>
              )}
            </Button>

            {/* Download PDF button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadPDF(filteredExpenses, currentMonthLabel)}
              disabled={filteredExpenses.length === 0}
              className="h-9 px-3 gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50 hover:border-rose-400 bg-white rounded-lg text-xs font-semibold shadow-sm"
            >
              <FileText size={14} />
              PDF
              {filteredExpenses.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                  {filteredExpenses.length}
                </span>
              )}
            </Button>
          </div>

        </div>

        {/* Month summary card (if a specific month is selected) */}
        {selectedMonth !== "all" && filteredExpenses.length > 0 && (() => {
          const byCategory: Record<string, number> = {};
          filteredExpenses.forEach((e) => {
            byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
          });
          return (
            <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-100 flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Download size={14} className="text-rose-500" />
                <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">{currentMonthLabel} Summary</span>
              </div>
              <div className="flex flex-wrap gap-3 flex-1">
                {Object.entries(byCategory).map(([cat, amt]) => (
                  <span key={cat} className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${getCategoryColor(cat)}`}>
                    {cat}: {formatNPR(amt)}
                  </span>
                ))}
              </div>
              <div className="text-sm font-bold text-zinc-900 border-l border-rose-200 pl-4">
                Total: {formatNPR(filteredTotal)}
              </div>
            </div>
          );
        })()}

        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr className="border-b border-zinc-200">
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-left font-semibold">Code</th>
                <th className="px-4 py-3 text-left font-semibold">Category</th>
                <th className="px-4 py-3 text-right font-semibold">Amount (NPR)</th>
                <th className="px-4 py-3 text-center font-semibold">Vault Method</th>
                <th className="px-4 py-3 text-left font-semibold">Memo / Notes</th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {filteredExpenses.length ? (
                filteredExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="px-4 py-3 text-zinc-600"><DualDateDisplay date={e.expenseDate} /></td>
                    <td className="px-4 py-3 font-mono font-bold text-rose-500">{e.expenseCode}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getCategoryColor(e.category)}`}>
                        {e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-zinc-900">{formatAmountOnly(Number(e.amount))}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 text-xs font-semibold">{e.paymentMethod}</span>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-zinc-400 font-medium">{e.notes || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {/* View */}
                        <button
                          onClick={() => setViewExpense(e)}
                          className="p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                          title="View details"
                        >
                          <Eye size={14} />
                        </button>
                        {hasPermission(role as Role, "expenses", "edit") && (
                          <button
                            onClick={() => openEdit(e)}
                            className="p-1.5 text-zinc-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-all"
                            title="Edit expense"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {hasPermission(role as Role, "expenses", "delete") && (
                          <button
                            onClick={() => handleDelete(e.id, e.expenseCode)}
                            disabled={isPending}
                            className="p-1.5 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
                            title="Delete expense"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-zinc-400">
                      <CalendarDays size={28} className="text-zinc-300" />
                      <p className="text-sm font-medium">No expenses found for {currentMonthLabel}</p>
                      <p className="text-xs">Try selecting a different month or log a new expense.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            {/* Totals footer row */}
            {filteredExpenses.length > 0 && (
              <tfoot className="border-t-2 border-zinc-200 bg-zinc-50">
                <tr>
                  <td colSpan={3} className="px-4 py-2.5 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    {selectedMonth === "all" ? "Grand Total" : `${currentMonthLabel} Total`}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-zinc-900 text-sm">
                    {formatAmountOnly(filteredTotal)}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {/* Pagination Controls */}
        {pagination && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 mt-4 border-t pt-4">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Showing Page {pagination.page} of {Math.max(1, Math.ceil(pagination.total / pagination.pageSize))} (Total {pagination.total} records)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 2)}
                disabled={pagination.page === 1}
                className="h-9 w-9 p-0 border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page)}
                disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
                className="h-9 w-9 p-0 border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* ── View Details Modal ── */}
      {viewExpense && (
        <Dialog open={!!viewExpense} onOpenChange={() => setViewExpense(null)}>
          <DialogContent className="max-w-md bg-white border-zinc-200 rounded-2xl shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-zinc-900 font-bold flex items-center gap-2">
                <Eye size={16} className="text-blue-500" /> Expense Details
              </DialogTitle>
              <DialogDescription className="text-zinc-500 text-xs">
                Read-only view of recorded expense entry.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Code</p>
                  <p className="text-sm font-mono font-bold text-rose-500">{viewExpense.expenseCode}</p>
                </div>
                <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Date</p>
                  <p className="text-sm font-semibold text-zinc-800">{formatDate(viewExpense.expenseDate)}</p>
                </div>
              </div>
              <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Category</p>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getCategoryColor(viewExpense.category)}`}>
                  {viewExpense.category}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Amount</p>
                  <p className="text-base font-bold text-zinc-900">{formatNPR(Number(viewExpense.amount))}</p>
                </div>
                <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Payment Method</p>
                  <p className="text-sm font-semibold text-zinc-700">{viewExpense.paymentMethod}</p>
                </div>
              </div>
              <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Memo / Notes</p>
                <p className="text-sm text-zinc-600">{viewExpense.notes || "—"}</p>
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-zinc-100">
              <Button variant="outline" onClick={() => setViewExpense(null)} className="border-zinc-300 text-zinc-700">
                <X size={14} className="mr-1" /> Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Edit Expense Modal ── */}
      {editExpense && (
        <Dialog open={!!editExpense} onOpenChange={() => setEditExpense(null)}>
          <DialogContent className="max-w-md bg-white border-zinc-200 rounded-2xl shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-zinc-900 font-bold flex items-center gap-2">
                <Pencil size={16} className="text-amber-500" /> Edit Expense — {editExpense.expenseCode}
              </DialogTitle>
              <DialogDescription className="text-zinc-500 text-xs">
                Update the details for this expense entry.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Category</Label>
                <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className={selectClass}>
                  <option value="Water and Electricity">Water and Electricity</option>
                  <option value="Salary">Salary</option>
                  <option value="Office Rent">Office Rent</option>
                  <option value="Registration and Renewal">Registration and Renewal</option>
                  <option value="Audit Fee">Audit Fee</option>
                  <option value="Repair and Maintainance">Repair and Maintainance</option>
                  <option value="Printing and Stationery">Printing and Stationery</option>
                  <option value="Travelling Expenses">Travelling Expenses</option>
                  <option value="Bank Charges">Bank Charges</option>
                  <option value="Interest Paid">Interest Paid</option>
                  <option value="Miscellaneous Expenses">Miscellaneous Expenses</option>
                  <option value="Transport Inward">Transport Inward</option>
                  <option value="Depreciation">Depreciation</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Amount (NPR)</Label>
                  <Input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="bg-white border-zinc-300 text-zinc-900 h-10 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Date</Label>
                  <Input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="bg-white border-zinc-300 text-zinc-900 h-10"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Payment Method</Label>
                <select value={editPayment} onChange={(e) => setEditPayment(e.target.value)} className={selectClass}>
                  <option value="CASH">CASH VAULT</option>
                  <option value="BANK">BANK ACCOUNT / TRANSFERS</option>
                  <option value="CHEQUE">CHEQUE DISBURSEMENT</option>
                  <option value="ESEWA">eSEWA TRANSFER</option>
                  <option value="KHALTI">KHALTI WALLET</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Notes / Memo</Label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Optional memo..."
                  className="w-full min-h-16 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <Button variant="outline" onClick={() => setEditExpense(null)} disabled={isPending} className="border-zinc-300 text-zinc-700">
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={isPending} className="bg-amber-500 hover:bg-amber-600 text-white font-semibold">
                <Pencil size={13} className="mr-1" /> Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default ExpensesPage;
