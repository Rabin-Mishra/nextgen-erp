"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { toast } from "sonner";
import { deleteBrand, updateBrand } from "@/modules/inventory/actions";
import { Pencil, Trash2, Plus, Search, Award, AlertTriangle, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import BrandModal from "./BrandModal";

interface BrandData {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  _count: {
    products: number;
  };
}

interface BrandsTabProps {
  initialBrands: BrandData[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  searchQuery: string;
}

export function BrandsTab({ initialBrands, pagination, searchQuery }: BrandsTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [brands, setBrands] = useState<BrandData[]>(initialBrands);
  const [search, setSearch] = useState(searchQuery);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<BrandData | null>(null);

  // Deletion confirmation state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<BrandData | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Sync prop changes to state
  useEffect(() => {
    setBrands(initialBrands);
  }, [initialBrands]);

  useEffect(() => {
    setSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const urlSearch = searchParams.get("search") ?? "";
    if (search === urlSearch) {
      return;
    }

    const timer = setTimeout(() => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      if (search) {
        current.set("search", search);
      } else {
        current.delete("search");
      }
      current.set("page", "1"); // reset to page 1 on search
      router.push(`${pathname}?${current.toString()}`);
    }, 350);

    return () => clearTimeout(timer);
  }, [search, pathname, router, searchParams]);

  const handlePageChange = (newPage: number) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set("page", String(newPage));
    router.push(`${pathname}?${current.toString()}`);
  };

  const pageCount = Math.ceil(pagination.total / pagination.pageSize);

  // Refresh data by reloading router
  const handleSuccess = async () => {
    router.refresh();
  };

  // Toggle brand activation state
  const handleToggleActive = async (brand: BrandData) => {
    const originalState = brand.isActive;
    const nextState = !originalState;

    // Optimistic UI update
    setBrands((prev) =>
      prev.map((b) => (b.id === brand.id ? { ...b, isActive: nextState } : b))
    );

    try {
      await updateBrand(brand.id, { isActive: nextState });
      toast.success(
        `Brand "${brand.name}" has been ${nextState ? "activated" : "deactivated"} successfully.`
      );
    } catch (err: any) {
      // Revert optimistic update
      setBrands((prev) =>
        prev.map((b) => (b.id === brand.id ? { ...b, isActive: originalState } : b))
      );
      toast.error(err.message || "Failed to update brand status.");
    }
  };

  // Click delete action
  const handleDeleteClick = (brand: BrandData) => {
    const productsCount = brand._count.products;
    if (productsCount > 0) {
      toast.error(`Cannot delete. ${productsCount} products are assigned to this brand.`);
      return;
    }
    setBrandToDelete(brand);
    setIsDeleteOpen(true);
  };

  // Confirm and execute deletion
  const handleConfirmDelete = async () => {
    if (!brandToDelete) return;
    try {
      setDeleteLoading(true);
      await deleteBrand(brandToDelete.id);
      toast.success(`Brand "${brandToDelete.name}" successfully deleted.`);
      setIsDeleteOpen(false);
      setBrandToDelete(null);
      handleSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete brand.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Render server-side filtered brands directly
  const filteredBrands = brands;

  return (
    <div className="space-y-4">
      {/* Filters & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-400" />
          <Input
            placeholder="Search brands..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl border-zinc-200 dark:border-zinc-800"
          />
        </div>
        <Button
          onClick={() => {
            setSelectedBrand(null);
            setIsModalOpen(true);
          }}
          className="h-10 px-4 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-primary/20"
        >
          <Plus className="h-4.5 w-4.5" />
          Add Brand
        </Button>
      </div>

      {/* Table Section */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-900/50">
              <TableHead className="font-bold text-zinc-600 dark:text-zinc-400">Name</TableHead>
              <TableHead className="font-bold text-zinc-600 dark:text-zinc-400">Description</TableHead>
              <TableHead className="font-bold text-zinc-600 dark:text-zinc-400 text-center">Products Count</TableHead>
              <TableHead className="font-bold text-zinc-600 dark:text-zinc-400 text-center">Status</TableHead>
              <TableHead className="font-bold text-zinc-600 dark:text-zinc-400 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBrands.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-zinc-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Award className="h-8 w-8 text-zinc-300" />
                    <span>No brands found. Create a new manufacturer brand to get started.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredBrands.map((b) => (
                <TableRow key={b.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                  {/* Brand Name */}
                  <TableCell className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {b.name}
                  </TableCell>

                  {/* Description */}
                  <TableCell className="text-zinc-500 dark:text-zinc-400 max-w-[320px] truncate">
                    {b.description || <span className="italic text-zinc-300">No description provided</span>}
                  </TableCell>

                  {/* Products Count */}
                  <TableCell className="text-center font-bold text-zinc-700 dark:text-zinc-300">
                    <Badge variant="secondary" className="px-2 py-0.5 rounded-md font-semibold">
                      {b._count.products} products
                    </Badge>
                  </TableCell>

                  {/* Status & Custom Toggle switch */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-3">
                      <Badge variant={b.isActive ? "default" : "secondary"} className="h-5">
                        {b.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(b)}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          b.isActive ? "bg-emerald-500" : "bg-zinc-250 dark:bg-zinc-800"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            b.isActive ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </TableCell>

                  {/* Actions Column */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedBrand(b);
                          setIsModalOpen(true);
                        }}
                        className="h-8 w-8 rounded-lg text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(b)}
                        className="h-8 w-8 rounded-lg text-zinc-400 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 border-t border-zinc-150 dark:border-zinc-850 mt-4">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Showing Page {pagination.page} of {Math.max(1, pageCount)} (Total {pagination.total} records)
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="h-9 w-9 p-0 border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= pageCount}
            className="h-9 w-9 p-0 border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Unified Add/Edit Brand Modal */}
      <BrandModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedBrand(null);
        }}
        onSuccess={handleSuccess}
        brand={selectedBrand}
      />

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={(val) => !val && setIsDeleteOpen(false)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500 animate-pulse" />
              Delete Brand
            </DialogTitle>
            <p className="text-xs text-zinc-400 mt-1">
              Verify database record removal. This action is permanent.
            </p>
          </DialogHeader>

          <div className="py-4 text-sm text-zinc-600 dark:text-zinc-400">
            Are you sure you want to delete brand <strong className="text-zinc-950 dark:text-zinc-50">"{brandToDelete?.name}"</strong>? This will permanently erase the brand from the database.
          </div>

          <DialogFooter className="pt-4 border-t border-zinc-100 dark:border-zinc-900">
            <div className="flex items-center gap-2 justify-end w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteOpen(false)}
                className="h-10 px-4 rounded-xl text-zinc-600 font-bold border-zinc-200 dark:border-zinc-800"
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                className="h-10 px-5 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2 shadow-md shadow-rose-600/20 border-0"
                disabled={deleteLoading}
              >
                {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Delete
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BrandsTab;
