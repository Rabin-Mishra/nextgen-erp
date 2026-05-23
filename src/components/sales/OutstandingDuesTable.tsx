"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { formatNPR } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";
import type { OutstandingDueSchema } from "@/modules/sales/types";
import { CustomerLedgerModal } from "./CustomerLedgerModal";
import { RecordPaymentModal } from "./RecordPaymentModal";
import { fetchUnpaidInvoicesAction } from "@/modules/sales/actions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface OutstandingDuesTableProps {
  dues: OutstandingDueSchema[];
}

export function OutstandingDuesTable({ dues }: OutstandingDuesTableProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(null);
  const [showLedger, setShowLedger] = useState(false);
  
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
  
  const [selectedInvoice, setSelectedInvoice] = useState<{
    id: string;
    invoiceNumber: string;
    totalAmount: string;
    paidAmount: string;
    balanceAmount: string;
  } | null>(null);
  const [showRecordPayment, setShowRecordPayment] = useState(false);

  const handlePaymentClick = async (customer: { id: string; name: string }) => {
    setSelectedCustomer(customer);
    setLoadingInvoices(true);
    try {
      const invoices = await fetchUnpaidInvoicesAction(customer.id);
      setUnpaidInvoices(invoices);
      if (invoices.length === 1) {
        const inv = invoices[0];
        setSelectedInvoice({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          totalAmount: inv.totalAmount,
          paidAmount: inv.paidAmount,
          balanceAmount: inv.balanceAmount,
        });
        setShowRecordPayment(true);
      } else if (invoices.length > 1) {
        setShowPaymentSelector(true);
      } else {
        alert("No unpaid invoices found for this customer.");
      }
    } catch (err) {
      console.error("Failed to load unpaid invoices", err);
      alert("Failed to load unpaid invoices");
    } finally {
      setLoadingInvoices(false);
    }
  };

  const columns: ColumnDef<OutstandingDueSchema, any>[] = [
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => <span className="font-medium">{row.original.customerName}</span>,
    },
    {
      accessorKey: "customerType",
      header: "Type",
      cell: ({ row }) => <Badge variant="outline">{row.original.customerType}</Badge>,
    },
    {
      accessorKey: "totalBilled",
      header: "Total Billed",
      cell: ({ row }) => formatNPR(Number(row.original.totalBilled)),
    },
    {
      accessorKey: "totalPaid",
      header: "Total Paid",
      cell: ({ row }) => formatNPR(Number(row.original.totalPaid)),
    },
    {
      accessorKey: "balance",
      header: "Balance",
      cell: ({ row }) => <span className="font-semibold text-amber-600">{formatNPR(Number(row.original.balance))}</span>,
    },
    {
      accessorKey: "lastInvoiceDate",
      header: "Last Invoice",
      cell: ({ row }) => row.original.lastInvoiceDate ? new Date(row.original.lastInvoiceDate).toLocaleDateString("en-IN") : "-",
    },
    {
      accessorKey: "daysOverdue",
      header: "Days Overdue",
      cell: ({ row }) => <span className={row.original.daysOverdue > 30 ? "font-semibold text-red-600" : ""}>{row.original.daysOverdue}</span>,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-green-200 hover:bg-green-50 text-green-700 dark:border-green-900/30 dark:hover:bg-green-950/20"
            disabled={loadingInvoices && selectedCustomer?.id === row.original.customerId}
            onClick={() => handlePaymentClick({ id: row.original.customerId, name: row.original.customerName })}
          >
            {loadingInvoices && selectedCustomer?.id === row.original.customerId ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : null}
            Payment
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedCustomer({ id: row.original.customerId, name: row.original.customerName });
              setShowLedger(true);
            }}
          >
            Ledger
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable columns={columns} data={dues} searchPlaceholder="Search customers..." searchColumnId="customerName" />

      {/* Customer Ledger Modal */}
      {selectedCustomer && showLedger && (
        <CustomerLedgerModal
          open={showLedger}
          onOpenChange={setShowLedger}
          customerId={selectedCustomer.id}
          customerName={selectedCustomer.name}
        />
      )}

      {/* Payment Selector Dialog */}
      <Dialog open={showPaymentSelector} onOpenChange={setShowPaymentSelector}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Select Invoice to Pay</DialogTitle>
            <DialogDescription>
              {selectedCustomer?.name} has multiple outstanding invoices. Please select one to record a payment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4 max-h-[300px] overflow-y-auto pr-1">
            {unpaidInvoices.map((inv) => (
              <Button
                key={inv.id}
                variant="outline"
                className="justify-between text-left font-normal h-auto py-3 px-4 hover:border-green-500 hover:bg-green-50/10"
                onClick={() => {
                  setSelectedInvoice({
                    id: inv.id,
                    invoiceNumber: inv.invoiceNumber,
                    totalAmount: inv.totalAmount,
                    paidAmount: inv.paidAmount,
                    balanceAmount: inv.balanceAmount,
                  });
                  setShowPaymentSelector(false);
                  setShowRecordPayment(true);
                }}
              >
                <div className="flex flex-col">
                  <span className="font-mono font-semibold text-sm">{inv.invoiceNumber}</span>
                  <span className="text-xs text-zinc-500">{new Date(inv.invoiceDate).toLocaleDateString("en-IN")}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-semibold text-sm text-amber-600">{formatNPR(Number(inv.balanceAmount))}</span>
                  <span className="text-[10px] text-zinc-400">Total: {formatNPR(Number(inv.totalAmount))}</span>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Modal */}
      {selectedInvoice && showRecordPayment && (
        <RecordPaymentModal
          open={showRecordPayment}
          onOpenChange={setShowRecordPayment}
          invoiceId={selectedInvoice.id}
          invoiceNumber={selectedInvoice.invoiceNumber}
          total={parseFloat(selectedInvoice.totalAmount)}
          paidAmount={parseFloat(selectedInvoice.paidAmount)}
          balance={parseFloat(selectedInvoice.balanceAmount)}
        />
      )}
    </>
  );
}
