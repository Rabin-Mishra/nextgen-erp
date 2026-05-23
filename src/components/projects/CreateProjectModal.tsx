"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createProjectSchema, updateProjectSchema } from "@/modules/projects/types";
import { createProject, updateProject } from "@/modules/projects/actions";
import { toast } from "sonner";

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Array<{ id: string; name: string; code: string; customerType: string }>;
  project?: any | null; // Optional project to enable editing
}

export function CreateProjectModal({ open, onOpenChange, clients, project = null }: CreateProjectModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [contractAmount, setContractAmount] = useState(0);
  const [budgetAmount, setBudgetAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("PLANNING");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  // Pre-fill form if editing
  useEffect(() => {
    if (project) {
      setName(project.projectName || project.name || "");
      setClientId(project.clientId || "");
      setDescription(project.description || "");
      setStartDate(project.startDate ? project.startDate.split("T")[0] : "");
      setEndDate(project.endDate ? project.endDate.split("T")[0] : "");
      setContractAmount(Number(project.contractAmount) || 0);
      setBudgetAmount(Number(project.budgetAmount) || Number(project.contractAmount) || 0);
      setNotes(project.notes || "");
      setStatus(project.status || "PLANNING");
    } else {
      setName("");
      setClientId("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setContractAmount(0);
      setBudgetAmount(0);
      setNotes("");
      setStatus("PLANNING");
    }
  }, [project, open]);

  const handleSubmit = () => {
    setError("");

    const payload = {
      name,
      clientId,
      description: description || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      contractAmount: Number(contractAmount),
      budgetAmount: budgetAmount > 0 ? Number(budgetAmount) : Number(contractAmount),
      notes: notes || undefined,
      status: project ? status : "PLANNING",
    };

    // Client-side Zod validation
    const schema = project ? updateProjectSchema : createProjectSchema;
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const errorMsg = Object.entries(fieldErrors)
        .map(([field, errs]) => `${field}: ${errs?.join(", ")}`)
        .join(" | ") || "Validation failed.";
      setError(errorMsg);
      toast.error(`Validation Failed: ${errorMsg}`);
      return;
    }

    startTransition(async () => {
      try {
        if (project) {
          await updateProject(project.projectId || project.id, parsed.data as any);
          toast.success("Project contract updated successfully!");
        } else {
          await createProject(parsed.data as any);
          toast.success("Project contract created successfully!");
        }
        onOpenChange(false);
        router.refresh();
      } catch (err: any) {
        const errMsg = err.message || "Failed to save project.";
        setError(errMsg);
        toast.error(`Error: ${errMsg}`);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? `Edit Project — ${project.projectCode}` : "Create Construction Project"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium block mb-1">Project Name *</label>
            <Input
              placeholder="e.g. Hotel Renovation Waterproofing, Gaudadaha Road Concrete..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Client / Customer *</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-zinc-950"
              >
                <option value="">-- Select Client --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.customerType})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Contract Value (NPR) *</label>
              <Input
                type="number"
                placeholder="Contract value amount"
                value={contractAmount}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setContractAmount(val);
                  if (budgetAmount === 0 || budgetAmount === contractAmount) {
                    setBudgetAmount(val);
                  }
                }}
                min={0}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Start Date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Target End Date</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Internal Site Budget (NPR)</label>
              <Input
                type="number"
                placeholder="Internal cost budget"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(parseFloat(e.target.value) || 0)}
                min={0}
              />
            </div>
            {project && (
              <div>
                <label className="text-sm font-medium block mb-1">Status *</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-zinc-950"
                >
                  <option value="PLANNING">Planning</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Scope / Description</label>
            <Input
              placeholder="Waterproofing chemical specs, concrete volume targets, billing timeline details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Additional Terms / Notes</label>
            <Input
              placeholder="e.g. Phased billing milestone details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600 font-semibold">{error}</p>}
        </div>

        <DialogFooter className="mt-4 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
            {isPending ? "Saving..." : "Save Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
