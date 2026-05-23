"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNPR } from "@/lib/utils";
import { Search, BookOpen } from "lucide-react";
import { CustomerLedgerModal } from "./CustomerLedgerModal";

interface CustomerData {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  customerType: "RETAIL" | "WHOLESALE" | "PROJECT";
  creditLimit: string;
  balance?: string;
}

interface CustomerListTableProps {
  customers: CustomerData[];
}

export function CustomerListTable({ customers }: CustomerListTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>("");
  const [showLedgerModal, setShowLedgerModal] = useState(false);

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
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3 text-right">Credit Limit</th>
              <th className="px-4 py-3 text-right">Ledger Balance</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500 italic">
                  No customers found matching "{searchQuery}"
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => {
                const bal = parseFloat(customer.balance || "0");
                return (
                  <tr key={customer.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                    <td className="px-4 py-3 font-mono text-xs">{customer.code}</td>
                    <td className="px-4 py-3 font-bold text-zinc-900 dark:text-zinc-100">
                      {customer.name}
                      {customer.address && (
                        <span className="block text-[10px] font-normal text-zinc-400">{customer.address}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenLedger(customer.id, customer.name)}
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

      {/* Customer Ledger Modal */}
      {selectedCustomerId && showLedgerModal && (
        <CustomerLedgerModal
          open={showLedgerModal}
          onOpenChange={setShowLedgerModal}
          customerId={selectedCustomerId}
          customerName={selectedCustomerName}
        />
      )}
    </div>
  );
}
