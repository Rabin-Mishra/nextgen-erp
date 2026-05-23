"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatNPR } from "@/lib/utils";
import { Search, Users, Briefcase, FileText, ArrowRight, BookOpen } from "lucide-react";
import { CustomerLedgerModal } from "../sales/CustomerLedgerModal";
import { SupplierLedgerModal } from "../purchase/SupplierLedgerModal";

interface SearchCustomer {
  id: string;
  name: string;
  code: string;
  phone: string;
  balance: string;
}

interface SearchVendor {
  id: string;
  name: string;
  code: string;
  phone: string;
  balance: string;
}

interface SearchInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  totalAmount: string;
  status: string;
}

interface SearchPO {
  id: string;
  poNumber: string;
  supplierName: string;
  totalAmount: string;
  status: string;
}

interface DashboardSearchWidgetProps {
  data: {
    customers: SearchCustomer[];
    vendors: SearchVendor[];
    invoices: SearchInvoice[];
    purchaseOrders: SearchPO[];
  };
}

export function DashboardSearchWidget({ data }: DashboardSearchWidgetProps) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "CUSTOMERS" | "VENDORS" | "INVOICES">("ALL");

  // Ledger states
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const [showCustomerLedger, setShowCustomerLedger] = useState(false);

  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [selectedSupplierName, setSelectedSupplierName] = useState("");
  const [showSupplierLedger, setShowSupplierLedger] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return { customers: [], vendors: [], invoices: [], purchaseOrders: [] };
    }

    const cMatches = data.customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.phone.includes(q)
    );
    const vMatches = data.vendors.filter(
      (v) => v.name.toLowerCase().includes(q) || v.code.toLowerCase().includes(q) || v.phone.includes(q)
    );
    const invMatches = data.invoices.filter(
      (i) => i.invoiceNumber.toLowerCase().includes(q) || i.customerName.toLowerCase().includes(q)
    );
    const poMatches = data.purchaseOrders.filter(
      (p) => p.poNumber.toLowerCase().includes(q) || p.supplierName.toLowerCase().includes(q)
    );

    return {
      customers: cMatches,
      vendors: vMatches,
      invoices: invMatches,
      purchaseOrders: poMatches,
    };
  }, [query, data]);

  const hasResults =
    filtered.customers.length > 0 ||
    filtered.vendors.length > 0 ||
    filtered.invoices.length > 0 ||
    filtered.purchaseOrders.length > 0;

  const handleOpenCustomerLedger = (id: string, name: string) => {
    setSelectedCustomerId(id);
    setSelectedCustomerName(name);
    setShowCustomerLedger(true);
  };

  const handleOpenSupplierLedger = (id: string, name: string) => {
    setSelectedSupplierId(id);
    setSelectedSupplierName(name);
    setShowSupplierLedger(true);
  };

  return (
    <Card className="border border-zinc-200 shadow-sm dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl overflow-hidden">
      <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/30 border-b pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Global Customer & Vendor Search Console
            </CardTitle>
            <p className="text-xs text-zinc-500 font-semibold mt-0.5">
              Instantly find party ledger profiles, outstanding balances, sales invoices, or purchase orders.
            </p>
          </div>
          
          <div className="flex gap-1 border p-1 rounded-lg bg-zinc-100/50 dark:bg-zinc-900 overflow-x-auto w-fit">
            <Button
              size="sm"
              variant={activeTab === "ALL" ? "default" : "ghost"}
              onClick={() => setActiveTab("ALL")}
              className="text-xs h-7 px-2.5"
            >
              All Results
            </Button>
            <Button
              size="sm"
              variant={activeTab === "CUSTOMERS" ? "default" : "ghost"}
              onClick={() => setActiveTab("CUSTOMERS")}
              className="text-xs h-7 px-2.5"
            >
              Customers ({filtered.customers.length})
            </Button>
            <Button
              size="sm"
              variant={activeTab === "VENDORS" ? "default" : "ghost"}
              onClick={() => setActiveTab("VENDORS")}
              className="text-xs h-7 px-2.5"
            >
              Vendors ({filtered.vendors.length})
            </Button>
            <Button
              size="sm"
              variant={activeTab === "INVOICES" ? "default" : "ghost"}
              onClick={() => setActiveTab("INVOICES")}
              className="text-xs h-7 px-2.5"
            >
              Bills & Invoices ({filtered.invoices.length + filtered.purchaseOrders.length})
            </Button>
          </div>
        </div>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-400" />
          <Input
            placeholder="Search by customer/vendor name, phone, invoice number (INV-XXXX) or PO number (PO-XXXX)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-10 text-sm font-semibold border-primary/20 focus-visible:ring-primary shadow-sm"
          />
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {!query.trim() ? (
          <div className="text-center py-10 text-zinc-400 italic text-xs">
            Type in the search box above to lookup real-time ledger entries, invoices, and supplier details.
          </div>
        ) : !hasResults ? (
          <div className="text-center py-10 text-zinc-500 italic text-xs">
            No matching customer, vendor, or invoice records found for "{query}".
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. CUSTOMERS MATCHES */}
            {(activeTab === "ALL" || activeTab === "CUSTOMERS") && filtered.customers.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-blue-500" />
                  Matching Customers
                </h4>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 font-semibold border-b">
                      <tr>
                        <th className="p-3">Code</th>
                        <th className="p-3">Customer Name</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3 text-right">Outstanding Balance</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filtered.customers.map((c) => {
                        const bal = parseFloat(c.balance);
                        return (
                          <tr key={c.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                            <td className="p-3 font-mono font-bold text-zinc-500">{c.code}</td>
                            <td className="p-3 font-bold text-zinc-800 dark:text-zinc-100">{c.name}</td>
                            <td className="p-3 font-mono text-zinc-600">{c.phone || "-"}</td>
                            <td className="p-3 text-right font-bold text-emerald-600">{formatNPR(bal)}</td>
                            <td className="p-3 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] gap-1 border-primary/20 text-primary hover:bg-primary/5 font-bold"
                                onClick={() => handleOpenCustomerLedger(c.id, c.name)}
                              >
                                <BookOpen className="h-3 w-3" />
                                Ledger Statement
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. VENDORS MATCHES */}
            {(activeTab === "ALL" || activeTab === "VENDORS") && filtered.vendors.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-amber-500" />
                  Matching Vendors / Suppliers
                </h4>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 font-semibold border-b">
                      <tr>
                        <th className="p-3">Code</th>
                        <th className="p-3">Vendor Name</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3 text-right">Balance Owed (AP)</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filtered.vendors.map((v) => {
                        const bal = parseFloat(v.balance);
                        return (
                          <tr key={v.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                            <td className="p-3 font-mono font-bold text-zinc-500">{v.code}</td>
                            <td className="p-3 font-bold text-zinc-800 dark:text-zinc-100">{v.name}</td>
                            <td className="p-3 font-mono text-zinc-600">{v.phone || "-"}</td>
                            <td className="p-3 text-right font-bold text-rose-600">{formatNPR(bal)}</td>
                            <td className="p-3 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] gap-1 border-primary/20 text-primary hover:bg-primary/5 font-bold"
                                onClick={() => handleOpenSupplierLedger(v.id, v.name)}
                              >
                                <BookOpen className="h-3 w-3" />
                                Ledger Statement
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. INVOICES & BILLS MATCHES */}
            {(activeTab === "ALL" || activeTab === "INVOICES") &&
              (filtered.invoices.length > 0 || filtered.purchaseOrders.length > 0) && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-purple-500" />
                    Matching Billing Documents (Sales Invoices & Purchase Orders)
                  </h4>
                  <div className="border rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 font-semibold border-b">
                        <tr>
                          <th className="p-3">Doc #</th>
                          <th className="p-3">Transaction Type</th>
                          <th className="p-3">Client / Vendor Name</th>
                          <th className="p-3 text-right">Total Amount</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-center">Operation Link</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {/* Sales Invoices */}
                        {filtered.invoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                            <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">{inv.invoiceNumber}</td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-[9px] font-bold text-blue-700 bg-blue-50/30">
                                CUSTOMER INVOICE
                              </Badge>
                            </td>
                            <td className="p-3 font-bold text-zinc-800 dark:text-zinc-100">{inv.customerName}</td>
                            <td className="p-3 text-right font-semibold">{formatNPR(parseFloat(inv.totalAmount))}</td>
                            <td className="p-3">
                              <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-green-100 text-green-800 uppercase">
                                {inv.status}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <a href={`/sales?tab=invoices`} className="inline-flex items-center gap-0.5 text-xs text-primary font-bold hover:underline">
                                Go to Sales
                                <ArrowRight className="h-3.5 w-3.5" />
                              </a>
                            </td>
                          </tr>
                        ))}

                        {/* Purchase Orders */}
                        {filtered.purchaseOrders.map((po) => (
                          <tr key={po.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                            <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">{po.poNumber}</td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-[9px] font-bold text-amber-700 bg-amber-50/30">
                                SUPPLIER PURCHASE ORDER
                              </Badge>
                            </td>
                            <td className="p-3 font-bold text-zinc-800 dark:text-zinc-100">{po.supplierName}</td>
                            <td className="p-3 text-right font-semibold">{formatNPR(parseFloat(po.totalAmount))}</td>
                            <td className="p-3">
                              <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-blue-100 text-blue-800 uppercase">
                                {po.status}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <a href={`/purchase?tab=orders`} className="inline-flex items-center gap-0.5 text-xs text-primary font-bold hover:underline">
                                Go to Purchase
                                <ArrowRight className="h-3.5 w-3.5" />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
          </div>
        )}
      </CardContent>

      {/* Customer Ledger Pop-up Modal */}
      {selectedCustomerId && showCustomerLedger && (
        <CustomerLedgerModal
          open={showCustomerLedger}
          onOpenChange={setShowCustomerLedger}
          customerId={selectedCustomerId}
          customerName={selectedCustomerName}
        />
      )}

      {/* Supplier Ledger Pop-up Modal */}
      {selectedSupplierId && showSupplierLedger && (
        <SupplierLedgerModal
          open={showSupplierLedger}
          onOpenChange={setShowSupplierLedger}
          supplierId={selectedSupplierId}
          supplierName={selectedSupplierName}
        />
      )}
    </Card>
  );
}
