"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import type { PurchaseOrderSchema } from "@/modules/purchase/types";
import { cancelPurchaseOrder, deletePurchaseOrder, submitPurchaseOrder } from "@/modules/purchase/actions";
import { ReceiveGoodsModal } from "./ReceiveGoodsModal";
import { RecordPaymentModal } from "./RecordPaymentModal";
import { SupplierLedgerModal } from "./SupplierLedgerModal";
import { EditPurchaseOrderModal } from "./EditPurchaseOrderModal";
import { POPurchaseReturnModal } from "./POPurchaseReturnModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatDate, formatNPR, formatAmountOnly } from "@/lib/utils";
import { Eye, CheckSquare, BookOpen, XCircle, ShoppingBag, CreditCard, Pencil, Trash2, Loader2, Send, Download, RotateCcw } from "lucide-react";
import { DualDateDisplay } from "@/components/shared/DualDateDisplay";
import { generatePOPDF } from "@/lib/po-pdf";

interface PurchaseOrderTableProps {
  orders: PurchaseOrderSchema[];
  userId: string;
}

export function PurchaseOrderTable({ orders, userId }: PurchaseOrderTableProps) {
  const router = useRouter();
  const [selectedPO, setSelectedPO] = useState<PurchaseOrderSchema | null>(null);
  const [showReceive, setShowReceive] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [showLedger, setShowLedger] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);

  // Edit & Delete State
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [poToDelete, setPoToDelete] = useState<PurchaseOrderSchema | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const statusColors: Record<string, string> = {
    DRAFT: "bg-zinc-150 text-zinc-800 border-zinc-300",
    ORDERED: "bg-blue-50 text-blue-700 border-blue-200",
    PARTIAL: "bg-amber-50 text-amber-700 border-amber-250",
    RECEIVED: "bg-emerald-50 text-emerald-700 border-emerald-250",
    CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
  };

  const handleSubmit = async (id: string, poNumber: string) => {
    if (!confirm(`Are you sure you want to submit Purchase Order ${poNumber}? This will lock the draft and change its status to ORDERED.`)) {
      return;
    }
    setActionLoading(true);
    try {
      await submitPurchaseOrder(id, userId);
      toast.success(`Purchase Order ${poNumber} submitted successfully.`);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to submit Purchase Order");
    } finally {
      setActionLoading(false);
    }
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

  const handleConfirmDelete = async () => {
    if (!poToDelete) return;
    setDeleteLoading(true);
    try {
      await deletePurchaseOrder(poToDelete.id, userId);
      toast.success(`Purchase Order ${poToDelete.poNumber} successfully deleted.`);
      setShowDelete(false);
      setPoToDelete(null);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to delete Purchase Order");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedPO) return;
    setPdfDownloading(true);
    try {
      const blob = await generatePOPDF(selectedPO);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selectedPO.poNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Purchase Order PDF downloaded successfully.");
    } catch (err) {
      console.error("Failed to generate PDF", err);
      toast.error("Failed to download PDF");
    } finally {
      setPdfDownloading(false);
    }
  };

  const columns: ColumnDef<PurchaseOrderSchema, any>[] = [
    {
      accessorKey: "poNumber",
      header: "PO #",
      cell: ({ row }) => (
        <span className="font-mono text-sm font-bold text-zinc-900 hover:underline">{row.original.poNumber}</span>
      ),
    },
    {
      accessorKey: "supplierName",
      header: "Vendor",
      cell: ({ row }) => (
        <div>
          <div className="text-sm font-semibold text-zinc-800">{row.original.supplierName}</div>
          {row.original.supplierPanNumber && (
            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">PAN: {row.original.supplierPanNumber}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "orderDate",
      header: "Order Date",
      cell: ({ row }) => <DualDateDisplay date={row.original.orderDate} />,
    },
    {
      accessorKey: "expectedDate",
      header: "Expected Delivery",
      cell: ({ row }) => row.original.expectedDate ? <DualDateDisplay date={row.original.expectedDate} /> : "—",
    },
    {
      id: "itemsCount",
      header: "Items Count",
      cell: ({ row }) => (
        <span className="text-sm font-semibold text-zinc-700">
          {row.original.items.length}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const style = statusColors[status] || statusColors.DRAFT;
        return (
          <Badge className={`${style} font-semibold px-2.5 py-0.5 rounded-full text-[10px] tracking-wide shadow-none uppercase border`}>
            {status}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedPO(row.original);
              setShowDetail(true);
            }}
            className="h-8 border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 gap-1 rounded-md text-xs font-semibold"
          >
            <Eye size={13} /> View
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedPO(row.original);
              setShowEdit(true);
            }}
            className="h-8 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 gap-1 rounded-md text-xs font-semibold"
          >
            <Pencil size={13} /> Edit
          </Button>

          {row.original.status === "DRAFT" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSubmit(row.original.id, row.original.poNumber)}
              disabled={actionLoading}
              className="h-8 border-emerald-250 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 gap-1 rounded-md text-xs font-semibold"
            >
              <Send size={13} /> Submit Order
            </Button>
          )}

          {["ORDERED", "PARTIAL"].includes(row.original.status) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedPO(row.original);
                setShowReceive(true);
              }}
              className="h-8 border-amber-250 bg-amber-50 text-amber-700 hover:bg-amber-100/70 gap-1 rounded-md text-xs font-semibold"
            >
              <CheckSquare size={13} /> Receive
            </Button>
          )}

          {["ORDERED", "PARTIAL", "RECEIVED"].includes(row.original.status) && parseFloat(row.original.balance) > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedPO(row.original);
                setShowPay(true);
              }}
              className="h-8 border-emerald-250 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70 gap-1 rounded-md text-xs font-semibold"
            >
              <CreditCard size={13} /> Pay
            </Button>
          )}

          {["ORDERED", "PARTIAL", "RECEIVED"].includes(row.original.status) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedPO(row.original);
                setShowReturn(true);
              }}
              className="h-8 border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 gap-1 rounded-md text-xs font-semibold"
            >
              <RotateCcw size={13} /> Return
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedPO(row.original);
              setShowLedger(true);
            }}
            className="h-8 border-zinc-250 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 gap-1 rounded-md text-xs font-semibold"
          >
            <BookOpen size={13} /> Ledger
          </Button>

          {["DRAFT", "ORDERED"].includes(row.original.status) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCancel(row.original.id, row.original.poNumber)}
              disabled={actionLoading}
              className="h-8 border-rose-250 bg-rose-50 text-rose-600 hover:bg-rose-100 gap-1 rounded-md text-xs font-semibold"
            >
              <XCircle size={13} /> Cancel
            </Button>
          )}

          {row.original.status === "CANCELLED" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPoToDelete(row.original);
                setShowDelete(true);
              }}
              className="h-8 border-rose-250 bg-rose-50 text-rose-600 hover:bg-rose-100 gap-1 rounded-md text-xs font-semibold"
            >
              <Trash2 size={13} /> Delete
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled
              title="Only cancelled purchase orders can be deleted"
              className="h-8 border-zinc-200 bg-zinc-50 text-zinc-400 gap-1 rounded-md text-xs font-semibold cursor-not-allowed opacity-50"
            >
              <Trash2 size={13} /> Delete
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

      {/* POPurchaseReturnModal */}
      {selectedPO && showReturn && (
        <POPurchaseReturnModal
          open={showReturn}
          onOpenChange={setShowReturn}
          po={selectedPO}
          userId={userId}
        />
      )}

      {/* Clean Premium Light-Themed Purchase Order Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="w-[98vw] max-w-[98vw] h-[95vh] flex flex-col overflow-y-auto bg-white border border-zinc-200 text-zinc-900 rounded-2xl shadow-xl">
          <DialogHeader className="border-b border-zinc-200 pb-3">
            <div className="flex justify-between items-center pr-6">
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-zinc-900">
                <ShoppingBag size={20} className="text-blue-600" /> Purchase Order: <span className="font-mono text-zinc-500">{selectedPO?.poNumber}</span>
              </DialogTitle>
              {selectedPO && (
                <Badge className={`${statusColors[selectedPO.status] || statusColors.DRAFT} px-3 py-1 font-semibold rounded-full border`}>
                  {selectedPO.status}
                </Badge>
              )}
            </div>
            <DialogDescription className="sr-only">
              Detailed view of purchase order specifications, vendor details, and financial summary.
            </DialogDescription>
          </DialogHeader>

          {selectedPO && (() => {
            const isReceived = ["PARTIAL", "RECEIVED"].includes(selectedPO.status);
            return (
              <>
                <div className="flex-grow space-y-6 py-4">
                  {/* Vendor & General Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-xl border border-zinc-200 bg-zinc-50/60 shadow-sm">
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Supplier Background</h4>
                      <div className="text-sm font-bold text-zinc-800">{selectedPO.supplierName}</div>
                      {selectedPO.supplierPanNumber && (
                        <div className="text-xs text-zinc-650 font-mono mt-0.5">PAN: {selectedPO.supplierPanNumber}</div>
                      )}
                      {selectedPO.supplierPhone && (
                        <div className="text-xs text-zinc-650 mt-0.5">Phone: {selectedPO.supplierPhone}</div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">Order Date</h4>
                        <div className="text-sm font-semibold text-zinc-800"><DualDateDisplay date={selectedPO.orderDate} /></div>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">Expected Delivery</h4>
                        <div className="text-sm font-semibold text-zinc-800">
                          {selectedPO.status === "RECEIVED" && selectedPO.expectedDate ? (
                            <DualDateDisplay date={selectedPO.expectedDate} />
                          ) : (
                            ""
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Items Section */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Ordered Materials & Financial Lines</h4>
                    <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-sm text-zinc-800 bg-white">
                        <thead>
                          <tr className="bg-zinc-50 border-b border-zinc-200 text-left font-semibold text-zinc-500">
                            <th className="p-3.5">Product Item</th>
                            <th className="p-3.5 text-center">Alternate Unit</th>
                            <th className="p-3.5 text-right">Ordered Qty</th>
                            {isReceived && <th className="p-3.5 text-right">Received Qty</th>}
                            <th className="p-3.5 text-right">Unit Price (NPR)</th>
                            <th className="p-3.5 text-right">Line Total (NPR)</th>
                            {isReceived && (
                              <>
                                <th className="p-3.5 text-right">Status</th>
                                <th className="p-3.5">Notes</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 bg-white">
                          {selectedPO.items.map((item) => {
                            const isComplete = item.receivedQty >= item.orderedQty;
                            return (
                              <tr key={item.id} className="hover:bg-zinc-50/50">
                                <td className="p-3.5">
                                  <div className="font-semibold text-zinc-900">{item.productName}</div>
                                  <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{item.productCode}</div>
                                </td>
                                <td className="p-3.5 text-center text-zinc-700 text-xs font-medium">
                                  {item.productPurchaseUnit && item.productPurchaseUnit !== item.productBaseUnit ? (
                                    <span>
                                      1 {item.productPurchaseUnit} = {Number(item.productPurchaseConversionFactor)} {item.productBaseUnit}
                                    </span>
                                  ) : (
                                    <span className="text-zinc-400 italic">—</span>
                                  )}
                                </td>
                                <td className="p-3.5 text-right font-medium text-zinc-700">{item.orderedQty} {item.productUnit}</td>
                                {isReceived && (
                                  <td className="p-3.5 text-right">
                                    <span className={isComplete ? "text-emerald-600 font-bold" : "text-amber-600 font-medium"}>
                                      {item.receivedQty} {item.productUnit}
                                    </span>
                                  </td>
                                )}
                                <td className="p-3.5 text-right font-medium text-zinc-700">
                                  {isReceived ? formatAmountOnly(parseFloat(item.unitPrice)) : ""}
                                </td>
                                <td className="p-3.5 text-right font-semibold text-zinc-900">
                                  {isReceived ? formatAmountOnly(parseFloat(item.totalPrice)) : ""}
                                </td>
                                {isReceived && (
                                  <>
                                    <td className="p-3.5 text-right">
                                      <Badge className={isComplete ? "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-none text-[10px]" : "bg-amber-50 text-amber-700 border border-amber-200 shadow-none text-[10px]"}>
                                        {isComplete ? "FULLY RECEIVED" : "PENDING"}
                                      </Badge>
                                    </td>
                                    <td className="p-3.5 text-zinc-500 max-w-xs truncate">{item.notes || "—"}</td>
                                  </>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Financial Summaries & Remarks Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Remarks/Notes */}
                    <div className="md:col-span-2">
                      {isReceived && (
                        <div className="bg-zinc-50/60 p-4 rounded-xl border border-zinc-200 h-full flex flex-col justify-between">
                          <div>
                            <h5 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Procurement Instructions</h5>
                            <p className="text-xs text-zinc-700 whitespace-pre-wrap">{selectedPO.notes || "No special procurement instructions provided."}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Totals Section */}
                    <div className="bg-zinc-50/60 p-4 rounded-xl border border-zinc-200 space-y-2 text-sm shadow-sm">
                      <div className="flex justify-between border-b border-zinc-200 pb-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                        <span>Summary</span>
                        <span>Amount (NPR)</span>
                      </div>
                      
                      <div className="flex justify-between text-zinc-600">
                        <span>Subtotal:</span>
                        <span className="font-medium text-zinc-800">
                          {isReceived ? formatAmountOnly(parseFloat(selectedPO.subtotal)) : ""}
                        </span>
                      </div>
                      {parseFloat(selectedPO.discountAmount) > 0 && (
                        <div className="flex justify-between text-red-650">
                          <span>Discount:</span>
                          <span className="font-medium">
                            {isReceived ? `- ${formatAmountOnly(parseFloat(selectedPO.discountAmount))}` : ""}
                          </span>
                        </div>
                      )}
                      {parseFloat(selectedPO.taxAmount) > 0 && (
                        <div className="flex justify-between text-zinc-650">
                          <span>VAT (13%):</span>
                          <span className="font-medium">
                            {isReceived ? `+ ${formatAmountOnly(parseFloat(selectedPO.taxAmount))}` : ""}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-bold border-t border-zinc-200 pt-2 text-zinc-900">
                        <span>Total Amount:</span>
                        <span>
                          {isReceived ? formatAmountOnly(parseFloat(selectedPO.totalAmount)) : ""}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-zinc-500">
                        <span>Paid Amount:</span>
                        <span>
                          {isReceived ? formatAmountOnly(parseFloat(selectedPO.paidAmount)) : ""}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm font-bold border-t border-zinc-200 pt-2 text-orange-600">
                        <span>Balance Due:</span>
                        <span>
                          {isReceived ? formatAmountOnly(parseFloat(selectedPO.balance)) : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter className="border-t border-zinc-200 pt-4 flex gap-2 justify-end w-full">
                  <Button
                    variant="outline"
                    onClick={handleDownloadPDF}
                    disabled={pdfDownloading}
                    className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100/70 shadow-sm font-semibold flex items-center gap-2"
                  >
                    {pdfDownloading ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download size={13} />
                        Download PDF
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDetail(false)}
                    className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 shadow-sm font-semibold"
                  >
                    Close Details
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit Purchase Order Modal */}
      {selectedPO && showEdit && (
        <EditPurchaseOrderModal
          isOpen={showEdit}
          onClose={() => {
            setShowEdit(false);
            setSelectedPO(null);
          }}
          onSuccess={() => router.refresh()}
          po={selectedPO}
          userId={userId}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDelete} onOpenChange={(val) => !val && setShowDelete(false)}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white text-zinc-900 border border-zinc-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-rose-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-500 animate-pulse" />
              Delete Purchase Order
            </DialogTitle>
            <p className="text-xs text-zinc-400 mt-1">
              Verify database record removal of this cancelled Purchase Order. This cannot be undone.
            </p>
          </DialogHeader>

          <div className="py-4 text-sm text-zinc-600">
            Are you sure you want to delete Purchase Order <strong className="text-zinc-950">"{poToDelete?.poNumber}"</strong>? This will permanently erase this transaction record and all its items from the database.
          </div>

          <DialogFooter className="pt-4 border-t border-zinc-150 flex gap-2 justify-end w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDelete(false)}
              className="h-10 px-4 rounded-xl text-zinc-650 font-bold border-zinc-200"
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="h-10 px-5 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2 shadow-md shadow-rose-600/20 border-none"
              disabled={deleteLoading}
            >
              {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PurchaseOrderTable;
