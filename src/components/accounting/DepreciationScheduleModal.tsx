"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchDepreciationScheduleAction } from "@/modules/accounting/actions";
import { NPRAmount } from "@/components/shared/NPRAmount";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { toast } from "sonner";
import { Calendar, Tag, Shield, Percent, TrendingDown } from "lucide-react";

interface DepreciationScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
}

export function DepreciationScheduleModal({ open, onOpenChange, assetId }: DepreciationScheduleModalProps) {
  const [asset, setAsset] = useState<any | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadSchedule = async () => {
      if (!assetId) return;
      setIsLoading(true);
      try {
        const data = await fetchDepreciationScheduleAction(assetId);
        setAsset(data.asset);
        setEntries(data.entries);
      } catch (err: any) {
        toast.error(`Failed to load depreciation schedule: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    if (open && assetId) {
      loadSchedule();
    }
  }, [open, assetId]);

  // Aggregate year-by-year summary for clean reporting
  const getYearlySummary = () => {
    const years: Record<string, { opening: number; depreciation: number; closing: number }> = {};
    
    if (entries.length === 0) return [];

    // Group entries by fiscalYear
    for (const e of entries) {
      const fy = e.fiscalYear;
      const amt = parseFloat(e.amount);
      const before = parseFloat(e.bookValueBefore);
      const after = parseFloat(e.bookValueAfter);

      if (!years[fy]) {
        years[fy] = { opening: before, depreciation: 0, closing: after };
      }
      
      years[fy].depreciation += amt;
      // The closing balance is the closing balance of the latest month in that year
      years[fy].closing = after;
    }

    return Object.entries(years).map(([fy, metrics]) => ({
      fiscalYear: fy,
      opening: metrics.opening,
      depreciation: metrics.depreciation,
      closing: metrics.closing,
    }));
  };

  const yearlyData = getYearlySummary();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] max-w-[98vw] h-[95vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-rose-500" />
            <span>Depreciation Register & Value Projections</span>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : asset ? (
          <div className="flex-1 overflow-y-auto space-y-6 pt-2">
            {/* Asset Metadata Header */}
            <div className="bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 p-4 rounded-xl grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Asset Name</p>
                <p className="font-bold text-sm text-zinc-800 dark:text-zinc-100 truncate">{asset.name}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Category</p>
                <p className="font-semibold text-sm text-zinc-700 dark:text-zinc-300 truncate">{asset.category}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Purchase Date</p>
                <p className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">
                  {new Date(asset.purchaseDate).toLocaleDateString("en-IN")}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Depreciation Method</p>
                <p className="font-bold text-xs text-blue-600 dark:text-blue-400 tracking-wider">
                  {asset.depreciationMethod === "STRAIGHT_LINE" ? "STRAIGHT LINE" : "DECLINING BALANCE"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Remaining Book Value</p>
                <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                  <NPRAmount amount={Number(asset.currentValue)} />
                </p>
              </div>
            </div>

            {/* Value Reduction Visual Progress Bar */}
            <div className="border dark:border-zinc-800 p-4 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-zinc-500">
                <span>Original Purchase: <NPRAmount amount={Number(asset.purchasePrice)} /></span>
                <span>Depreciated Value: <NPRAmount amount={Number(asset.currentValue)} /></span>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-3.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, (Number(asset.currentValue) / Number(asset.purchasePrice)) * 100)
                    )}%`,
                  }}
                />
              </div>
              <div className="text-[10px] text-zinc-400 font-semibold text-right">
                Remaining useful life: {asset.usefulLifeYears} Years (approx)
              </div>
            </div>

            {/* Year-by-Year Summary */}
            <div>
              <h3 className="text-xs uppercase font-bold tracking-wider text-zinc-400 mb-2">Yearly Depreciation Summary</h3>
              <div className="border dark:border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-zinc-50 dark:bg-zinc-900 border-b dark:border-zinc-800">
                    <tr>
                      <th className="p-3 font-bold text-zinc-500">Fiscal Year</th>
                      <th className="p-3 font-bold text-zinc-500 text-right">Opening Book Value</th>
                      <th className="p-3 font-bold text-zinc-500 text-right">Yearly Depreciation</th>
                      <th className="p-3 font-bold text-zinc-500 text-right">Ending Book Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearlyData.map((y, idx) => (
                      <tr key={idx} className="border-b dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                        <td className="p-3 font-bold text-zinc-700 dark:text-zinc-300">{y.fiscalYear}</td>
                        <td className="p-3 text-right font-semibold text-zinc-600 dark:text-zinc-400">
                          <NPRAmount amount={y.opening} />
                        </td>
                        <td className="p-3 text-right font-semibold text-rose-600 dark:text-rose-400">
                          <NPRAmount amount={y.depreciation} />
                        </td>
                        <td className="p-3 text-right font-bold text-zinc-800 dark:text-zinc-200">
                          <NPRAmount amount={y.closing} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Chronological Month-by-Month log */}
            <div>
              <h3 className="text-xs uppercase font-bold tracking-wider text-zinc-400 mb-2">Chronological Monthly Ledger & Projections</h3>
              <div className="border dark:border-zinc-800 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-zinc-50 dark:bg-zinc-900 border-b dark:border-zinc-800 sticky top-0 z-10">
                    <tr>
                      <th className="p-3 font-bold text-zinc-500">Nepali Period</th>
                      <th className="p-3 font-bold text-zinc-500">Method Status</th>
                      <th className="p-3 font-bold text-zinc-500 text-right">Valuation Prior</th>
                      <th className="p-3 font-bold text-zinc-500 text-right">Depreciation</th>
                      <th className="p-3 font-bold text-zinc-500 text-right">Valuation After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, idx) => {
                      const isProjected = e.type === "PROJECTED";
                      return (
                        <tr key={idx} className={`border-b dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 ${isProjected ? "text-zinc-400 italic" : ""}`}>
                          <td className="p-3 font-medium">
                            Month {e.month} ({e.fiscalYear})
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold tracking-wider border ${
                              isProjected
                                ? "bg-zinc-50 text-zinc-500 border-zinc-200 dark:bg-zinc-900/10 dark:text-zinc-400"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400"
                            }`}>
                              {isProjected ? "PROJECTED" : "POSTED (ACTUAL)"}
                            </span>
                          </td>
                          <td className="p-3 text-right font-semibold">
                            <NPRAmount amount={Number(e.bookValueBefore)} />
                          </td>
                          <td className="p-3 text-right font-semibold text-rose-600 dark:text-rose-400">
                            <NPRAmount amount={Number(e.amount)} />
                          </td>
                          <td className="p-3 text-right font-bold">
                            <NPRAmount amount={Number(e.bookValueAfter)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-zinc-400">Asset not found.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
