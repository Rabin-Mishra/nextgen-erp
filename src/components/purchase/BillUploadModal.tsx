"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadBill } from "@/modules/purchase/actions";

interface BillUploadModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  poNumber?: string;
  purchaseOrderId: string;
  existingBillUrl?: string | null;
  userId: string;
}

export function BillUploadModal({
  open: openProp,
  onOpenChange,
  poNumber = "",
  purchaseOrderId,
  existingBillUrl = null,
  userId,
}: BillUploadModalProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(existingBillUrl);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const open = openProp !== undefined ? openProp : internalOpen;
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    else setInternalOpen(v);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      alert("Please upload a PDF or image file");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!preview) {
      alert("Please select a file");
      return;
    }

    setUploading(true);
    try {
      // Store the base64/mock data URL onto the purchase order
      await uploadBill(
        {
          purchaseOrderId,
          billImageUrl: preview,
        },
        userId
      );

      alert("Supplier bill attached successfully!");
      setOpen(false);
      setPreview(null);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      alert("Error: " + (err.message || "Failed to attach bill"));
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files[0]) {
      const fakeEvent = {
        target: { files },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(fakeEvent);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Bill — PO: <span className="font-mono text-zinc-600">{poNumber}</span></DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drag & Drop Area or Preview */}
          {preview ? (
            <div className="bg-zinc-100 dark:bg-zinc-900 rounded-lg p-4">
              {preview.startsWith("data:image") || preview.startsWith("http") || preview.startsWith("/") ? (
                <img src={preview} alt="Bill preview" className="w-full max-h-64 object-contain" />
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-zinc-600 font-semibold">Document Attached</p>
                  <p className="font-mono text-xs mt-2 text-zinc-500">PDF / Document File Attached</p>
                </div>
              )}
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-8 text-center cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition"
            >
              <p className="font-semibold mb-2">Drag & drop your bill here</p>
              <p className="text-sm text-zinc-500">or click to select a file</p>
              <p className="text-xs text-zinc-400 mt-2">PDF or image (JPG, PNG)</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="hidden"
          />

          {preview && (
            <Button
              variant="outline"
              onClick={() => {
                setPreview(null);
                fileInputRef.current?.click();
              }}
            >
              Change File
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!preview || uploading}>
            {uploading ? "Saving..." : "Save Bill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

