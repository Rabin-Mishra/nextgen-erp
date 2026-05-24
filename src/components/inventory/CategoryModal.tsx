"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { createCategory, updateCategory } from "@/modules/inventory/actions";
import { toast } from "sonner";
import { FolderPlus, Loader2, Edit3 } from "lucide-react";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  category?: {
    id: string;
    name: string;
    description: string | null;
  } | null;
}

export function CategoryModal({ isOpen, onClose, onSuccess, category }: CategoryModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const isEdit = !!category;

  // Initialize fields on open or change
  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description || "");
    } else {
      setName("");
      setDescription("");
    }
  }, [category, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a category name.");
      return;
    }

    try {
      setLoading(true);
      if (isEdit && category) {
        await updateCategory(category.id, {
          name: name.trim(),
          description: description.trim() || null,
        });
        toast.success("Category successfully updated.");
      } else {
        await createCategory({
          name: name.trim(),
          description: description.trim() || null,
        });
        toast.success("Category successfully created.");
      }
      onSuccess();
      handleClose();
    } catch (err: any) {
      toast.error(err.message || `Failed to ${isEdit ? "update" : "create"} category.`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent className="max-w-md rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            {isEdit ? (
              <>
                <Edit3 className="h-5 w-5 text-primary" />
                Edit Category
              </>
            ) : (
              <>
                <FolderPlus className="h-5 w-5 text-primary" />
                Add Category
              </>
            )}
          </DialogTitle>
          <p className="text-xs text-zinc-400 mt-1">
            {isEdit
              ? "Update category details and descriptions."
              : "Define a new product classification category."}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
              Category Name *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Interior Primers"
              className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
              Description (Optional)
            </Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a brief description of the category..."
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-transparent text-zinc-900 dark:text-zinc-50 min-h-[90px]"
              disabled={loading}
            />
          </div>

          <DialogFooter className="pt-4 border-t border-zinc-100 dark:border-zinc-900">
            <div className="flex items-center gap-2 justify-end w-full">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="h-10 px-4 rounded-xl text-zinc-600 font-bold border-zinc-200 dark:border-zinc-800"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-5 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-primary/20"
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? "Save Changes" : "Create Category"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CategoryModal;
