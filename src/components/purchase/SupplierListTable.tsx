"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNPR } from "@/lib/utils";
import { Search, BookOpen } from "lucide-react";
import { SupplierLedgerModal } from "./SupplierLedgerModal";

interface SupplierData {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  panNumber: string | null;
  openingBalance: string;
  balance?: string;
}

interface SupplierListTableProps {
  suppliers: SupplierData[];
}

export function SupplierListTable({ suppliers }: SupplierListTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [selectedSupplierName, setSelectedSupplierName] = useState<string>("");
  const [showLedgerModal, setShowLedgerModal] = useState(false);

  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return suppliers;
    const query = searchQuery.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.code.toLowerCase().includes(query) ||
        (s.phone && s.phone.toLowerCase().includes(query)) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(query)) ||
        (s.address && s.address.toLowerCase().includes(query))
    );
  }, [suppliers, searchQuery]);

  const handleOpenLedger = (id: string, name: string) => {
    setSelectedSupplierId(id);
    setSelectedSupplierName(name);
    setShowLedgerModal(true);
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
        <Input
          placeholder="Search by name, code, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">
            <tr className="font-semibold text-left">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Supplier Name</th>
              <th className="px-4 py-3 font-mono text-xs">PAN</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3 text-right">Balance Owed (AP)</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredSuppliers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500 italic">
                  No suppliers found matching "{searchQuery}"
                </td>
              </tr>
            ) : (
              filteredSuppliers.map((supplier) => {
                const bal = parseFloat(supplier.balance || "0");
                return (
                  <tr key={supplier.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                    <td className="px-4 py-3 font-mono text-xs">{supplier.code}</td>
                    <td className="px-4 py-3 font-bold text-zinc-900 dark:text-zinc-100">
                      {supplier.name}
                      {supplier.contactPerson && (
                        <span className="block text-[10px] font-normal text-zinc-400">Contact: {supplier.contactPerson}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{supplier.panNumber ?? "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{supplier.phone ?? "-"}</td>
                    <td className="px-4 py-3 text-right font-bold">
                      <span className={bal > 0 ? "text-red-600 dark:text-red-400" : "text-zinc-600"}>
                        {formatNPR(bal)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenLedger(supplier.id, supplier.name)}
                        className="text-xs h-8 gap-1 border-primary/20 text-primary hover:bg-primary/5"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        Ledger
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Supplier Ledger Modal */}
      {selectedSupplierId && showLedgerModal && (
        <SupplierLedgerModal
          open={showLedgerModal}
          onOpenChange={setShowLedgerModal}
          supplierId={selectedSupplierId}
          supplierName={selectedSupplierName}
        />
      )}
    </div>
  );
}
