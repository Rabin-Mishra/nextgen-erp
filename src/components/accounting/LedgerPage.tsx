"use client";

import React, { useEffect, useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { NPRAmount } from "@/components/shared/NPRAmount";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { fetchPartiesBalancesAction, fetchLedgerSummaryAction } from "@/modules/accounting/actions";
import { LedgerDetailModal } from "./LedgerDetailModal";
import { ColumnDef } from "@tanstack/react-table";
import { BookOpen, ArrowUpRight, ArrowDownLeft, Scale, Users, Briefcase, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PartyType } from "@/generated/prisma/enums";

interface PartyBalanceRow {
  id: string;
  name: string;
  code: string;
  type: PartyType;
  channel: string;
  address: string | null;
  phone: string | null;
  panNumber: string | null;
  totalDr: string;
  totalCr: string;
  balance: string;
  lastTxDate: string | null;
}

export function LedgerPage() {
  const [summary, setSummary] = useState({
    totalReceivable: "0.00",
    totalPayable: "0.00",
    netPosition: "0.00",
  });
  const [parties, setParties] = useState<PartyBalanceRow[]>([]);
  const [filteredParties, setFilteredParties] = useState<PartyBalanceRow[]>([]);
  const [activeTab, setActiveTab] = useState<"ALL" | "CUSTOMER" | "SUPPLIER">("ALL");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Detailed Modal State
  const [selectedParty, setSelectedParty] = useState<PartyBalanceRow | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const sumData = await fetchLedgerSummaryAction();
      setSummary(sumData);

      const partiesData = await fetchPartiesBalancesAction();
      setParties(partiesData);
      applyFilters(partiesData, activeTab, search);
    } catch (err: any) {
      toast.error(`Failed to load ledger: ${err.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const applyFilters = (data: PartyBalanceRow[], tab: "ALL" | "CUSTOMER" | "SUPPLIER", query: string) => {
    let result = data;
    
    // Tab filter
    if (tab !== "ALL") {
      result = result.filter((p) => p.type === tab);
    }

    // Search query
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          (p.panNumber && p.panNumber.includes(q))
      );
    }

    setFilteredParties(result);
  };

  const handleTabChange = (tab: "ALL" | "CUSTOMER" | "SUPPLIER") => {
    setActiveTab(tab);
    applyFilters(parties, tab, search);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    applyFilters(parties, activeTab, val);
  };

  const openDetails = (party: PartyBalanceRow) => {
    setSelectedParty(party);
    setIsDetailOpen(true);
  };

  const columns: ColumnDef<PartyBalanceRow>[] = [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">{row.getValue("code")}</span>
      ),
    },
    {
      accessorKey: "name",
      header: "Party Name",
      cell: ({ row }) => (
        <div className="font-bold text-zinc-800 dark:text-zinc-200">
          {row.getValue("name")}
          {row.original.panNumber && (
            <span className="block text-[10px] text-zinc-400 font-mono">PAN: {row.original.panNumber}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as PartyType;
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
            type === "CUSTOMER"
              ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800"
              : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800"
          }`}>
            {type === "CUSTOMER" ? <Users className="h-3 w-3" /> : <Briefcase className="h-3 w-3" />}
            {type}
          </span>
        );
      },
    },
    {
      accessorKey: "channel",
      header: "Channel",
      cell: ({ row }) => {
        const channel = row.getValue("channel") as string;
        let badgeStyle = "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300";
        if (channel === "RETAIL") badgeStyle = "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300";
        if (channel === "WHOLESALE") badgeStyle = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
        if (channel === "PROJECT") badgeStyle = "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300";
        
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${badgeStyle}`}>
            {channel}
          </span>
        );
      },
    },
    {
      accessorKey: "totalDr",
      header: "Total Debits (Dr, NPR)",
      cell: ({ row }) => (
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          <NPRAmount amount={Number(row.getValue("totalDr"))} showCurrency={false} />
        </span>
      ),
    },
    {
      accessorKey: "totalCr",
      header: "Total Credits (Cr, NPR)",
      cell: ({ row }) => (
        <span className="font-semibold text-rose-600 dark:text-rose-400">
          <NPRAmount amount={Number(row.getValue("totalCr"))} showCurrency={false} />
        </span>
      ),
    },
    {
      accessorKey: "balance",
      header: "Outstanding Balance (NPR)",
      cell: ({ row }) => {
        const bal = Number(row.getValue("balance"));
        const isSupplier = row.original.type === "SUPPLIER";
        
        // Color codes based on whether it is an asset (due to us) or liability (due to vendor)
        // Customer balance > 0 is green (receivable), < 0 is red.
        // Supplier balance > 0 is red (payable), < 0 is green (we are in credit).
        let color = "text-zinc-900 dark:text-zinc-50";
        if (!isSupplier && bal > 0) color = "text-emerald-600 dark:text-emerald-400";
        if (!isSupplier && bal < 0) color = "text-rose-600 dark:text-rose-400";
        if (isSupplier && bal > 0) color = "text-rose-600 dark:text-rose-400";
        if (isSupplier && bal < 0) color = "text-emerald-600 dark:text-emerald-400";

        return (
          <span className={`font-bold ${color}`}>
            <NPRAmount amount={bal} showSign={true} showCurrency={false} />
            <span className="text-[10px] ml-1 font-semibold text-zinc-400">
              {isSupplier ? "(Cr Payable)" : "(Dr Receivable)"}
            </span>
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            openDetails(row.original);
          }}
          className="text-xs h-7 flex gap-1 border-blue-200 text-blue-700 hover:bg-blue-50"
        >
          <Eye className="h-3.5 w-3.5" />
          Statement
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Double-Entry General Ledger"
        description="Chronological double-entry ledgers, receivables, payables, and account statements."
      />

      {/* Summary Matrix Cards */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="border border-zinc-100 dark:border-zinc-800 shadow-sm rounded-2xl h-32 animate-pulse bg-zinc-50 dark:bg-zinc-900" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border border-zinc-100 shadow-sm rounded-2xl dark:border-zinc-800 dark:bg-zinc-950 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Accounts Receivable (AR)</CardTitle>
              <div className="p-2.5 rounded-xl text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                <NPRAmount amount={Number(summary.totalReceivable)} />
              </div>
              <p className="text-xs text-zinc-400 font-semibold mt-1">Outstanding dues from active customers</p>
            </CardContent>
          </Card>

          <Card className="border border-zinc-100 shadow-sm rounded-2xl dark:border-zinc-800 dark:bg-zinc-950 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Accounts Payable (AP)</CardTitle>
              <div className="p-2.5 rounded-xl text-rose-500 bg-rose-50 dark:bg-rose-950/20">
                <ArrowDownLeft className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                <NPRAmount amount={Number(summary.totalPayable)} />
              </div>
              <p className="text-xs text-zinc-400 font-semibold mt-1">Outstanding payables owed to vendors</p>
            </CardContent>
          </Card>

          <Card className="border border-zinc-100 shadow-sm rounded-2xl dark:border-zinc-800 dark:bg-zinc-950 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Net Ledger Position</CardTitle>
              <div className="p-2.5 rounded-xl text-purple-500 bg-purple-50 dark:bg-purple-950/20">
                <Scale className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                <NPRAmount amount={Number(summary.netPosition)} showSign={true} />
              </div>
              <p className="text-xs text-zinc-400 font-semibold mt-1">Receivables surplus net of payables</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Ledger Sheet */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
        {/* Navigation & Search bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Party Balances Registry</h2>
          </div>

          <div className="flex gap-1 border p-1 rounded-lg bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 overflow-x-auto">
            <Button
              size="sm"
              variant={activeTab === "ALL" ? "default" : "ghost"}
              onClick={() => handleTabChange("ALL")}
              className="text-xs h-8"
            >
              All Parties
            </Button>
            <Button
              size="sm"
              variant={activeTab === "CUSTOMER" ? "default" : "ghost"}
              onClick={() => handleTabChange("CUSTOMER")}
              className="text-xs h-8"
            >
              Customers
            </Button>
            <Button
              size="sm"
              variant={activeTab === "SUPPLIER" ? "default" : "ghost"}
              onClick={() => handleTabChange("SUPPLIER")}
              className="text-xs h-8"
            >
              Suppliers (Vendors)
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredParties}
            searchPlaceholder="Search party name, code, or PAN number..."
            searchColumnId="name"
            pagination={{
              pageIndex: 0,
              pageSize: 15,
              pageCount: Math.ceil(filteredParties.length / 15),
              totalItems: filteredParties.length,
            }}
          />
        )}
      </div>

      {/* Detailed Modal */}
      {selectedParty && (
        <LedgerDetailModal
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          partyId={selectedParty.id}
          partyType={selectedParty.type}
          party={selectedParty}
        />
      )}
    </div>
  );
}
