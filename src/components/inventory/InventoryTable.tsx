"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../shared/DataTable";
import { Badge } from "../ui/badge";
import type { InventoryItemSchema } from "@/modules/inventory/types";
import { Button } from "../ui/button";
import AdjustStockModal from "./AdjustStockModal";
import { useState } from "react";
import PaginationControls from './InventoryTableControls';

interface InventoryTableProps {
  items: InventoryItemSchema[];
}

export function InventoryTable({ items }: InventoryTableProps) {
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);

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
      cell: ({ row }) => row.original.brand ?? "—",
    },
    {
      accessorKey: "warehouse",
      header: "Warehouse",
    },
    {
      accessorKey: "quantity",
      header: "Available",
      cell: ({ row }) => <span className="font-semibold">{row.original.quantity}</span>,
    },
    {
      accessorKey: "reservedQty",
      header: "Reserved",
      cell: ({ row }) => row.original.reservedQty,
    },
    {
      accessorKey: "reorderLevel",
      header: "Reorder Level",
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
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setSelectedStockId(row.original.id)}>
            Adjust
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
    </>
  );
}
