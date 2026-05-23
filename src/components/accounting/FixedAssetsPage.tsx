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
  runDepreciationAction,
  createFixedAssetAction,
} from "@/modules/accounting/actions";
import { DepreciationScheduleModal } from "./DepreciationScheduleModal";
import { ColumnDef } from "@tanstack/react-table";
import { Award, Calendar, ChevronRight, Eye, Hammer, HeartPulse, Plus, RefreshCw, Sparkles, TrendingDown } from "lucide-react";
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
  const [assets, setAssets] = useState<FixedAssetRow[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<FixedAssetRow[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Totals Summary
  const [totals, setTotals] = useState({
    cost: 0,
    depreciated: 0,
    bookValue: 0,
  });

  // Modal States
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  // Re-run batch depreciation transitions
  const [isDepreciating, startDepreciating] = useTransition();
  const [isCreatingAsset, startCreatingAsset] = useTransition();

  // Create Asset Form States
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Vehicle");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [usefulLifeYears, setUsefulLifeYears] = useState("5");
  const [depreciationMethod, setDepreciationMethod] = useState<"STRAIGHT_LINE" | "DECLINING_BALANCE">("STRAIGHT_LINE");
  const [formError, setFormError] = useState("");

  const loadAssets = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAssetRegisterAction();
      setAssets(data as any[]);
      applyFilter(data as any[], search);

      // Compute summaries
      let totalCost = 0;
      let totalDep = 0;
      let totalBook = 0;
      for (const a of data) {
        totalCost += parseFloat(a.purchasePrice);
        totalDep += parseFloat(a.accumulatedDepreciation);
        totalBook += parseFloat(a.currentValue);
      }
      setTotals({ cost: totalCost, depreciated: totalDep, bookValue: totalBook });
    } catch (err: any) {
      toast.error(`Failed to load asset register: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const applyFilter = (data: FixedAssetRow[], query: string) => {
    let result = data;
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (a) => a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
      );
    }
    setFilteredAssets(result);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    applyFilter(assets, val);
  };

  const openSchedule = (id: string) => {
    setSelectedAssetId(id);
    setIsScheduleOpen(true);
  };

  const handleRunDepreciation = () => {
    startDepreciating(async () => {
      try {
        const res = await runDepreciationAction();
        if (res.success) {
          if (res.count && res.count > 0) {
            toast.success(`Successfully recorded monthly depreciation for ${res.count} active assets!`);
          } else {
            toast.info("Depreciation is already posted and up to date for this month.");
          }
          loadAssets();
        } else {
          toast.error(`Batch depreciation failed: ${res.error}`);
        }
      } catch (err: any) {
        toast.error(`Error: ${err.message}`);
      }
    });
  };

  const handleCreateAsset = () => {
    setFormError("");
    const parsedPrice = parseFloat(purchasePrice);
    const parsedLife = parseInt(usefulLifeYears);

    if (!name.trim()) {
      setFormError("Asset name is required.");
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setFormError("Please enter a valid purchase price.");
      return;
    }
    if (isNaN(parsedLife) || parsedLife <= 0) {
      setFormError("Useful life must be a positive number of years.");
      return;
    }
    if (!purchaseDate) {
      setFormError("Please select a purchase date.");
      return;
    }

    startCreatingAsset(async () => {
      const res = await createFixedAssetAction({
        name,
        category,
        purchaseDate,
        purchasePrice: parsedPrice,
        usefulLifeYears: parsedLife,
        depreciationMethod,
      });

      if (res.success) {
        toast.success("Fixed Asset capitalized successfully!");
        setIsCreateOpen(false);
        loadAssets();
      } else {
        setFormError(res.error || "Failed to capitalize asset.");
        toast.error(`Error: ${res.error}`);
      }
    });
  };

  const columns: ColumnDef<FixedAssetRow>[] = [
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
        <span className="text-zinc-500 font-semibold text-xs">
          {new Date(row.getValue("purchaseDate")).toLocaleDateString("en-IN")}
        </span>
      ),
    },
    {
      accessorKey: "purchasePrice",
      header: "Purchase Cost (NPR)",
      cell: ({ row }) => (
        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
          <NPRAmount amount={Number(row.getValue("purchasePrice"))} />
        </span>
      ),
    },
    {
      accessorKey: "depreciationMethod",
      header: "Method",
      cell: ({ row }) => {
        const method = row.getValue("depreciationMethod") as string;
        return (
          <span className="font-bold text-[10px] text-blue-600 dark:text-blue-400 uppercase">
            {method === "STRAIGHT_LINE" ? "Straight Line" : "DDB (Declining)"}
          </span>
        );
      },
    },
    {
      accessorKey: "accumulatedDepreciation",
      header: "Accumulated Dep.",
      cell: ({ row }) => (
        <span className="font-semibold text-rose-600 dark:text-rose-400">
          <NPRAmount amount={Number(row.getValue("accumulatedDepreciation"))} />
        </span>
      ),
    },
    {
      accessorKey: "currentValue",
      header: "Net Book Value (NPR)",
      cell: ({ row }) => (
        <span className="font-bold text-emerald-600 dark:text-emerald-400">
          <NPRAmount amount={Number(row.getValue("currentValue"))} />
        </span>
      ),
    },
    {
      id: "actions",
      header: "Schedule",
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => openSchedule(row.original.id)}
          className="text-xs h-7 flex gap-1 border-blue-200 text-blue-700 hover:bg-blue-50"
        >
          <Eye className="h-3.5 w-3.5" />
          Schedule
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Fixed Assets & Capitalization"
          description="Capitalize vehicles, office machinery, waterproofing equipment, and run automatic monthly depreciation schedules."
        />
        <div className="flex gap-2 self-start md:self-auto shrink-0">
          <Button
            variant="outline"
            onClick={handleRunDepreciation}
            disabled={isDepreciating || isLoading}
            className="border-rose-200 text-rose-700 hover:bg-rose-50 flex gap-1 h-10 px-4 rounded-xl text-xs font-bold shadow-sm"
          >
            <TrendingDown className="h-4 w-4" />
            {isDepreciating ? "Posting..." : "Run Monthly Depreciation"}
          </Button>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white flex gap-1 h-10 px-4 rounded-xl shadow-sm text-xs font-bold"
          >
            <Plus className="h-4 w-4" />
            Capitalize Asset
          </Button>
        </div>
      </div>

      {/* Asset Summary KPI Cards */}
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
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Capitalized Acquisition Cost</CardTitle>
              <div className="p-2.5 rounded-xl text-blue-500 bg-blue-50 dark:bg-blue-950/20">
                <Hammer className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                <NPRAmount amount={totals.cost} />
              </div>
              <p className="text-xs text-zinc-400 font-semibold mt-1">Acquisition value of all capitalized assets</p>
            </CardContent>
          </Card>

          <Card className="border border-zinc-100 shadow-sm rounded-2xl dark:border-zinc-800 dark:bg-zinc-950 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Accumulated Depreciation</CardTitle>
              <div className="p-2.5 rounded-xl text-rose-500 bg-rose-50 dark:bg-rose-950/20">
                <TrendingDown className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                <NPRAmount amount={totals.depreciated} />
              </div>
              <p className="text-xs text-zinc-400 font-semibold mt-1">Accumulated month-by-month book reductions</p>
            </CardContent>
          </Card>

          <Card className="border border-zinc-100 shadow-sm rounded-2xl dark:border-zinc-800 dark:bg-zinc-950 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Net Book Value (Asset Registry)</CardTitle>
              <div className="p-2.5 rounded-xl text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20">
                <Award className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                <NPRAmount amount={totals.bookValue} />
              </div>
              <p className="text-xs text-zinc-400 font-semibold mt-1">Net depreciated book value in balance sheet</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Asset Register Table */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
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
            columns={columns}
            data={filteredAssets}
            searchPlaceholder="Search asset name or category..."
            searchColumnId="name"
            pagination={{
              pageIndex: 0,
              pageSize: 15,
              pageCount: Math.ceil(filteredAssets.length / 15),
              totalItems: filteredAssets.length,
            }}
          />
        )}
      </div>

      {/* Capitalization Dialog Modal */}
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
                <label className="text-xs font-semibold block mb-1">Category Category *</label>
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

            <div className="grid grid-cols-2 gap-4">
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
                <label className="text-xs font-semibold block mb-1">Useful Life (Years) *</label>
                <Input
                  type="number"
                  placeholder="e.g. 5"
                  value={usefulLifeYears}
                  onChange={(e) => setUsefulLifeYears(e.target.value)}
                  min={1}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">Depreciation Calculation Method *</label>
              <select
                value={depreciationMethod}
                onChange={(e) => setDepreciationMethod(e.target.value as any)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-zinc-950 dark:border-zinc-800"
              >
                <option value="STRAIGHT_LINE">Straight Line Method</option>
                <option value="DECLINING_BALANCE">Double Declining Balance Method</option>
              </select>
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

      {/* Depreciation Schedule modal */}
      {selectedAssetId && (
        <DepreciationScheduleModal
          open={isScheduleOpen}
          onOpenChange={setIsScheduleOpen}
          assetId={selectedAssetId}
        />
      )}
    </div>
  );
}
