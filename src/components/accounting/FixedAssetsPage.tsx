"use client";

import React, { useEffect, useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { NPRAmount } from "@/components/shared/NPRAmount";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchAssetRegisterAction,
  createFixedAssetAction,
  fetchCapitalEntriesAction,
  addCapitalEntryAction,
} from "@/modules/accounting/actions";
import { ColumnDef } from "@tanstack/react-table";
import {
  Award,
  Calendar,
  ChevronRight,
  Eye,
  Hammer,
  HeartPulse,
  Plus,
  RefreshCw,
  Sparkles,
  Landmark,
  Coins,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

interface FixedAssetRow {
  id: string;
  name: string;
  category: string;
  purchaseDate: string;
  purchasePrice: string;
  usefulLifeYears: number;
  depreciationMethod: "STRAIGHT_LINE" | "DECLINING_BALANCE";
  currentValue: string;
  isActive: boolean;
  accumulatedDepreciation: string;
}

export function FixedAssetsPage() {
  const [activeTab, setActiveTab] = useState<"ASSETS" | "CAPITAL">("ASSETS");
  const [assets, setAssets] = useState<FixedAssetRow[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<FixedAssetRow[]>([]);
  const [capitalEntries, setCapitalEntries] = useState<any[]>([]);
  const [filteredCapital, setFilteredCapital] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Totals Summary
  const [totalCost, setTotalCost] = useState(0);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCapitalCreateOpen, setIsCapitalCreateOpen] = useState(false);
  
  // Transitions
  const [isCreatingAsset, startCreatingAsset] = useTransition();
  const [isSavingCapital, startSavingCapital] = useTransition();

  // Create Asset Form States
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Vehicle");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");

  // Create Capital Form States
  const [capitalAmount, setCapitalAmount] = useState("");
  const [capitalDate, setCapitalDate] = useState("");
  const [capitalDesc, setCapitalDesc] = useState("Owner Capital Contribution");
  const [capitalMethod, setCapitalMethod] = useState("BANK");
  const [capitalFormError, setCapitalFormError] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Fetch Assets
      const assetsData = await fetchAssetRegisterAction();
      setAssets(assetsData as any[]);
      applyFilter(assetsData as any[], search, activeTab);

      // Compute summaries
      let totalCostSum = 0;
      for (const a of assetsData) {
        totalCostSum += parseFloat(a.purchasePrice);
      }
      setTotalCost(totalCostSum);

      // Fetch Capital entries
      const capData = await fetchCapitalEntriesAction();
      setCapitalEntries(capData);
      applyFilterCapital(capData, search, activeTab);
    } catch (err: any) {
      toast.error(`Failed to load registers: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const applyFilter = (data: FixedAssetRow[], query: string, tab: "ASSETS" | "CAPITAL") => {
    let result = data;
    if (query && tab === "ASSETS") {
      const q = query.toLowerCase();
      result = result.filter(
        (a) => a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
      );
    }
    setFilteredAssets(result);
  };

  const applyFilterCapital = (data: any[], query: string, tab: "ASSETS" | "CAPITAL") => {
    let result = data;
    if (query && tab === "CAPITAL") {
      const q = query.toLowerCase();
      result = result.filter(
        (c) =>
          c.description.toLowerCase().includes(q) ||
          c.paymentMethod.toLowerCase().includes(q) ||
          (c.creator?.name && c.creator.name.toLowerCase().includes(q))
      );
    }
    setFilteredCapital(result);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    applyFilter(assets, val, activeTab);
    applyFilterCapital(capitalEntries, val, activeTab);
  };

  const handleTabChange = (tab: "ASSETS" | "CAPITAL") => {
    setActiveTab(tab);
    setSearch("");
    applyFilter(assets, "", tab);
    applyFilterCapital(capitalEntries, "", tab);
  };

  const handleCreateAsset = () => {
    setFormError("");
    const parsedPrice = parseFloat(purchasePrice);

    if (!name.trim()) {
      setFormError("Asset name is required.");
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setFormError("Please enter a valid purchase price.");
      return;
    }
    if (!purchaseDate) {
      setFormError("Please select a purchase date.");
      return;
    }

    startCreatingAsset(async () => {
      const finalName = notes.trim() ? `${name.trim()} (${notes.trim()})` : name.trim();
      const res = await createFixedAssetAction({
        name: finalName,
        category,
        purchaseDate,
        purchasePrice: parsedPrice,
        usefulLifeYears: 1, // Default value to satisfy schema requirement
        depreciationMethod: "STRAIGHT_LINE", // Default value to satisfy schema requirement
      });

      if (res.success) {
        toast.success("Fixed Asset capitalized successfully!");
        setIsCreateOpen(false);
        setName("");
        setPurchasePrice("");
        setPurchaseDate("");
        setNotes("");
        loadData();
      } else {
        setFormError(res.error || "Failed to capitalize asset.");
        toast.error(`Error: ${res.error}`);
      }
    });
  };

  const handleCreateCapital = () => {
    setCapitalFormError("");
    const parsedAmount = parseFloat(capitalAmount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setCapitalFormError("Please enter a valid contribution amount.");
      return;
    }
    if (!capitalDate) {
      setCapitalFormError("Please select a contribution date.");
      return;
    }

    startSavingCapital(async () => {
      const res = await addCapitalEntryAction({
        entryDate: capitalDate,
        amount: parsedAmount,
        description: capitalDesc.trim() || "Owner Capital Contribution",
        paymentMethod: capitalMethod as any,
      });

      if (res.success) {
        toast.success("Capital contribution recorded successfully!");
        setIsCapitalCreateOpen(false);
        setCapitalAmount("");
        setCapitalDate("");
        setCapitalDesc("Owner Capital Contribution");
        setCapitalMethod("BANK");
        loadData();
      } else {
        setCapitalFormError(res.error || "Failed to record capital.");
        toast.error(`Error: ${res.error}`);
      }
    });
  };

  const assetColumns: ColumnDef<FixedAssetRow>[] = [
    {
      accessorKey: "name",
      header: "Asset Name",
      cell: ({ row }) => (
        <span className="font-bold text-zinc-800 dark:text-zinc-200">{row.getValue("name")}</span>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-zinc-50 border text-zinc-600 dark:bg-zinc-900/10 dark:text-zinc-400">
          {row.getValue("category")}
        </span>
      ),
    },
    {
      accessorKey: "purchaseDate",
      header: "Capitalization Date",
      cell: ({ row }) => (
        <span className="text-zinc-500 font-semibold text-xs font-mono">
          {new Date(row.getValue("purchaseDate")).toLocaleDateString("en-IN")}
        </span>
      ),
    },
    {
      accessorKey: "purchasePrice",
      header: "Purchase Cost (NPR)",
      cell: ({ row }) => (
        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
          <NPRAmount amount={Number(row.getValue("purchasePrice"))} showCurrency={false} />
        </span>
      ),
    },
  ];

  const capitalColumns: ColumnDef<any>[] = [
    {
      accessorKey: "entryDate",
      header: "Contribution Date",
      cell: ({ row }) => (
        <span className="text-zinc-500 font-semibold text-xs font-mono">
          {new Date(row.getValue("entryDate")).toLocaleDateString("en-IN")}
        </span>
      ),
    },
    {
      accessorKey: "description",
      header: "Source / Description",
      cell: ({ row }) => (
        <span className="font-bold text-zinc-800 dark:text-zinc-200">{row.getValue("description")}</span>
      ),
    },
    {
      accessorKey: "paymentMethod",
      header: "Payment Method",
      cell: ({ row }) => {
        const method = row.getValue("paymentMethod") as string;
        let badgeStyle = "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300";
        if (method === "CASH") badgeStyle = "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300";
        if (method === "BANK" || method === "CHEQUE") badgeStyle = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
        
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badgeStyle}`}>
            {method}
          </span>
        );
      },
    },
    {
      accessorKey: "amount",
      header: "Amount (NPR)",
      cell: ({ row }) => (
        <span className="font-bold text-emerald-600 dark:text-emerald-400">
          <NPRAmount amount={Number(row.getValue("amount"))} showCurrency={false} />
        </span>
      ),
    },
    {
      accessorKey: "creator.name",
      header: "Recorded By",
      cell: ({ row }) => (
        <span className="text-zinc-500 text-xs font-semibold">{row.original.creator?.name || "System"}</span>
      ),
    },
  ];

  const totalCapital = capitalEntries.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const recentCapital = capitalEntries.length > 0 ? parseFloat(capitalEntries[0].amount) : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title={activeTab === "ASSETS" ? "Capitalized Fixed Assets" : "Owner Capital & Equity"}
          description={
            activeTab === "ASSETS"
              ? "Capitalize and register vehicles, machinery, and equipment to track company assets."
              : "Record owner contributions, seed capital, and financing cash flows to maintain accurate equity reports."
          }
        />
        <div className="flex gap-2 self-start md:self-auto shrink-0">
          {activeTab === "ASSETS" ? (
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white flex gap-1 h-10 px-4 rounded-xl shadow-sm text-xs font-bold"
            >
              <Plus className="h-4 w-4" />
              Capitalize Asset
            </Button>
          ) : (
            <Button
              onClick={() => setIsCapitalCreateOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white flex gap-1 h-10 px-4 rounded-xl shadow-sm text-xs font-bold"
            >
              <Plus className="h-4 w-4" />
              Record Contribution
            </Button>
          )}
        </div>
      </div>

      {/* Tab Switcher (Segmented Control style) */}
      <div className="flex gap-1 border p-1 rounded-xl bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 w-fit">
        <Button
          size="sm"
          variant={activeTab === "ASSETS" ? "default" : "ghost"}
          onClick={() => handleTabChange("ASSETS")}
          className="text-xs h-8 px-4 font-bold rounded-lg"
        >
          <Hammer className="h-3.5 w-3.5 mr-1.5" />
          Fixed Assets Register
        </Button>
        <Button
          size="sm"
          variant={activeTab === "CAPITAL" ? "default" : "ghost"}
          onClick={() => handleTabChange("CAPITAL")}
          className="text-xs h-8 px-4 font-bold rounded-lg"
        >
          <Landmark className="h-3.5 w-3.5 mr-1.5" />
          Capital Contributions
        </Button>
      </div>

      {/* Summary Matrix Cards */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="border border-zinc-100 dark:border-zinc-800 shadow-sm rounded-2xl h-32 animate-pulse bg-zinc-50 dark:bg-zinc-900" />
          ))}
        </div>
      ) : activeTab === "ASSETS" ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
          <Card className="border border-zinc-100 shadow-sm rounded-2xl dark:border-zinc-800 dark:bg-zinc-950 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Capitalized Acquisition Cost</CardTitle>
              <div className="p-2.5 rounded-xl text-blue-500 bg-blue-50 dark:bg-blue-950/20">
                <Hammer className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                <NPRAmount amount={totalCost} />
              </div>
              <p className="text-xs text-zinc-400 font-semibold mt-1">Acquisition value of all capitalized assets</p>
            </CardContent>
          </Card>

          <Card className="border border-zinc-100 shadow-sm rounded-2xl dark:border-zinc-800 dark:bg-zinc-950 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Registered Assets</CardTitle>
              <div className="p-2.5 rounded-xl text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20">
                <Award className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {assets.length} Assets
              </div>
              <p className="text-xs text-zinc-400 font-semibold mt-1">Number of active assets in the registry</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border border-zinc-100 shadow-sm rounded-2xl dark:border-zinc-800 dark:bg-zinc-950 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Capital Injected</CardTitle>
              <div className="p-2.5 rounded-xl text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20">
                <Landmark className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                <NPRAmount amount={totalCapital} />
              </div>
              <p className="text-xs text-zinc-400 font-semibold mt-1">Total financing equity contributions</p>
            </CardContent>
          </Card>

          <Card className="border border-zinc-100 shadow-sm rounded-2xl dark:border-zinc-800 dark:bg-zinc-950 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Recent Capital Addition</CardTitle>
              <div className="p-2.5 rounded-xl text-blue-500 bg-blue-50 dark:bg-blue-950/20">
                <Coins className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                <NPRAmount amount={recentCapital} />
              </div>
              <p className="text-xs text-zinc-400 font-semibold mt-1">Latest registered equity contribution</p>
            </CardContent>
          </Card>

          <Card className="border border-zinc-100 shadow-sm rounded-2xl dark:border-zinc-800 dark:bg-zinc-950 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Contribution Count</CardTitle>
              <div className="p-2.5 rounded-xl text-purple-500 bg-purple-50 dark:bg-purple-950/20">
                <TrendingUp className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
                {capitalEntries.length} Transactions
              </div>
              <p className="text-xs text-zinc-400 font-semibold mt-1">Number of capital deposits recorded</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Registry Sheet */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
        {activeTab === "ASSETS" ? (
          <>
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Equipment & Capitalized Assets Register</h2>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <LoadingSpinner />
              </div>
            ) : (
              <DataTable
                columns={assetColumns}
                data={filteredAssets}
                searchPlaceholder="Search asset name or category..."
                searchColumnId="name"
                search={search}
                onSearchChange={handleSearchChange}
                pagination={{
                  pageIndex: 0,
                  pageSize: 15,
                  pageCount: Math.ceil(filteredAssets.length / 15),
                  totalItems: filteredAssets.length,
                }}
              />
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Owner Capital Contributions Registry</h2>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <LoadingSpinner />
              </div>
            ) : (
              <DataTable
                columns={capitalColumns}
                data={filteredCapital}
                searchPlaceholder="Search description or method..."
                searchColumnId="description"
                search={search}
                onSearchChange={handleSearchChange}
                pagination={{
                  pageIndex: 0,
                  pageSize: 15,
                  pageCount: Math.ceil(filteredCapital.length / 15),
                  totalItems: filteredCapital.length,
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Fixed Asset Capitalization Dialog Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Capitalize Fixed Asset</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold block mb-1">Asset Name / Description *</label>
              <Input
                placeholder="e.g. Waterproofing Chemical Blender, Nabil Cargo Delivery Van..."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold block mb-1">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-zinc-950 dark:border-zinc-800"
                >
                  <option value="Vehicle">Delivery Vehicle</option>
                  <option value="Machinery">Warehouse Machinery</option>
                  <option value="Equipment">Construction Site Equipment</option>
                  <option value="Office Furnitures">Office Furnitures</option>
                  <option value="Computers">IT / Computer Systems</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Acquisition Date *</label>
                <Input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">Capitalized Value (Cost) *</label>
              <Input
                type="number"
                placeholder="Cost in NPR"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                min={1}
              />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">Notes / Additional Info</label>
              <Input
                placeholder="e.g. Serial #12345, located in East Wing, brand name, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {formError && <p className="text-xs font-bold text-red-600 mt-2">{formError}</p>}
          </div>

          <DialogFooter className="mt-6 border-t pt-4">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isCreatingAsset}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateAsset}
              disabled={isCreatingAsset}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isCreatingAsset ? "Saving..." : "Capitalize Asset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Capital Contribution Dialog Modal */}
      <Dialog open={isCapitalCreateOpen} onOpenChange={setIsCapitalCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Owner Capital Contribution</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold block mb-1">Contribution Source / Description *</label>
              <Input
                placeholder="e.g. Initial Seed Funding, Partner Capital Injection..."
                value={capitalDesc}
                onChange={(e) => setCapitalDesc(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold block mb-1">Deposit Date *</label>
                <Input
                  type="date"
                  value={capitalDate}
                  onChange={(e) => setCapitalDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Payment Method *</label>
                <select
                  value={capitalMethod}
                  onChange={(e) => setCapitalMethod(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-zinc-950 dark:border-zinc-800"
                >
                  <option value="BANK">Bank Transfer</option>
                  <option value="CASH">Cash Deposit</option>
                  <option value="CHEQUE">Cheque Clearance</option>
                  <option value="ESEWA">eSewa Wallet</option>
                  <option value="KHALTI">Khalti Wallet</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">Contribution Amount (NPR) *</label>
              <Input
                type="number"
                placeholder="Amount in NPR"
                value={capitalAmount}
                onChange={(e) => setCapitalAmount(e.target.value)}
                min={1}
              />
            </div>

            {capitalFormError && <p className="text-xs font-bold text-red-600 mt-2">{capitalFormError}</p>}
          </div>

          <DialogFooter className="mt-6 border-t pt-4">
            <Button variant="outline" onClick={() => setIsCapitalCreateOpen(false)} disabled={isSavingCapital}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateCapital}
              disabled={isSavingCapital}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSavingCapital ? "Saving..." : "Record Capital"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
