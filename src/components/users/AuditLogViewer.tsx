"use client";

import React, { useState, useEffect, useCallback } from "react";
import { fetchAuditLogsAction, fetchAuditLogMetadataAction } from "../../modules/users/actions";
import { SkeletonTable } from "../shared/SkeletonTable";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card } from "../ui/card";
import { toast } from "sonner";
import { Search, RotateCcw, Calendar, User, Eye, EyeOff, ShieldAlert, ArrowRight, CornerDownRight } from "lucide-react";

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  module: string;
  recordId: string | null;
  oldValues: any;
  newValues: any;
  ipAddress: string | null;
  createdAt: Date;
}

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Metadata for dropdowns
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);

  // Filter States
  const [filterUser, setFilterUser] = useState("");
  const [filterModule, setFilterModule] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // UI state for expanding diff details
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Load Metadata dropdown values
  useEffect(() => {
    async function loadMeta() {
      try {
        const meta = await fetchAuditLogMetadataAction();
        setUsers(meta.users);
        setModules(meta.modules);
        setActions(meta.actions);
      } catch (err: any) {
        console.error("Failed to load audit metadata:", err);
      }
    }
    loadMeta();
  }, []);

  // Fetch Audit Logs
  const loadLogs = useCallback(async (targetPage: number) => {
    try {
      setLoading(true);
      const result = await fetchAuditLogsAction({
        userId: filterUser || undefined,
        module: filterModule || undefined,
        action: filterAction || undefined,
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined,
        page: targetPage,
        limit: 10,
      });

      setLogs(result.logs as any[]);
      setTotalPages(result.pagination.pageCount);
      setPage(result.pagination.page);
    } catch (err: any) {
      toast.error(err.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }, [filterUser, filterModule, filterAction, filterStartDate, filterEndDate]);

  useEffect(() => {
    loadLogs(1);
  }, [loadLogs]);

  const handleReset = () => {
    setFilterUser("");
    setFilterModule("");
    setFilterAction("");
    setFilterStartDate("");
    setFilterEndDate("");
    setPage(1);
  };

  // Helper to format date
  const formatDateTime = (dateObj: Date) => {
    const d = new Date(dateObj);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Simple and highly effective JSON Differentiator renderer
  const renderValueDiff = (oldVal: any, newVal: any) => {
    if (!oldVal && !newVal) return <span className="text-zinc-400">No details captured</span>;

    // Normalize values
    const oldObj = typeof oldVal === "object" && oldVal !== null ? oldVal : {};
    const newObj = typeof newVal === "object" && newVal !== null ? newVal : {};

    const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));

    if (allKeys.length === 0) {
      // Just try raw values
      return (
        <div className="grid grid-cols-2 gap-4 text-xs font-mono p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
          <div>
            <div className="font-bold text-zinc-500 mb-1">Old Data Value:</div>
            <pre className="text-rose-600 max-w-full overflow-x-auto whitespace-pre-wrap">{JSON.stringify(oldVal, null, 2)}</pre>
          </div>
          <div>
            <div className="font-bold text-zinc-500 mb-1">New Data Value:</div>
            <pre className="text-emerald-600 max-w-full overflow-x-auto whitespace-pre-wrap">{JSON.stringify(newVal, null, 2)}</pre>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4 border border-zinc-150 dark:border-zinc-800 animate-fade-in space-y-2">
        <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-2 border-b border-zinc-100 dark:border-zinc-800 pb-1.5 flex items-center justify-between">
          <span>Field Changes Matrix</span>
          <span className="text-[9px] bg-zinc-200 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded font-mono">JSON DIFF</span>
        </div>
        <div className="space-y-1.5 font-mono text-xs max-h-60 overflow-y-auto pr-1 select-text">
          {allKeys.map((key) => {
            // Skip password hash fields for security
            if (key.toLowerCase().includes("password") || key.toLowerCase().includes("hash")) {
              return (
                <div key={key} className="flex py-1 border-b border-zinc-100/50 dark:border-zinc-900/30">
                  <span className="w-1/3 text-zinc-500 font-semibold">{key}:</span>
                  <span className="w-2/3 text-zinc-400 italic">🔐 Sensitive field (Hidden)</span>
                </div>
              );
            }

            const oValue = oldObj[key];
            const nValue = newObj[key];

            const wasAdded = !(key in oldObj);
            const wasDeleted = !(key in newObj);
            const wasModified = !wasAdded && !wasDeleted && JSON.stringify(oValue) !== JSON.stringify(nValue);

            if (wasAdded) {
              return (
                <div key={key} className="flex py-1 border-b border-zinc-100/50 dark:border-zinc-900/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 px-2 rounded-lg">
                  <span className="w-1/3 font-semibold">{key}:</span>
                  <span className="w-2/3 flex items-center gap-1.5">
                    <span className="text-[9px] uppercase font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded tracking-wide">Added</span>
                    <span className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(nValue)}</span>
                  </span>
                </div>
              );
            }

            if (wasDeleted) {
              return (
                <div key={key} className="flex py-1 border-b border-zinc-100/50 dark:border-zinc-900/30 bg-rose-500/5 text-rose-700 dark:text-rose-400 px-2 rounded-lg line-through">
                  <span className="w-1/3 font-semibold">{key}:</span>
                  <span className="w-2/3 flex items-center gap-1.5">
                    <span className="text-[9px] uppercase font-bold bg-rose-500/10 px-1.5 py-0.5 rounded tracking-wide">Removed</span>
                    <span className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(oValue)}</span>
                  </span>
                </div>
              );
            }

            if (wasModified) {
              return (
                <div key={key} className="flex py-1 border-b border-zinc-100/50 dark:border-zinc-900/30 bg-amber-500/5 px-2 rounded-lg">
                  <span className="w-1/3 text-zinc-700 dark:text-zinc-300 font-semibold">{key}:</span>
                  <span className="w-2/3 flex flex-wrap items-center gap-1.5">
                    <span className="text-[9px] uppercase font-bold bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded tracking-wide">Changed</span>
                    <span className="text-rose-600 dark:text-rose-400 max-w-[200px] overflow-x-auto">{JSON.stringify(oValue)}</span>
                    <ArrowRight className="h-3 w-3 text-zinc-400" />
                    <span className="text-emerald-600 dark:text-emerald-400 max-w-[200px] overflow-x-auto">{JSON.stringify(nValue)}</span>
                  </span>
                </div>
              );
            }

            // Unchanged field
            return (
              <div key={key} className="flex py-1 border-b border-zinc-100/50 dark:border-zinc-900/30 text-zinc-500 px-2">
                <span className="w-1/3 font-semibold">{key}:</span>
                <span className="w-2/3 text-zinc-600 dark:text-zinc-400 overflow-x-auto">{JSON.stringify(nValue)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search Filters Card */}
      <Card className="border border-zinc-100 shadow-sm rounded-2xl dark:border-zinc-800 dark:bg-zinc-950 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Search className="h-4.5 w-4.5 text-zinc-400" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-wide">
            Filter System Audit Trails
          </h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {/* User selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Personnel</Label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none"
            >
              <option value="">All Personnel</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email.split("@")[0]})
                </option>
              ))}
            </select>
          </div>

          {/* Module selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Target Module</Label>
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none"
            >
              <option value="">All Modules</option>
              {modules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Action selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Action Type</Label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none"
            >
              <option value="">All Actions</option>
              {actions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Start Date</Label>
            <Input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">End Date</Label>
            <Input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-900">
          <Button
            variant="outline"
            onClick={handleReset}
            className="h-10 px-4 rounded-xl text-xs font-bold border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Filters
          </Button>
          <Button
            onClick={() => loadLogs(1)}
            className="h-10 px-5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-primary/20"
          >
            <Search className="h-4 w-4" />
            Apply Filters
          </Button>
        </div>
      </Card>

      {/* Audit Log Results Table */}
      <Card className="border border-zinc-100 shadow-sm rounded-2xl dark:border-zinc-800 dark:bg-zinc-950 p-6 overflow-hidden">
        {loading ? (
          <SkeletonTable cols={6} rows={5} />
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex p-4 rounded-full bg-zinc-50 text-zinc-400 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-850 mb-4 animate-bounce">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h4 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">No Audit Records Found</h4>
            <p className="text-xs text-zinc-400 mt-1">Try adjusting your filters or date bounds above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-zinc-100 dark:border-zinc-900">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-500 text-xs font-bold uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-900">
                    <th className="py-3 px-4 w-[160px]">Timestamp</th>
                    <th className="py-3 px-4">Personnel</th>
                    <th className="py-3 px-4 w-[100px]">Action</th>
                    <th className="py-3 px-4 w-[110px]">Module</th>
                    <th className="py-3 px-4 w-[140px]">Record Context</th>
                    <th className="py-3 px-4 text-right w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs">
                  {logs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    let actionBadgeColor = "";
                    switch (log.action) {
                      case "CREATE":
                        actionBadgeColor = "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20";
                        break;
                      case "UPDATE":
                        actionBadgeColor = "bg-amber-500/10 text-amber-600 border border-amber-500/20";
                        break;
                      case "DELETE":
                        actionBadgeColor = "bg-rose-500/10 text-rose-600 border border-rose-500/20";
                        break;
                      default:
                        actionBadgeColor = "bg-blue-500/10 text-blue-600 border border-blue-500/20";
                        break;
                    }

                    return (
                      <React.Fragment key={log.id}>
                        <tr className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/10">
                          <td className="py-3.5 px-4 font-semibold text-zinc-500 flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                            {formatDateTime(log.createdAt)}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-zinc-800 dark:text-zinc-200">{log.userName}</span>
                              <span className="text-[10px] text-zinc-400 font-mono mt-0.5">{log.userEmail}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${actionBadgeColor}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold uppercase text-zinc-500 tracking-wider text-[10px] bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded">
                              {log.module}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[10px] text-zinc-500">
                            {log.recordId ? (
                              <span className="truncate max-w-[120px] inline-block">{log.recordId}</span>
                            ) : (
                              <span className="italic text-zinc-400">None</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="h-8 w-8 p-0 rounded-lg text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50"
                            >
                              {isExpanded ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                            </Button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-zinc-50/20 dark:bg-zinc-900/5 border-t-0">
                            <td colSpan={6} className="py-4 px-6 border-b border-zinc-100 dark:border-zinc-900">
                              <div className="flex flex-col gap-2.5">
                                <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-400">
                                  <CornerDownRight className="h-3.5 w-3.5 text-zinc-400" />
                                  <span>Activity Logs Transaction Detail IP: {log.ipAddress || "Internal"}</span>
                                </div>
                                {renderValueDiff(log.oldValues, log.newValues)}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-900">
                <span className="text-xs text-zinc-400 font-semibold">
                  Page {page} of {totalPages} pages
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => loadLogs(page - 1)}
                    disabled={page === 1}
                    className="h-9 px-3 rounded-lg text-xs font-bold"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => loadLogs(page + 1)}
                    disabled={page === totalPages}
                    className="h-9 px-3 rounded-lg text-xs font-bold"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
export default AuditLogViewer;
