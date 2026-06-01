"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../shared/DataTable";
import { Badge } from "../ui/badge";
import type { InventoryItemSchema } from "@/modules/inventory/types";
import { Button } from "../ui/button";
import AdjustStockModal from "./AdjustStockModal";
import EditProductModal from "./EditProductModal";
import { useState } from "react";
import PaginationControls from './InventoryTableControls';

interface InventoryTableProps {
  items: InventoryItemSchema[];
}

export function InventoryTable({ items }: InventoryTableProps) {
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const columns: ColumnDef<InventoryItemSchema, any>[] = [
    {
      accessorKey: "productCode",
      header: "Product",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{`${row.original.productCode} · ${row.original.name}`}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{row.original.category ?? "Uncategorized"}</div>
        </div>
      ),
    },
    {
      accessorKey: "brand",
      header: "Brand",
      cell: ({ row }) => (
        <span className="font-bold text-zinc-950 dark:text-zinc-50">
          {row.original.brand ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "warehouse",
      header: "Warehouse",
    },
    {
      accessorKey: "quantity",
      header: "Available",
      cell: ({ row }) => (
        <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
          {row.original.quantity}
        </span>
      ),
    },
    {
      accessorKey: "reservedQty",
      header: "Reserved",
      cell: ({ row }) => (
        <span className="font-bold font-mono text-amber-600 dark:text-amber-500">
          {row.original.reservedQty}
        </span>
      ),
    },
    {
      accessorKey: "reorderLevel",
      header: "Reorder Level",
      cell: ({ row }) => (
        <span className="font-bold font-mono text-rose-500 dark:text-rose-400">
          {row.original.reorderLevel}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.status === "reorder" ? "destructive" : "secondary"}>
          {row.original.status === "reorder" ? "Reorder" : "Healthy"}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => setSelectedStockId(row.original.id)} className="h-8 px-2.5 rounded-lg text-zinc-600 hover:text-zinc-950 font-bold border border-zinc-150">
            Adjust
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedProductId(row.original.productId)} className="h-8 px-2.5 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 font-bold border border-amber-200">
            Edit
          </Button>
        </div>
      ),
    },
    {
      accessorKey: "lastUpdated",
      header: "Last Updated",
      cell: ({ row }) => <span className="text-sm text-zinc-500 dark:text-zinc-400">{new Date(row.original.lastUpdated).toLocaleString()}</span>,
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={items}
        searchPlaceholder="Search products, brands, warehouses..."
        searchColumnId="productCode"
      />

      <div className="flex items-center justify-between mt-4">
        <div />
        <div className="flex items-center gap-2">
          <a className="btn" href="/api/inventory/export">Export CSV</a>
        </div>
      </div>

      {selectedStockId && (
        <AdjustStockModal initialStockId={selectedStockId} stocks={items} open={true} onOpenChange={(o) => { if (!o) setSelectedStockId(null); }} />
      )}

      {selectedProductId && (
        <EditProductModal productId={selectedProductId} open={true} onOpenChange={(o) => { if (!o) setSelectedProductId(null); }} />
      )}
    </>
  );
}
