"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import Link from "next/link";
import { formatRs } from "@/lib/utils";

interface Vendor {
  id: string;
  name: string;
  payable: string;
}

interface VendorOverviewWidgetProps {
  vendors: Vendor[];
}

export function VendorOverviewWidget({ vendors }: VendorOverviewWidgetProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg shadow-sm font-sans flex flex-col h-[350px]">
      <CardHeader className="flex flex-row items-center justify-between p-5 pb-0">
        <CardTitle className="text-base font-bold text-zinc-800 dark:text-zinc-100">
          Vendor Overview
        </CardTitle>
        <Link
          href="/purchase"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
        >
          View All
        </Link>
      </CardHeader>

      <CardContent className="p-5 flex flex-col flex-1 overflow-hidden space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 border-zinc-200 dark:border-zinc-800 rounded-md focus-visible:ring-1 focus-visible:ring-blue-500 text-sm"
          />
        </div>

        {/* Scrollable Table Area */}
        <div className="flex-1 overflow-y-auto border border-zinc-100 dark:border-zinc-800 rounded-lg">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                <th className="p-3">NAME</th>
                <th className="p-3 text-right">PAYABLE</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.length > 0 ? (
                filteredVendors.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-zinc-100 dark:border-zinc-800 last:border-none hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="p-3 font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                      <Link href={`/purchase?supplierId=${v.id}`}>{v.name}</Link>
                    </td>
                    <td className="p-3 text-right text-red-600 dark:text-red-400 font-bold whitespace-nowrap">
                      {formatRs(Number(v.payable))}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="p-6 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                    No active supplier payables.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
