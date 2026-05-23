"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import type { PurchaseOrderSchema } from "@/modules/purchase/types";
import { cancelPurchaseOrder } from "@/modules/purchase/actions";
import { ReceiveGoodsModal } from "./ReceiveGoodsModal";
import { RecordPaymentModal } from "./RecordPaymentModal";
import { BillUploadModal } from "./BillUploadModal";
import { SupplierLedgerModal } from "./SupplierLedgerModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDate, formatNPR } from "@/lib/utils";

interface PurchaseOrderTableProps {
  orders: PurchaseOrderSchema[];
  userId: string;
}

export function PurchaseOrderTable({ orders, userId }: PurchaseOrderTableProps) {
  const router = useRouter();
  const [selectedPO, setSelectedPO] = useState<PurchaseOrderSchema | null>(null);
  const [showReceive, setShowReceive] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [showLedger, setShowLedger] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100",
    ORDERED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    PARTIAL: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
    RECEIVED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  };

  const handleCancel = async (id: string, poNumber: string) => {
    if (!confirm(`Are you sure you want to cancel Purchase Order ${poNumber}?`)) {
      return;
    }
    setActionLoading(true);
    try {
      await cancelPurchaseOrder(id, userId);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to cancel Purchase Order");
    } finally {
      setActionLoading(false);
    }
  };

  const columns: ColumnDef<PurchaseOrderSchema, any>[] = [
    {
      accessorKey: "poNumber",
      header: "PO #",
      cell: ({ row }) => (
        <span className="font-mono text-sm font-semibold">{row.original.poNumber}</span>
      ),
    },
    {
      accessorKey: "supplierName",
      header: "Vendor",
      cell: ({ row }) => (
        <div>
          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{row.original.supplierName}</div>
          {row.original.supplierPanNumber && (
            <div className="text-xs text-zinc-500 font-mono">PAN: {row.original.supplierPanNumber}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "orderDate",
      header: "Order Date",
      cell: ({ row }) => (
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {formatDate(row.original.orderDate)}
        </span>
      ),
    },
    {
      accessorKey: "expectedDate",
      header: "Expected Delivery",
      cell: ({ row }) => (
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {row.original.expectedDate ? formatDate(row.original.expectedDate) : "—"}
        </span>
      ),
    },
    {
      accessorKey: "totalAmount",
      header: "Total",
      cell: ({ row }) => (
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
          {formatNPR(parseFloat(row.original.totalAmount))}
        </span>
      ),
    },
    {
      accessorKey: "paidAmount",
      header: "Paid",
      cell: ({ row }) => (
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {formatNPR(parseFloat(row.original.paidAmount))}
        </span>
      ),
    },
    {
      accessorKey: "balance",
      header: "Balance",
      cell: ({ row }) => {
        const balance = parseFloat(row.original.balance);
        return (
          <span className={balance > 0 ? "text-orange-600 font-semibold" : "text-green-600 font-semibold"}>
            {formatNPR(balance)}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={statusColors[row.original.status] || statusColors.DRAFT}>
          {row.original.status}
        </Badge>
      ),
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
              setSelectedPO(row.original);
              setShowDetail(true);
            }}
          >
            View
          </Button>
          
          {["ORDERED", "PARTIAL"].includes(row.original.status) && (
            <Button
              variant="outline"
              size="sm"
              className="border-amber-200 hover:bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:hover:bg-amber-950/20"
              onClick={() => {
                setSelectedPO(row.original);
                setShowReceive(true);
              }}
            >
              Receive
            </Button>
          )}

          {parseFloat(row.original.balance) > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="border-green-200 hover:bg-green-50 text-green-700 dark:border-green-900/30 dark:hover:bg-green-950/20"
              onClick={() => {
                setSelectedPO(row.original);
                setShowPay(true);
              }}
            >
              Pay
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedPO(row.original);
              setShowLedger(true);
            }}
          >
            Ledger
          </Button>

          {!row.original.billImageUrl && row.original.status !== "CANCELLED" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedPO(row.original);
                setShowBill(true);
              }}
            >
              Bill
            </Button>
          )}

          {["DRAFT", "ORDERED"].includes(row.original.status) && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-950/20"
              onClick={() => handleCancel(row.original.id, row.original.poNumber)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable columns={columns} data={orders} />

      {/* Receive Goods Modal */}
      {selectedPO && showReceive && (
        <ReceiveGoodsModal
          open={showReceive}
          onOpenChange={setShowReceive}
          poItems={selectedPO.items}
          poNumber={selectedPO.poNumber}
          purchaseOrderId={selectedPO.id}
          userId={userId}
        />
      )}

      {/* Record Payment Modal */}
      {selectedPO && showPay && (
        <RecordPaymentModal
          open={showPay}
          onOpenChange={setShowPay}
          total={parseFloat(selectedPO.totalAmount)}
          paidAmount={parseFloat(selectedPO.paidAmount)}
          poNumber={selectedPO.poNumber}
          purchaseOrderId={selectedPO.id}
          userId={userId}
        />
      )}

      {/* Bill Upload Modal */}
      {selectedPO && showBill && (
        <BillUploadModal
          open={showBill}
          onOpenChange={setShowBill}
          poNumber={selectedPO.poNumber}
          purchaseOrderId={selectedPO.id}
          existingBillUrl={selectedPO.billImageUrl}
          userId={userId}
        />
      )}

      {/* Supplier Ledger Modal */}
      {selectedPO && showLedger && (
        <SupplierLedgerModal
          open={showLedger}
          onOpenChange={setShowLedger}
          supplierId={selectedPO.supplierId}
          supplierName={selectedPO.supplierName}
          supplierPan={selectedPO.supplierPanNumber ?? undefined}
          supplierPhone={selectedPO.supplierPhone ?? undefined}
        />
      )}

      {/* Premium Purchase Order Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="w-[98vw] max-w-[98vw] h-[95vh] flex flex-col overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-center pr-6">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                Purchase Order Details: <span className="font-mono text-zinc-600">{selectedPO?.poNumber}</span>
              </DialogTitle>
              {selectedPO && (
                <Badge className={statusColors[selectedPO.status]}>
                  {selectedPO.status}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {selectedPO && (
            <div className="space-y-6 pt-4">
              {/* Vendor & General Grid */}
              <div className="grid grid-cols-2 gap-6 border-b pb-4">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">Supplier Details</h4>
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{selectedPO.supplierName}</div>
                  {selectedPO.supplierPanNumber && (
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono mt-0.5">PAN: {selectedPO.supplierPanNumber}</div>
                  )}
                  {selectedPO.supplierPhone && (
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">Phone: {selectedPO.supplierPhone}</div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Order Date</h4>
                    <div className="text-sm font-medium">{formatDate(selectedPO.orderDate)}</div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Expected Delivery</h4>
                    <div className="text-sm font-medium">{selectedPO.expectedDate ? formatDate(selectedPO.expectedDate) : "—"}</div>
                  </div>
                </div>
              </div>

              {/* Items Section */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Ordered Line Items</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-900 border-b text-left font-medium text-zinc-600 dark:text-zinc-400">
                        <th className="p-3">Product</th>
                        <th className="p-3 text-right">Ordered Qty</th>
                        <th className="p-3 text-right">Received Qty</th>
                        <th className="p-3 text-right">Unit Price</th>
                        <th className="p-3 text-right">Total Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedPO.items.map((item) => (
                        <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                          <td className="p-3">
                            <div className="font-semibold text-zinc-900 dark:text-zinc-50">{item.productName}</div>
                            <div className="text-xs text-zinc-500 font-mono">{item.productCode}</div>
                          </td>
                          <td className="p-3 text-right font-medium">{item.orderedQty} {item.productUnit}</td>
                          <td className="p-3 text-right">
                            <span className={item.receivedQty >= item.orderedQty ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>
                              {item.receivedQty} {item.productUnit}
                            </span>
                          </td>
                          <td className="p-3 text-right">{formatNPR(parseFloat(item.unitPrice))}</td>
                          <td className="p-3 text-right font-semibold">{formatNPR(parseFloat(item.totalPrice))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payments & Financial Summaries */}
              <div className="grid grid-cols-5 gap-6 pt-2">
                {/* Notes & PDF link on Left */}
                <div className="col-span-3 space-y-4">
                  {selectedPO.notes && (
                    <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg border">
                      <h5 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">PO Notes</h5>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{selectedPO.notes}</p>
                    </div>
                  )}
                  {selectedPO.billImageUrl && (
                    <div className="flex items-center gap-2 bg-blue-50/50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/30 p-3 rounded-lg">
                      <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">Supplier invoice uploaded</span>
                      <a
                        href={selectedPO.billImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 underline font-semibold hover:text-blue-800 ml-auto"
                      >
                        View Bill Document
                      </a>
                    </div>
                  )}
                  {/* Payments list */}
                  {selectedPO.payments && selectedPO.payments.length > 0 ? (
                    <div>
                      <h5 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Disbursement Payments</h5>
                      <div className="border rounded-md divide-y overflow-hidden text-xs">
                        {selectedPO.payments.map((pmt) => (
                          <div key={pmt.id} className="p-2.5 flex justify-between bg-zinc-50/30">
                            <div>
                              <span className="font-semibold text-zinc-950">{formatNPR(parseFloat(pmt.amount))}</span> via <span className="font-semibold">{pmt.paymentMethod}</span>
                              <div className="text-[10px] text-zinc-500 mt-0.5">{pmt.notes}</div>
                            </div>
                            <span className="text-zinc-500">{formatDate(pmt.paymentDate)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-500 italic">No payments recorded against this PO yet.</div>
                  )}
                </div>

                {/* Financial balances on Right */}
                <div className="col-span-2 bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-xl space-y-2.5 border h-fit">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Subtotal:</span>
                    <span>{formatNPR(parseFloat(selectedPO.subtotal))}</span>
                  </div>
                  {parseFloat(selectedPO.discountAmount) > 0 && (
                    <div className="flex justify-between text-xs text-red-600">
                      <span>Discount:</span>
                      <span>- {formatNPR(parseFloat(selectedPO.discountAmount))}</span>
                    </div>
                  )}
                  {parseFloat(selectedPO.taxAmount) > 0 && (
                    <div className="flex justify-between text-xs">
                      <span>VAT (13%):</span>
                      <span>+ {formatNPR(parseFloat(selectedPO.taxAmount))}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-semibold border-t pt-2">
                    <span>Total Amount:</span>
                    <span>{formatNPR(parseFloat(selectedPO.totalAmount))}</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-600">
                    <span>Paid Amount:</span>
                    <span>{formatNPR(parseFloat(selectedPO.paidAmount))}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t pt-2 text-orange-600">
                    <span>Balance Due:</span>
                    <span>{formatNPR(parseFloat(selectedPO.balance))}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 border-t pt-4">
            <Button variant="outline" onClick={() => setShowDetail(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

