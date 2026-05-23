"use client";

import React, { useState } from "react";
import { PageHeader } from "../layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { StatusBadge } from "../shared/StatusBadge";
import {
  saveBusinessInfoAction,
  saveInvoiceSettingsAction,
  createWarehouseAction,
  updateWarehouseAction,
  createFiscalYearAction,
  toggleFiscalYearStatusAction,
  exportAllDataAction
} from "../../modules/settings/actions";
import { SystemSettings, BusinessInfo, InvoiceSettings } from "../../lib/settings-store";
import { toast } from "sonner";
import {
  Building2,
  FileText,
  Calendar,
  Warehouse,
  Database,
  Save,
  Plus,
  Loader2,
  Lock,
  Download,
  AlertCircle,
  HelpCircle
} from "lucide-react";

interface SettingsPageProps {
  initialSettings: SystemSettings;
  initialWarehouses: {
    id: string;
    name: string;
    location: string | null;
    description: string | null;
    isActive: boolean;
  }[];
  initialFiscalYears: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    isCurrent: boolean;
    isClosed: boolean;
  }[];
  sessionUser: {
    role: string;
  };
}

export function SettingsPage({
  initialSettings,
  initialWarehouses,
  initialFiscalYears,
  sessionUser
}: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<"business" | "invoice" | "fiscal" | "warehouses" | "backup">("business");
  const [loading, setLoading] = useState(false);

  // 1. Business Info form states
  const [bizName, setBizName] = useState(initialSettings.businessInfo.name);
  const [bizPan, setBizPan] = useState(initialSettings.businessInfo.pan);
  const [bizAddress, setBizAddress] = useState(initialSettings.businessInfo.address);
  const [bizPhone, setBizPhone] = useState(initialSettings.businessInfo.phone);

  // 2. Invoice Settings form states
  const [invoiceVat, setInvoiceVat] = useState(initialSettings.invoiceSettings.defaultVatRate);
  const [invoicePrefix, setInvoicePrefix] = useState(initialSettings.invoiceSettings.prefix);
  const [invoiceTerms, setInvoiceTerms] = useState(initialSettings.invoiceSettings.terms);
  const [colorRetail, setColorRetail] = useState(initialSettings.invoiceSettings.colors.RETAIL);
  const [colorWholesale, setColorWholesale] = useState(initialSettings.invoiceSettings.colors.WHOLESALE);
  const [colorProject, setColorProject] = useState(initialSettings.invoiceSettings.colors.PROJECT);

  // 3. Fiscal Year form states
  const [newFyName, setNewFyName] = useState("");
  const [newFyStart, setNewFyStart] = useState("");
  const [newFyEnd, setNewFyEnd] = useState("");

  // 4. Warehouse form states
  const [newWhName, setNewWhName] = useState("");
  const [newWhLoc, setNewWhLoc] = useState("");
  const [newWhDesc, setNewWhDesc] = useState("");

  const isAdminOrOwner = sessionUser.role === "SUPERADMIN" || sessionUser.role === "OWNER";
  const isSuperAdmin = sessionUser.role === "SUPERADMIN";

  // Business Info Submission
  const handleSaveBusinessInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await saveBusinessInfoAction({
        name: bizName,
        pan: bizPan,
        address: bizAddress,
        phone: bizPhone,
      });
      toast.success("Business profile details successfully updated.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update business settings.");
    } finally {
      setLoading(false);
    }
  };

  // Invoice Settings Submission
  const handleSaveInvoiceSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await saveInvoiceSettingsAction({
        defaultVatRate: Number(invoiceVat),
        prefix: invoicePrefix,
        terms: invoiceTerms,
        colors: {
          RETAIL: colorRetail,
          WHOLESALE: colorWholesale,
          PROJECT: colorProject,
        },
      });
      toast.success("Invoice VAT rate and branding configurations updated.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update invoice settings.");
    } finally {
      setLoading(false);
    }
  };

  // Create Warehouse Submission
  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWhName.trim()) {
      toast.error("Warehouse location name is required.");
      return;
    }

    try {
      setLoading(true);
      await createWarehouseAction({
        name: newWhName,
        location: newWhLoc,
        description: newWhDesc,
      });
      toast.success(`Warehouse: ${newWhName} added to registry.`);
      setNewWhName("");
      setNewWhLoc("");
      setNewWhDesc("");
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Failed to add warehouse.");
    } finally {
      setLoading(false);
    }
  };

  // Toggle Warehouse status
  const handleToggleWarehouse = async (id: string, currentWh: any) => {
    try {
      setLoading(true);
      await updateWarehouseAction(id, {
        name: currentWh.name,
        location: currentWh.location,
        description: currentWh.description,
        isActive: !currentWh.isActive,
      });
      toast.success(`Warehouse ${currentWh.name} status updated.`);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Failed to modify warehouse status.");
    } finally {
      setLoading(false);
    }
  };

  // Create Fiscal Year Submission
  const handleCreateFiscalYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFyName.trim() || !newFyStart || !newFyEnd) {
      toast.error("Please fill in all fiscal period fields.");
      return;
    }

    try {
      setLoading(true);
      await createFiscalYearAction({
        name: newFyName,
        startDate: newFyStart,
        endDate: newFyEnd,
      });
      toast.success(`Fiscal period ${newFyName} initialized.`);
      setNewFyName("");
      setNewFyStart("");
      setNewFyEnd("");
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Failed to create fiscal period.");
    } finally {
      setLoading(false);
    }
  };

  // Toggle Fiscal Year status (close/set current)
  const handleToggleFiscalYear = async (id: string, action: "close" | "setCurrent") => {
    try {
      setLoading(true);
      await toggleFiscalYearStatusAction(id, action);
      toast.success(
        action === "close"
          ? "Fiscal period locked and closed successfully."
          : "Active fiscal period context updated."
      );
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Failed to alter fiscal period context.");
    } finally {
      setLoading(false);
    }
  };

  // SUPERADMIN backup compilation download
  const handleDownloadBackup = async () => {
    try {
      setLoading(true);
      const jsonBackup = await exportAllDataAction();

      const blob = new Blob([jsonBackup], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      
      const today = new Date().toISOString().split("T")[0];
      link.href = url;
      link.download = `NextGenERP_FullBackup_${today}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("System data compile successful. JSON backup downloaded.");
    } catch (err: any) {
      toast.error(err.message || "Compilation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <PageHeader
        title="ERP System Settings"
        description="Configure VAT parameters, billing prefixes, warehousing registries, Nepalese fiscal year contexts, and download data backups."
      />

      {/* Tabs navigation */}
      <div className="flex border-b border-zinc-150 dark:border-zinc-850 gap-2 overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setActiveTab("business")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "business"
              ? "border-primary text-zinc-950 dark:text-zinc-50"
              : "border-transparent text-zinc-400 hover:text-zinc-700"
          }`}
        >
          <Building2 className="h-4.5 w-4.5" />
          Business Profile
        </button>

        <button
          onClick={() => setActiveTab("invoice")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "invoice"
              ? "border-primary text-zinc-950 dark:text-zinc-50"
              : "border-transparent text-zinc-400 hover:text-zinc-700"
          }`}
        >
          <FileText className="h-4.5 w-4.5" />
          Invoice & Channels
        </button>

        <button
          onClick={() => setActiveTab("fiscal")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "fiscal"
              ? "border-primary text-zinc-950 dark:text-zinc-50"
              : "border-transparent text-zinc-400 hover:text-zinc-700"
          }`}
        >
          <Calendar className="h-4.5 w-4.5" />
          Fiscal Periods
        </button>

        <button
          onClick={() => setActiveTab("warehouses")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "warehouses"
              ? "border-primary text-zinc-950 dark:text-zinc-50"
              : "border-transparent text-zinc-400 hover:text-zinc-700"
          }`}
        >
          <Warehouse className="h-4.5 w-4.5" />
          Warehouses
        </button>

        <button
          onClick={() => setActiveTab("backup")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "backup"
              ? "border-primary text-zinc-950 dark:text-zinc-50"
              : "border-transparent text-zinc-400 hover:text-zinc-700"
          }`}
        >
          <Database className="h-4.5 w-4.5" />
          Database Backup
        </button>
      </div>

      {/* 1. Business Info Tab */}
      {activeTab === "business" && (
        <form onSubmit={handleSaveBusinessInfo} className="max-w-2xl space-y-6">
          <Card className="border border-zinc-100 shadow-sm rounded-2xl dark:border-zinc-800 dark:bg-zinc-950 p-6">
            <CardHeader className="p-0 pb-4 mb-4 border-b border-zinc-100 dark:border-zinc-900">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                Official Company Credentials
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="biz-name" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                    Firm Name *
                  </Label>
                  <Input
                    id="biz-name"
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                    required
                    disabled={loading || !isAdminOrOwner}
                    className="h-10 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="biz-pan" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                    Nepali PAN / VAT Code *
                  </Label>
                  <Input
                    id="biz-pan"
                    value={bizPan}
                    onChange={(e) => setBizPan(e.target.value)}
                    required
                    disabled={loading || !isAdminOrOwner}
                    className="h-10 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="biz-address" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                  Registered Address *
                </Label>
                <Input
                  id="biz-address"
                  value={bizAddress}
                  onChange={(e) => setBizAddress(e.target.value)}
                  required
                  disabled={loading || !isAdminOrOwner}
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="biz-phone" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                  Contact Phone Number *
                </Label>
                <Input
                  id="biz-phone"
                  value={bizPhone}
                  onChange={(e) => setBizPhone(e.target.value)}
                  required
                  disabled={loading || !isAdminOrOwner}
                  className="h-10 rounded-xl font-mono"
                />
              </div>
            </CardContent>
          </Card>

          {isAdminOrOwner && (
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={loading}
                className="h-11 px-6 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-primary/20"
              >
                {loading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Save className="h-4.5 w-4.5" />}
                Save Business Profile
              </Button>
            </div>
          )}
        </form>
      )}

      {/* 2. Invoice & Channel Configs Tab */}
      {activeTab === "invoice" && (
        <form onSubmit={handleSaveInvoiceSettings} className="max-w-2xl space-y-6">
          <Card className="border border-zinc-100 shadow-sm rounded-2xl dark:border-zinc-800 dark:bg-zinc-950 p-6">
            <CardHeader className="p-0 pb-4 mb-4 border-b border-zinc-100 dark:border-zinc-900">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                Billing Rules & Theme Colors
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="inv-vat" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                    Default VAT Percentage (%) *
                  </Label>
                  <Input
                    id="inv-vat"
                    type="number"
                    value={invoiceVat}
                    onChange={(e) => setInvoiceVat(Number(e.target.value))}
                    required
                    disabled={loading || !isAdminOrOwner}
                    className="h-10 rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="inv-prefix" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                    Invoice Number Prefix *
                  </Label>
                  <Input
                    id="inv-prefix"
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                    required
                    disabled={loading || !isAdminOrOwner}
                    className="h-10 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Channel specific Color themes */}
              <div className="space-y-3 pt-2">
                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wide flex items-center gap-1">
                  Branding Color Codes per Channel
                  <HelpCircle className="h-3.5 w-3.5 text-zinc-400" />
                </Label>
                <div className="grid gap-4 grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-zinc-400 uppercase">Retail (Blue)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={colorRetail}
                        onChange={(e) => setColorRetail(e.target.value)}
                        disabled={!isAdminOrOwner}
                        className="w-10 h-10 p-1 rounded-xl cursor-pointer border border-zinc-250 bg-white"
                      />
                      <Input
                        value={colorRetail}
                        onChange={(e) => setColorRetail(e.target.value)}
                        disabled={!isAdminOrOwner}
                        className="h-10 rounded-xl font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-zinc-400 uppercase">Wholesale (Green)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={colorWholesale}
                        onChange={(e) => setColorWholesale(e.target.value)}
                        disabled={!isAdminOrOwner}
                        className="w-10 h-10 p-1 rounded-xl cursor-pointer border border-zinc-250 bg-white"
                      />
                      <Input
                        value={colorWholesale}
                        onChange={(e) => setColorWholesale(e.target.value)}
                        disabled={!isAdminOrOwner}
                        className="h-10 rounded-xl font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-zinc-400 uppercase">Project (Purple)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={colorProject}
                        onChange={(e) => setColorProject(e.target.value)}
                        disabled={!isAdminOrOwner}
                        className="w-10 h-10 p-1 rounded-xl cursor-pointer border border-zinc-250 bg-white"
                      />
                      <Input
                        value={colorProject}
                        onChange={(e) => setColorProject(e.target.value)}
                        disabled={!isAdminOrOwner}
                        className="h-10 rounded-xl font-mono text-xs uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inv-terms" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                  Default Payment Terms / Footer Terms *
                </Label>
                <textarea
                  id="inv-terms"
                  rows={4}
                  value={invoiceTerms}
                  onChange={(e) => setInvoiceTerms(e.target.value)}
                  required
                  disabled={loading || !isAdminOrOwner}
                  className="w-full p-3 rounded-xl border border-zinc-255 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </CardContent>
          </Card>

          {isAdminOrOwner && (
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={loading}
                className="h-11 px-6 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-primary/20"
              >
                {loading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Save className="h-4.5 w-4.5" />}
                Save Branding & Terms
              </Button>
            </div>
          )}
        </form>
      )}

      {/* 3. Fiscal Periods Management Tab */}
      {activeTab === "fiscal" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* List existing years */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border border-zinc-100 shadow-sm rounded-2xl dark:border-zinc-800 dark:bg-zinc-950 p-6">
              <CardHeader className="p-0 pb-4 mb-4 border-b border-zinc-100 dark:border-zinc-900">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                  Fiscal Periods Listing
                </CardTitle>
              </CardHeader>

              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50/50 dark:bg-zinc-900/30 font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-900">
                      <th className="py-2.5 px-3">Period Name</th>
                      <th className="py-2.5 px-3">Start Date</th>
                      <th className="py-2.5 px-3">End Date</th>
                      <th className="py-2.5 px-3 text-center">Indicators</th>
                      <th className="py-2.5 px-3 text-right">Operations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900 font-semibold text-zinc-700 dark:text-zinc-300">
                    {initialFiscalYears.map((fy) => (
                      <tr key={fy.id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/10">
                        <td className="py-3 px-3 font-bold text-zinc-900 dark:text-zinc-50">{fy.name}</td>
                        <td className="py-3 px-3 font-mono">{new Date(fy.startDate).toLocaleDateString()}</td>
                        <td className="py-3 px-3 font-mono">{new Date(fy.endDate).toLocaleDateString()}</td>
                        <td className="py-3 px-3 flex gap-1 justify-center">
                          {fy.isCurrent && <StatusBadge status="ACTIVE" />}
                          {fy.isClosed ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] uppercase bg-rose-500/10 text-rose-600 border border-rose-500/20">CLOSED</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">OPEN</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right space-x-1.5">
                          {isAdminOrOwner && !fy.isCurrent && !fy.isClosed && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleFiscalYear(fy.id, "setCurrent")}
                              disabled={loading}
                              className="h-7 text-[10px] font-bold text-primary"
                            >
                              Set Active
                            </Button>
                          )}
                          {isAdminOrOwner && !fy.isClosed && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleFiscalYear(fy.id, "close")}
                              disabled={loading}
                              className="h-7 text-[10px] font-bold border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            >
                              Lock Year
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Create new year */}
          {isAdminOrOwner && (
            <div>
              <Card className="border border-zinc-100 shadow-sm rounded-2xl dark:border-zinc-800 dark:bg-zinc-950 p-6">
                <CardHeader className="p-0 pb-4 mb-4 border-b border-zinc-100 dark:border-zinc-900">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                    Open New Period
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                  <form onSubmit={handleCreateFiscalYear} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="fy-name" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                        Period Name *
                      </Label>
                      <Input
                        id="fy-name"
                        value={newFyName}
                        onChange={(e) => setNewFyName(e.target.value)}
                        placeholder="e.g. 2082-83"
                        required
                        disabled={loading}
                        className="h-10 rounded-xl font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="fy-start" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                        Start Date *
                      </Label>
                      <Input
                        id="fy-start"
                        type="date"
                        value={newFyStart}
                        onChange={(e) => setNewFyStart(e.target.value)}
                        required
                        disabled={loading}
                        className="h-10 rounded-xl font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="fy-end" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                        End Date *
                      </Label>
                      <Input
                        id="fy-end"
                        type="date"
                        value={newFyEnd}
                        onChange={(e) => setNewFyEnd(e.target.value)}
                        required
                        disabled={loading}
                        className="h-10 rounded-xl font-mono"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-10 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-md shadow-primary/20"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Initialize Period
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* 4. Warehouses Management Tab */}
      {activeTab === "warehouses" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* List Warehouses */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border border-zinc-100 shadow-sm rounded-2xl dark:border-zinc-800 dark:bg-zinc-950 p-6">
              <CardHeader className="p-0 pb-4 mb-4 border-b border-zinc-100 dark:border-zinc-900">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                  Warehouses registry
                </CardTitle>
              </CardHeader>

              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50/50 dark:bg-zinc-900/30 font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-900">
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Location</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Operations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900 font-semibold text-zinc-700 dark:text-zinc-300">
                    {initialWarehouses.map((wh) => (
                      <tr key={wh.id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/10">
                        <td className="py-3 px-3 font-bold text-zinc-900 dark:text-zinc-50">{wh.name}</td>
                        <td className="py-3 px-3 text-zinc-550">{wh.location || <span className="italic text-zinc-400">None</span>}</td>
                        <td className="py-3 px-3 text-zinc-550 truncate max-w-[150px]">{wh.description || <span className="italic text-zinc-400">None</span>}</td>
                        <td className="py-3 px-3 text-center">
                          <StatusBadge status={wh.isActive ? "ACTIVE" : "CANCELLED"} />
                        </td>
                        <td className="py-3 px-3 text-right">
                          {isAdminOrOwner && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleWarehouse(wh.id, wh)}
                              disabled={loading}
                              className={`h-7 text-[10px] font-bold ${
                                wh.isActive ? "text-rose-600 hover:bg-rose-50" : "text-emerald-600 hover:bg-emerald-50"
                              }`}
                            >
                              {wh.isActive ? "Deactivate" : "Activate"}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Add warehouse */}
          {isAdminOrOwner && (
            <div>
              <Card className="border border-zinc-100 shadow-sm rounded-2xl dark:border-zinc-800 dark:bg-zinc-950 p-6">
                <CardHeader className="p-0 pb-4 mb-4 border-b border-zinc-100 dark:border-zinc-900">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                    Registry Add Depot
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                  <form onSubmit={handleCreateWarehouse} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="wh-name" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                        Depot Name *
                      </Label>
                      <Input
                        id="wh-name"
                        value={newWhName}
                        onChange={(e) => setNewWhName(e.target.value)}
                        placeholder="e.g. Warehouse C"
                        required
                        disabled={loading}
                        className="h-10 rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="wh-loc" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                        Physical Location
                      </Label>
                      <Input
                        id="wh-loc"
                        value={newWhLoc}
                        onChange={(e) => setNewWhLoc(e.target.value)}
                        placeholder="e.g. Ward 4, Gauradaha"
                        disabled={loading}
                        className="h-10 rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="wh-desc" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                        Operational description
                      </Label>
                      <textarea
                        id="wh-desc"
                        rows={3}
                        value={newWhDesc}
                        onChange={(e) => setNewWhDesc(e.target.value)}
                        placeholder="e.g. Sorting and loading aggregates"
                        disabled={loading}
                        className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-10 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-md shadow-primary/20"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Register Warehouse
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* 5. Database Backup Tab */}
      {activeTab === "backup" && (
        <div className="max-w-2xl">
          <Card className="border border-zinc-100 shadow-sm rounded-2xl dark:border-zinc-800 dark:bg-zinc-950 p-8 text-center space-y-6">
            <div className="inline-flex p-4 rounded-full bg-blue-50 text-blue-500 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 animate-pulse">
              <Database className="h-10 w-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                ERP Data Backup Registry
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                Compile and export your system data (customers, stock transactions, double-entry ledgers, personnel directories) in a structured, encrypted JSON file format.
              </p>
            </div>

            {!isSuperAdmin && (
              <div className="flex gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-400 text-xs leading-relaxed font-semibold max-w-md mx-auto text-left">
                <Lock className="h-5 w-5 flex-shrink-0 text-rose-500 mt-0.5" />
                <div>
                  <span className="font-bold">Security Boundary Policy:</span> Backup exports contain sensitive encrypted passwords, ledger journals, and cash balances. Access is strictly locked to users with the <span className="font-mono bg-rose-100 dark:bg-rose-900 px-1 py-0.5 rounded text-rose-600 dark:text-rose-450 uppercase text-[10px]">SUPERADMIN</span> role.
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button
                onClick={handleDownloadBackup}
                disabled={loading || !isSuperAdmin}
                className="h-11 px-6 rounded-xl font-bold flex items-center justify-center gap-2 mx-auto shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Download className="h-4.5 w-4.5" />}
                Download ERP Backup JSON
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
export default SettingsPage;
