"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatRs } from "@/lib/utils";
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
    <Card className="border border-zinc-250 shadow-sm dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg overflow-hidden font-sans">
      <CardHeader className="bg-zinc-50/50 dark:bg-zinc-800/20 border-b border-zinc-200 dark:border-zinc-800 pb-4 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-black flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
              <Search className="h-4.5 w-4.5 text-zinc-800 dark:text-zinc-200 stroke-[2.5]" />
              Global Customer & Vendor Search Console
            </CardTitle>
            <p className="text-xs text-zinc-650 font-bold mt-1 dark:text-zinc-350">
              Instantly find party ledger profiles, outstanding balances, sales invoices, or purchase orders.
            </p>
          </div>
          
          <div className="flex gap-1 border border-zinc-200 dark:border-zinc-700 p-1 rounded bg-zinc-100 dark:bg-zinc-800 overflow-x-auto w-fit">
            <Button
              size="sm"
              variant={activeTab === "ALL" ? "default" : "ghost"}
              onClick={() => setActiveTab("ALL")}
              className="text-xs h-7 px-2.5 font-bold cursor-pointer"
            >
              All Results
            </Button>
            <Button
              size="sm"
              variant={activeTab === "CUSTOMERS" ? "default" : "ghost"}
              onClick={() => setActiveTab("CUSTOMERS")}
              className="text-xs h-7 px-2.5 font-bold cursor-pointer"
            >
              Customers ({query.trim() ? filtered.customers.length : data.customers.length})
            </Button>
            <Button
              size="sm"
              variant={activeTab === "VENDORS" ? "default" : "ghost"}
              onClick={() => setActiveTab("VENDORS")}
              className="text-xs h-7 px-2.5 font-bold cursor-pointer"
            >
              Vendors ({query.trim() ? filtered.vendors.length : data.vendors.length})
            </Button>
            <Button
              size="sm"
              variant={activeTab === "INVOICES" ? "default" : "ghost"}
              onClick={() => setActiveTab("INVOICES")}
              className="text-xs h-7 px-2.5 font-bold cursor-pointer"
            >
              Bills & Invoices ({query.trim() ? (filtered.invoices.length + filtered.purchaseOrders.length) : (data.invoices.length + data.purchaseOrders.length)})
            </Button>
          </div>
        </div>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-500" />
          <Input
            placeholder="Search by customer/vendor name, phone, invoice number (INV-XXXX) or PO number (PO-XXXX)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-10 text-sm font-extrabold border-zinc-300 focus-visible:ring-primary shadow-sm text-zinc-900 dark:text-zinc-50"
          />
        </div>
      </CardHeader>

      <CardContent className="p-5">
        {!query.trim() ? (
          <div className="text-center py-8 text-zinc-500 font-bold italic text-xs">
            Type in the search box above to lookup real-time ledger entries, invoices, and supplier details.
          </div>
        ) : !hasResults ? (
          <div className="text-center py-8 text-zinc-650 font-bold italic text-xs">
            No matching customer, vendor, or invoice records found for "{query}".
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. CUSTOMERS MATCHES */}
            {(activeTab === "ALL" || activeTab === "CUSTOMERS") && filtered.customers.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400 stroke-[2.5]" />
                  Matching Customers
                </h4>
                <div className="border border-zinc-250 dark:border-zinc-800 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-200 font-extrabold border-b border-zinc-250 dark:border-zinc-800 uppercase tracking-wider">
                      <tr>
                        <th className="p-3 text-[10px]">Code</th>
                        <th className="p-3 text-[10px]">Customer Name</th>
                        <th className="p-3 text-[10px]">Phone</th>
                        <th className="p-3 text-right text-[10px]">Outstanding Balance</th>
                        <th className="p-3 text-center text-[10px]">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {filtered.customers.map((c) => {
                        const bal = parseFloat(c.balance);
                        return (
                          <tr key={c.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                            <td className="p-3 font-mono font-black text-zinc-600 dark:text-zinc-400">{c.code}</td>
                            <td className="p-3 font-extrabold text-zinc-900 dark:text-zinc-100">{c.name}</td>
                            <td className="p-3 font-mono font-bold text-zinc-700 dark:text-zinc-300">{c.phone || "-"}</td>
                            <td className="p-3 text-right font-black text-red-600 dark:text-red-400 whitespace-nowrap text-sm">
                              {formatRs(bal)}
                            </td>
                            <td className="p-3 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] gap-1 border-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-extrabold text-zinc-800 dark:text-zinc-200 cursor-pointer"
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
                <h4 className="text-xs font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-amber-600 dark:text-amber-450 stroke-[2.5]" />
                  Matching Vendors / Suppliers
                </h4>
                <div className="border border-zinc-250 dark:border-zinc-800 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-200 font-extrabold border-b border-zinc-250 dark:border-zinc-800 uppercase tracking-wider">
                      <tr>
                        <th className="p-3 text-[10px]">Code</th>
                        <th className="p-3 text-[10px]">Vendor Name</th>
                        <th className="p-3 text-[10px]">Phone</th>
                        <th className="p-3 text-right text-[10px]">Balance Owed (AP)</th>
                        <th className="p-3 text-center text-[10px]">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {filtered.vendors.map((v) => {
                        const bal = parseFloat(v.balance);
                        return (
                          <tr key={v.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                            <td className="p-3 font-mono font-black text-zinc-600 dark:text-zinc-400">{v.code}</td>
                            <td className="p-3 font-extrabold text-zinc-900 dark:text-zinc-100">{v.name}</td>
                            <td className="p-3 font-mono font-bold text-zinc-700 dark:text-zinc-300">{v.phone || "-"}</td>
                            <td className="p-3 text-right font-black text-red-600 dark:text-red-400 whitespace-nowrap text-sm">
                              {formatRs(bal)}
                            </td>
                            <td className="p-3 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] gap-1 border-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-extrabold text-zinc-800 dark:text-zinc-200 cursor-pointer"
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
                  <h4 className="text-xs font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-purple-650 dark:text-purple-400 stroke-[2.5]" />
                    Matching Billing Documents (Sales Invoices & Purchase Orders)
                  </h4>
                  <div className="border border-zinc-250 dark:border-zinc-800 rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-200 font-extrabold border-b border-zinc-250 dark:border-zinc-800 uppercase tracking-wider">
                        <tr>
                          <th className="p-3 text-[10px]">Doc #</th>
                          <th className="p-3 text-[10px]">Transaction Type</th>
                          <th className="p-3 text-[10px]">Client / Vendor Name</th>
                          <th className="p-3 text-right text-[10px]">Total Amount</th>
                          <th className="p-3 text-[10px]">Status</th>
                          <th className="p-3 text-center text-[10px]">Operation Link</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {/* Sales Invoices */}
                        {filtered.invoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                            <td className="p-3 font-mono font-black text-blue-600 dark:text-blue-400">{inv.invoiceNumber}</td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-[9px] font-black text-blue-700 bg-blue-50/50 border-blue-200">
                                CUSTOMER INVOICE
                              </Badge>
                            </td>
                            <td className="p-3 font-extrabold text-zinc-900 dark:text-zinc-100">{inv.customerName}</td>
                            <td className="p-3 text-right font-black whitespace-nowrap text-sm text-zinc-900 dark:text-zinc-50">{formatRs(parseFloat(inv.totalAmount))}</td>
                            <td className="p-3">
                              <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-black tracking-wider bg-green-100 text-green-800 uppercase">
                                {inv.status}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <a href={`/sales?tab=invoices`} className="inline-flex items-center gap-0.5 text-xs text-blue-600 font-bold hover:underline">
                                Go to Sales
                                <ArrowRight className="h-3.5 w-3.5" />
                              </a>
                            </td>
                          </tr>
                        ))}

                        {/* Purchase Orders */}
                        {filtered.purchaseOrders.map((po) => (
                          <tr key={po.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                            <td className="p-3 font-mono font-black text-amber-600 dark:text-amber-400">{po.poNumber}</td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-[9px] font-black text-amber-700 bg-amber-50/50 border-amber-200">
                                SUPPLIER PURCHASE ORDER
                              </Badge>
                            </td>
                            <td className="p-3 font-extrabold text-zinc-900 dark:text-zinc-100">{po.supplierName}</td>
                            <td className="p-3 text-right font-black whitespace-nowrap text-sm text-zinc-900 dark:text-zinc-50">{formatRs(parseFloat(po.totalAmount))}</td>
                            <td className="p-3">
                              <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-black tracking-wider bg-blue-100 text-blue-800 uppercase">
                                {po.status}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <a href={`/purchase?tab=orders`} className="inline-flex items-center gap-0.5 text-xs text-blue-650 font-bold hover:underline">
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
