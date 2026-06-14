"use client";

import React, { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Download, ChevronLeft, ChevronRight, Search } from "lucide-react";

interface PaginationInfo {
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  totalItems: number;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  pagination?: PaginationInfo;
  onPageChange?: (pageIndex: number) => void;
  onExport?: () => void;
  searchPlaceholder?: string;
  searchColumnId?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  pagination,
  onPageChange,
  onExport,
  searchPlaceholder = "Search...",
  searchColumnId,
  searchValue,
  onSearchChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (onSearchChange) {
      onSearchChange(value);
    } else if (searchColumnId) {
      table.getColumn(searchColumnId)?.setFilterValue(value);
    } else {
      setGlobalFilter(value);
    }
  };

  const currentSearchValue = onSearchChange
    ? searchValue ?? ""
    : searchColumnId
    ? (table.getColumn(searchColumnId)?.getFilterValue() as string) ?? ""
    : globalFilter;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder={searchPlaceholder}
            value={currentSearchValue}
            onChange={handleSearchChange}
            className="pl-9 h-10 w-full bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-xl"
          />
        </div>
        {onExport && (
          <Button
            onClick={onExport}
            variant="outline"
            className="w-full sm:w-auto h-10 border-zinc-200 text-zinc-700 hover:bg-zinc-50 flex items-center justify-center gap-2 rounded-xl dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden dark:border-zinc-800 dark:bg-zinc-950">
        <Table>
          <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/30">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-zinc-100 dark:border-zinc-800">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-zinc-500 font-semibold h-12 text-sm dark:text-zinc-400">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Skeleton Loading State
              Array.from({ length: pagination?.pageSize || 5 }).map((_, index) => (
                <TableRow key={index} className="border-zinc-100 dark:border-zinc-800">
                  {columns.map((col, cIndex) => (
                    <TableCell key={cIndex} className="py-4">
                      <div className="h-4 bg-zinc-100 rounded animate-pulse w-full max-w-[120px] dark:bg-zinc-800" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-zinc-50/40 border-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900/10"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3.5 text-zinc-700 dark:text-zinc-300">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-zinc-400 font-medium"
                >
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {pagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Showing Page {pagination.pageIndex + 1} of {Math.max(1, pagination.pageCount)} (Total {pagination.totalItems} records)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.pageIndex - 1)}
              disabled={pagination.pageIndex === 0 || isLoading}
              className="h-9 w-9 p-0 border-zinc-200 dark:border-zinc-800 rounded-lg"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.pageIndex + 1)}
              disabled={
                pagination.pageIndex >= pagination.pageCount - 1 || isLoading
              }
              className="h-9 w-9 p-0 border-zinc-200 dark:border-zinc-800 rounded-lg"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
export default DataTable;
