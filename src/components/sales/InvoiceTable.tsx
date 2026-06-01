"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { formatNPR } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";
import type { SalesInvoiceSchema } from "@/modules/sales/types";
import { InvoicePreviewModal } from "./InvoicePreviewModal";
import { RecordPaymentModal } from "./RecordPaymentModal";
import { CreateReturnModal } from "./CreateReturnModal";
import { Eye, RotateCcw } from "lucide-react";
import { DualDateDisplay } from "@/components/shared/DualDateDisplay";

interface InvoiceTableProps {
  invoices: SalesInvoiceSchema[];
}

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoiceSchema | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [showReturn, setShowReturn] = useState(false);

  const channelColors: Record<string, string> = {
    RETAIL: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
    WHOLESALE: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
    PROJECT: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
  };

  const statusColors: Record<string, string> = {
    DRAFT: "bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-100",
    SENT: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
    PARTIAL: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    PAID: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
    OVERDUE: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
    CANCELLED: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  };

  const columns: ColumnDef<SalesInvoiceSchema, any>[] = [
    {
      accessorKey: "invoiceNumber",
      header: "Invoice #",
      cell: ({ row }) => <span className="font-mono text-sm font-semibold">{row.original.invoiceNumber}</span>,
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{row.original.customerName}</p>
          {row.original.projectName && <p className="text-xs text-zinc-500 font-mono">Project: {row.original.projectName}</p>}
        </div>
      ),
    },
    {
      accessorKey: "invoiceType",
      header: "Channel",
      cell: ({ row }) => <Badge className={channelColors[row.original.invoiceType]}>{row.original.invoiceType}</Badge>,
    },
    {
      accessorKey: "invoiceDate",
      header: "Date",
      cell: ({ row }) => <DualDateDisplay date={row.original.invoiceDate} />,
    },
    {
      accessorKey: "totalAmount",
      header: "Amount (NPR)",
      cell: ({ row }) => (
        <span className="font-bold font-mono text-blue-700 dark:text-blue-400">
          {Number(row.original.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      accessorKey: "paidAmount",
      header: "Paid (NPR)",
      cell: ({ row }) => (
        <span className="font-semibold font-mono text-emerald-600 dark:text-emerald-400">
          {Number(row.original.paidAmount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      accessorKey: "balanceAmount",
      header: "Balance (NPR)",
      cell: ({ row }) => {
        const balance = Number(row.original.balanceAmount);
        return (
          <span
            className={`font-bold font-mono ${
              balance > 0 ? "text-amber-600 dark:text-amber-500" : "text-zinc-400 dark:text-zinc-500 font-medium"
            }`}
          >
            {balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <Badge className={statusColors[row.original.status]}>{row.original.status}</Badge>,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const hasPayment = Number(row.original.balanceAmount) > 0 && row.original.status !== "CANCELLED";
        const hasReturn = row.original.status !== "CANCELLED" && row.original.status !== "DRAFT";
        return (
          <div className="grid grid-cols-2 gap-1">
            {/* Row 1: View (always) + Payment (conditional) */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedInvoice(row.original);
                setShowPreview(true);
              }}
              className="h-7 px-2 border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 gap-1 rounded text-xs font-semibold col-span-1"
            >
              <Eye size={12} /> View
            </Button>

            {hasPayment ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 border-green-200 hover:bg-green-50 text-green-700 rounded text-xs font-semibold col-span-1"
                onClick={() => {
                  setSelectedInvoice(row.original);
                  setShowPay(true);
                }}
              >
                Pay
              </Button>
            ) : (
              <span className="col-span-1" />
            )}

            {/* Row 2: Return (conditional, spans 2 if alone) */}
            {hasReturn && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 border-amber-200 hover:bg-amber-50 text-amber-700 gap-1 rounded text-xs font-semibold col-span-2"
                onClick={() => {
                  setSelectedInvoice(row.original);
                  setShowReturn(true);
                }}
              >
                <RotateCcw size={11} /> Return
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable columns={columns} data={invoices} searchPlaceholder="Search invoices..." searchColumnId="customerName" />

      {/* Invoice Preview Modal */}
      {selectedInvoice && showPreview && (
        <InvoicePreviewModal
          open={showPreview}
          onOpenChange={setShowPreview}
          invoice={selectedInvoice}
        />
      )}

      {/* Record Payment Modal */}
      {selectedInvoice && showPay && (
        <RecordPaymentModal
          open={showPay}
          onOpenChange={setShowPay}
          invoiceId={selectedInvoice.id}
          invoiceNumber={selectedInvoice.invoiceNumber}
          total={parseFloat(selectedInvoice.totalAmount)}
          paidAmount={parseFloat(selectedInvoice.paidAmount)}
          balance={parseFloat(selectedInvoice.balanceAmount)}
        />
      )}

      {/* Sales Return Modal */}
      {selectedInvoice && showReturn && (
        <CreateReturnModal
          open={showReturn}
          onOpenChange={setShowReturn}
          invoice={selectedInvoice}
        />
      )}
    </>
  );
}
