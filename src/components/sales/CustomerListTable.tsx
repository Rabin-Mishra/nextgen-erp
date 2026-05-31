"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatNPR } from "@/lib/utils";
import { Search, BookOpen, Pencil, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { CustomerLedgerModal } from "./CustomerLedgerModal";
import { EditCustomerModal } from "./EditCustomerModal";
import { deleteCustomer, updateCustomer } from "@/modules/sales/actions";
import { toast } from "sonner";

interface CustomerData {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  contactPerson: string | null;
  panNumber: string | null;
  customerType: "RETAIL" | "WHOLESALE" | "PROJECT";
  creditLimit: string;
  openingBalance: string;
  notes: string | null;
  balance?: string;
  isActive: boolean;
}

interface CustomerListTableProps {
  customers: CustomerData[];
}

export function CustomerListTable({ customers: initialCustomers }: CustomerListTableProps) {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerData[]>(initialCustomers);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync prop changes to state
  useEffect(() => {
    setCustomers(initialCustomers);
  }, [initialCustomers]);
  
  // Ledger Modal State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>("");
  const [showLedgerModal, setShowLedgerModal] = useState(false);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<CustomerData | null>(null);

  // Deletion Confirmation State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerData | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Blocking Warning State (Deactivate Instead)
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockMessage, setBlockMessage] = useState("");
  const [customerToDeactivate, setCustomerToDeactivate] = useState<CustomerData | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const query = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.code.toLowerCase().includes(query) ||
        (c.phone && c.phone.toLowerCase().includes(query)) ||
        (c.address && c.address.toLowerCase().includes(query))
    );
  }, [customers, searchQuery]);

  const handleOpenLedger = (id: string, name: string) => {
    setSelectedCustomerId(id);
    setSelectedCustomerName(name);
    setShowLedgerModal(true);
  };

  const handleOpenEdit = (customer: CustomerData) => {
    setCustomerToEdit(customer);
    setShowEditModal(true);
  };

  const handleDeleteClick = (customer: CustomerData) => {
    setCustomerToDelete(customer);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;

    try {
      setDeleteLoading(true);
      await deleteCustomer(customerToDelete.id);
      toast.success(`Customer "${customerToDelete.name}" successfully deleted.`);
      setShowDeleteModal(false);
      setCustomerToDelete(null);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("Cannot delete.")) {
        // Intercept block check error and show Deactivate option
        setBlockMessage(err.message);
        setCustomerToDeactivate(customerToDelete);
        setShowDeleteModal(false);
        setShowBlockModal(true);
      } else {
        toast.error(err.message || "Failed to delete customer");
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!customerToDeactivate) return;

    try {
      setDeactivateLoading(true);
      await updateCustomer(customerToDeactivate.id, { isActive: false });
      toast.success(`Customer "${customerToDeactivate.name}" has been deactivated successfully.`);
      setShowBlockModal(false);
      setCustomerToDeactivate(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate customer");
    } finally {
      setDeactivateLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-400" />
        <Input
          placeholder="Search by name, code, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-10 rounded-xl border-zinc-200 dark:border-zinc-800"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400">
            <tr className="font-semibold text-left">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3 text-right">Credit Limit</th>
              <th className="px-4 py-3 text-right">Ledger Balance</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-500 italic">
                  No customers found matching "{searchQuery}"
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => {
                const bal = parseFloat(customer.balance || "0");
                return (
                  <tr key={customer.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                    <td className="px-4 py-3 font-mono text-xs">{customer.code}</td>
                    <td className="px-4 py-3 font-bold text-zinc-900 dark:text-zinc-100">
                      {customer.name}
                      {customer.address && (
                        <span className="block text-[10px] font-normal text-zinc-400">{customer.address}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider rounded-md">
                        {customer.customerType}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{customer.phone ?? "-"}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatNPR(parseFloat(customer.creditLimit))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      <span className={bal > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-600"}>
                        {formatNPR(bal)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={customer.isActive ? "default" : "secondary"} className="h-5">
                        {customer.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenLedger(customer.id, customer.name)}
                          className="text-xs h-8 gap-1 border-primary/20 text-primary hover:bg-primary/5 rounded-lg font-bold"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          Ledger
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(customer)}
                          className="h-8 w-8 rounded-lg text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(customer)}
                          className="h-8 w-8 rounded-lg text-zinc-400 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Customer Ledger Modal */}
      {selectedCustomerId && showLedgerModal && (
        <CustomerLedgerModal
          open={showLedgerModal}
          onOpenChange={setShowLedgerModal}
          customerId={selectedCustomerId}
          customerName={selectedCustomerName}
        />
      )}

      {/* Edit Customer Modal */}
      {customerToEdit && showEditModal && (
        <EditCustomerModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setCustomerToEdit(null);
          }}
          onSuccess={() => router.refresh()}
          customer={customerToEdit}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={(val) => !val && setShowDeleteModal(false)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500 animate-pulse" />
              Delete Customer
            </DialogTitle>
            <p className="text-xs text-zinc-400 mt-1">
              Verify database record removal. This cannot be undone.
            </p>
          </DialogHeader>

          <div className="py-4 text-sm text-zinc-600 dark:text-zinc-400">
            Are you sure you want to delete customer <strong className="text-zinc-950 dark:text-zinc-50">"{customerToDelete?.name}"</strong>? This will permanently erase their account from the database.
          </div>

          <DialogFooter className="pt-4 border-t border-zinc-150 dark:border-zinc-900">
            <div className="flex items-center gap-2 justify-end w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                className="h-10 px-4 rounded-xl text-zinc-600 font-bold border-zinc-200 dark:border-zinc-800"
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                className="h-10 px-5 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2 shadow-md shadow-rose-600/20 border-0"
                disabled={deleteLoading}
              >
                {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Delete
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Blocking Warning Modal (Deactivate Instead) */}
      <Dialog open={showBlockModal} onOpenChange={(val) => !val && setShowBlockModal(false)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Deletion Blocked
            </DialogTitle>
            <p className="text-xs text-zinc-400 mt-1">
              Active transaction postings exist on this account.
            </p>
          </DialogHeader>

          <div className="py-4 text-sm text-zinc-600 dark:text-zinc-400 space-y-3">
            <p>{blockMessage}</p>
            <p className="text-xs text-zinc-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 p-2.5 rounded-xl">
              Deactivating keeps historical ledger logs safe, but prevents staff from creating new sales invoices under this account.
            </p>
          </div>

          <DialogFooter className="pt-4 border-t border-zinc-150 dark:border-zinc-900">
            <div className="flex items-center gap-2 justify-end w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowBlockModal(false)}
                className="h-10 px-4 rounded-xl text-zinc-600 font-bold border-zinc-200 dark:border-zinc-800"
                disabled={deactivateLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDeactivate}
                className="h-10 px-5 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-2 shadow-md shadow-amber-500/20 border-0"
                disabled={deactivateLoading}
              >
                {deactivateLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Deactivate Instead
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CustomerListTable;
