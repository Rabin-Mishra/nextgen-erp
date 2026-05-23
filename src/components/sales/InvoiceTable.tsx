"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { formatNPR, formatDate } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";
import type { SalesInvoiceSchema } from "@/modules/sales/types";
import { InvoicePreviewModal } from "./InvoicePreviewModal";
import { RecordPaymentModal } from "./RecordPaymentModal";
import { CreateReturnModal } from "./CreateReturnModal";

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
      cell: ({ row }) => <span className="text-sm">{formatDate(row.original.invoiceDate)}</span>,
    },
    {
      id: "items",
      header: "Items",
      cell: ({ row }) => <span className="text-sm">{row.original.items.length}</span>,
    },
    {
      accessorKey: "totalAmount",
      header: "Amount",
      cell: ({ row }) => <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatNPR(Number(row.original.totalAmount))}</span>,
    },
    {
      accessorKey: "paidAmount",
      header: "Paid",
      cell: ({ row }) => <span className="text-zinc-600 dark:text-zinc-400">{formatNPR(Number(row.original.paidAmount))}</span>,
    },
    {
      accessorKey: "balanceAmount",
      header: "Balance",
      cell: ({ row }) => {
        const balance = Number(row.original.balanceAmount);
        return (
          <span className={balance > 0 ? "font-semibold text-amber-600" : "font-semibold text-green-600"}>
            {formatNPR(balance)}
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
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedInvoice(row.original);
              setShowPreview(true);
            }}
          >
            View/Print
          </Button>
          
          {Number(row.original.balanceAmount) > 0 && row.original.status !== "CANCELLED" && (
            <Button
              variant="outline"
              size="sm"
              className="border-green-200 hover:bg-green-50 text-green-700 dark:border-green-900/30 dark:hover:bg-green-950/20"
              onClick={() => {
                setSelectedInvoice(row.original);
                setShowPay(true);
              }}
            >
              Payment
            </Button>
          )}

          {row.original.status !== "CANCELLED" && row.original.status !== "DRAFT" && (
            <Button
              variant="outline"
              size="sm"
              className="border-amber-200 hover:bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:hover:bg-amber-950/20"
              onClick={() => {
                setSelectedInvoice(row.original);
                setShowReturn(true);
              }}
            >
              Return
            </Button>
          )}
        </div>
      ),
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
