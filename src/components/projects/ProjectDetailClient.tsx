"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatAmountOnly } from "@/lib/utils";
import { InvoicePreviewModal } from "../sales/InvoicePreviewModal";
import { fetchInvoiceByIdAction } from "@/modules/projects/actions";
import { updateProjectStatus } from "@/modules/projects/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Coins,
  Calendar,
  Hammer,
  Clock,
  ExternalLink,
  ChevronLeft,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
} from "lucide-react";
import Link from "next/link";

interface ProjectDetailClientProps {
  data: {
    project: any;
    billings: any[];
    materialUsage: any[];
  };
}

export function ProjectDetailClient({ data }: ProjectDetailClientProps) {
  const { project, billings, materialUsage } = data;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Invoice Preview State
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  const budget = parseFloat(project.budgetAmount);
  const contract = parseFloat(project.contractAmount);
  const cost = parseFloat(project.totalCost);
  const billed = parseFloat(project.totalBilled);
  const profit = billed - cost;
  const margin = billed > 0 ? (profit / billed) * 100 : 0;
  const netProfit = contract - billed;
  const netMargin = contract > 0 ? (netProfit / contract) * 100 : 0;
  
  const billedPercent = contract > 0 ? Math.min(100, Math.round((billed / contract) * 100)) : 0;
  const costPercent = budget > 0 ? Math.min(100, Math.round((cost / budget) * 100)) : 0;

  const handleStatusChange = (status: any) => {
    startTransition(async () => {
      try {
        await updateProjectStatus(project.id, status);
        toast.success(`Project shifted to ${status}`);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to update project status");
      }
    });
  };

  const handlePreviewInvoice = async (invoiceId: string) => {
    setLoadingInvoice(true);
    try {
      const inv = await fetchInvoiceByIdAction(invoiceId);
      if (inv) {
        setSelectedInvoice(inv);
        setShowPreview(true);
      } else {
        toast.error("Invoice not found.");
      }
    } catch (err: any) {
      toast.error("Failed to load invoice details");
    } finally {
      setLoadingInvoice(false);
    }
  };

  const statusColors: Record<string, string> = {
    PLANNING: "bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-100",
    ACTIVE: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 animate-pulse",
    ON_HOLD: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    COMPLETED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
    CANCELLED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  };

  const invoiceStatusColors: Record<string, string> = {
    DRAFT: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 hover:bg-zinc-100 hover:text-zinc-700 shadow-none",
    SENT: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 hover:bg-blue-50 hover:text-blue-700 font-semibold shadow-none",
    PAID: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-250 hover:bg-emerald-50 hover:text-emerald-700 font-semibold shadow-none",
    PARTIAL: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-250 hover:bg-amber-50 hover:text-amber-700 font-semibold shadow-none",
    CANCELLED: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 hover:bg-rose-50 hover:text-rose-700 shadow-none",
    VOID: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 hover:bg-rose-50 hover:text-rose-700 shadow-none",
  };

  return (
    <div className="space-y-6">
      {/* Top breadcrumb & Status triggers */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link href="/projects">
          <Button variant="outline" size="sm" className="h-8">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Projects
          </Button>
        </Link>

        <div className="flex items-center gap-1.5 border rounded-lg p-1 bg-zinc-50 dark:bg-zinc-900/40">
          <span className="text-xs font-semibold px-2 text-zinc-400">Shift Status:</span>
          {["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"].map((statusOption) => (
            <Button
              key={statusOption}
              variant={project.status === statusOption ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              disabled={isPending}
              onClick={() => handleStatusChange(statusOption)}
            >
              {statusOption}
            </Button>
          ))}
        </div>
      </div>

      {/* Section 1 — Project Header */}
      <div className="bg-white dark:bg-zinc-950 border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded border">
                {project.projectCode}
              </span>
              <Badge className={statusColors[project.status]}>{project.status}</Badge>
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-2">{project.name}</h1>
            <p className="text-sm text-zinc-500 font-medium mt-1">Client: {project.clientName}</p>
          </div>
          <div className="text-sm space-y-1 sm:text-right text-zinc-500 font-medium">
            <div className="flex items-center sm:justify-end gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>
                Start: {project.startDate ? new Date(project.startDate).toLocaleDateString("en-IN") : "-"}
              </span>
            </div>
            <div className="flex items-center sm:justify-end gap-1.5">
              <Clock className="h-4 w-4" />
              <span>
                Deadline: {project.endDate ? new Date(project.endDate).toLocaleDateString("en-IN") : "-"}
              </span>
            </div>
          </div>
        </div>

        {project.description && (
          <div className="border-t pt-4 text-sm text-zinc-600 dark:text-zinc-300">
            <h4 className="font-semibold text-xs text-zinc-400 uppercase tracking-wider mb-1">Contract Scope</h4>
            <p className="leading-relaxed">{project.description}</p>
          </div>
        )}
      </div>

      {/* Section 2 — Financial Summary Gauges */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Contract Budget Value */}
        <Card className="border shadow-sm rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Contract Value</CardTitle>
            <Coins className="h-4.5 w-4.5 text-zinc-400" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {formatAmountOnly(contract)}
            </div>
            <p className="text-xs text-zinc-400 font-medium mt-1">Total revenue value agreed</p>
          </CardContent>
        </Card>

        {/* Total Billed milestones */}
        <Card className="border shadow-sm rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Billed</CardTitle>
            <FileSpreadsheet className="h-4.5 w-4.5 text-green-500" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {formatAmountOnly(billed)}
            </div>
            <p className="text-xs text-zinc-400 font-medium mt-1">Balance to bill: {formatAmountOnly(Math.max(0, contract - billed))}</p>
          </CardContent>
        </Card>

        {/* Total Materials Issued */}
        <Card className="border shadow-sm rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Actual Cost</CardTitle>
            <Hammer className="h-4.5 w-4.5 text-purple-500" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {formatAmountOnly(cost)}
            </div>
            <p className="text-xs text-zinc-400 font-medium mt-1">Internal stock budget: {formatAmountOnly(budget)}</p>
          </CardContent>
        </Card>

        {/* Job Cost profit */}
        <Card className="border shadow-sm rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Project Profitability</CardTitle>
            <TrendingUp className="h-4.5 w-4.5 text-orange-500" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {formatAmountOnly(netProfit)}
            </div>
            <p className="text-xs text-zinc-400 font-medium mt-1">Net Profit (Contract - Billed)</p>
            <p className="text-[10px] text-zinc-405 font-semibold mt-0.5">
              Net Margin: <span className={`font-bold ${netProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-rose-500"}`}>{netMargin.toFixed(1)}%</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bars */}
      <div className="grid gap-6 md:grid-cols-2 bg-white dark:bg-zinc-950 p-6 rounded-2xl border shadow-sm text-sm font-medium">
        {/* Billing Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-500 uppercase tracking-wider font-bold">Billing Progress (Billed / Contract)</span>
            <span className="text-zinc-900 dark:text-zinc-50 font-bold">{billedPercent}%</span>
          </div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-3 rounded-full overflow-hidden">
            <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${billedPercent}%` }} />
          </div>
          <p className="text-[10px] text-zinc-400">NPR {billed.toLocaleString("en-IN")} billed of NPR {contract.toLocaleString("en-IN")}</p>
        </div>

        {/* Internal Cost Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-500 uppercase tracking-wider font-bold">Budget Consumption (Cost / Budget)</span>
            <span className={`font-bold ${costPercent > 80 ? "text-red-600" : costPercent > 50 ? "text-amber-600" : "text-zinc-900 dark:text-zinc-50"}`}>{costPercent}%</span>
          </div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-3 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${costPercent > 80 ? "bg-red-500" : costPercent > 50 ? "bg-amber-500" : "bg-purple-500"}`}
              style={{ width: `${costPercent}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-400">NPR {cost.toLocaleString("en-IN")} issued of NPR {budget.toLocaleString("en-IN")}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Section 3 — Billing History */}
        <div className="bg-white dark:bg-zinc-950 border rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-zinc-500 uppercase tracking-wider">Project Billing Milestones</h3>
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50 dark:bg-zinc-900 text-[10px] uppercase font-bold text-zinc-400">
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount (NPR)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-zinc-500 italic">No billings issued yet</TableCell>
                  </TableRow>
                ) : (
                  billings.map((b) => (
                    <TableRow key={b.id} className="text-xs hover:bg-zinc-50/50">
                      <TableCell className="font-mono font-semibold">{b.invoiceNumber}</TableCell>
                      <TableCell>{new Date(b.billingDate).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell className="text-right font-medium">{formatAmountOnly(parseFloat(b.amount))}</TableCell>
                      <TableCell>
                        <Badge className={invoiceStatusColors[b.status] || "bg-zinc-100 text-zinc-700 border border-zinc-200"}>{b.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-zinc-950"
                          disabled={loadingInvoice}
                          onClick={() => handlePreviewInvoice(b.invoiceId)}
                          title="View Invoice"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Section 4 — Material Dispatches */}
        <div className="bg-white dark:bg-zinc-950 border rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-zinc-500 uppercase tracking-wider">Material Dispatch History</h3>
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50 dark:bg-zinc-900 text-[10px] uppercase font-bold text-zinc-400">
                  <TableHead>Date</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Cost Rate (NPR)</TableHead>
                  <TableHead className="text-right">Total Cost (NPR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materialUsage.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-zinc-500 italic">No materials issued yet</TableCell>
                  </TableRow>
                ) : (
                  materialUsage.map((m) => (
                    <TableRow key={m.id} className="text-xs hover:bg-zinc-50/50">
                      <TableCell>{new Date(m.dateUsed).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell>
                        <span className="font-semibold block">{m.productName}</span>
                        <span className="text-[10px] text-zinc-400 block font-mono">{m.productCode} • {m.warehouseName}</span>
                      </TableCell>
                      <TableCell className="text-right font-medium">{m.qtyUsed} {m.productUnit}</TableCell>
                      <TableCell className="text-right text-zinc-500">{formatAmountOnly(parseFloat(m.unitCost))}</TableCell>
                      <TableCell className="text-right font-bold text-purple-600">{formatAmountOnly(parseFloat(m.totalCost))}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Section 5 — Timeline/Notes */}
      {project.notes && (
        <div className="bg-white dark:bg-zinc-950 border rounded-2xl p-6 shadow-sm space-y-2">
          <h3 className="font-bold text-sm text-zinc-500 uppercase tracking-wider">Project Notes & Remarks</h3>
          <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl text-sm border text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
            {project.notes}
          </div>
        </div>
      )}

      {/* Sales Invoice Preview Modal from Stage 5 */}
      {selectedInvoice && showPreview && (
        <InvoicePreviewModal
          open={showPreview}
          onOpenChange={setShowPreview}
          invoice={selectedInvoice}
        />
      )}
    </div>
  );
}
