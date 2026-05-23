"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNPR } from "@/lib/utils";
import type { ProjectProfitabilitySchema } from "@/modules/projects/types";
import { FileText, Download, Calculator } from "lucide-react";

interface ProjectProfitabilityReportProps {
  projects: ProjectProfitabilitySchema[];
}

export function ProjectProfitabilityReport({ projects }: ProjectProfitabilityReportProps) {
  // Store manual entry of labor/subcontractor costs per project
  const [laborCosts, setLaborCosts] = useState<Record<string, number>>({});

  const handleLaborCostChange = (projectId: string, cost: number) => {
    setLaborCosts((prev) => ({ ...prev, [projectId]: cost }));
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rowsHtml = projects
      .map((p) => {
        const labor = laborCosts[p.projectId] || 0;
        const totalCost = Number(p.totalCost) + labor;
        const profit = Number(p.totalBilled) - totalCost;
        const margin = Number(p.totalBilled) > 0 ? (profit / Number(p.totalBilled)) * 100 : 0;

        return `
        <tr style="border-bottom: 1px solid #e4e4e7; font-size: 11px;">
          <td style="padding: 8px; font-family: monospace;">${p.projectCode}</td>
          <td style="padding: 8px; font-weight: bold;">${p.projectName}</td>
          <td style="padding: 8px;">${p.clientName}</td>
          <td style="padding: 8px; text-align: right;">${formatNPR(Number(p.contractAmount))}</td>
          <td style="padding: 8px; text-align: right;">${formatNPR(Number(p.totalBilled))}</td>
          <td style="padding: 8px; text-align: right;">${formatNPR(Number(p.totalCost))}</td>
          <td style="padding: 8px; text-align: right;">${formatNPR(labor)}</td>
          <td style="padding: 8px; text-align: right; font-weight: bold; color: ${profit >= 0 ? "#15803d" : "#b91c1c"};">
            ${formatNPR(profit)}
          </td>
          <td style="padding: 8px; text-align: right; font-weight: bold; color: ${margin >= 20 ? "#15803d" : margin >= 10 ? "#b45309" : "#b91c1c"};">
            ${margin.toFixed(1)}%
          </td>
        </tr>
      `;
      })
      .join("");

    const totalContract = projects.reduce((sum, p) => sum + Number(p.contractAmount), 0);
    const totalBilled = projects.reduce((sum, p) => sum + Number(p.totalBilled), 0);
    const totalMatCost = projects.reduce((sum, p) => sum + Number(p.totalCost), 0);
    const totalLabor = Object.values(laborCosts).reduce((sum, val) => sum + val, 0);
    const cumulativeCost = totalMatCost + totalLabor;
    const cumulativeProfit = totalBilled - cumulativeCost;
    const cumulativeMargin = totalBilled > 0 ? (cumulativeProfit / totalBilled) * 100 : 0;

    printWindow.document.write(`
      <html>
        <head>
          <title>NextGen ERP - Project Profitability Report</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #18181b; }
            .header { text-align: center; border-bottom: 2px solid #18181b; padding-bottom: 12px; margin-bottom: 24px; }
            .header h1 { margin: 0; font-size: 20px; }
            .header p { margin: 4px 0 0 0; font-size: 12px; color: #71717a; }
            table { w-full; border-collapse: collapse; margin-top: 16px; }
            th { background-color: #f4f4f5; text-align: left; padding: 10px 8px; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #d4d4d8; }
            td { padding: 10px 8px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>NextGen Interior And WaterProofing</h1>
            <p>PAN: 122782202 | Phone: 9843146474 | Gauradaha-02, Jhapa, Nepal</p>
            <h2 style="font-size: 15px; margin-top: 14px; text-transform: uppercase; letter-spacing: 1px;">Project Profitability Matrix</h2>
          </div>
          <table style="width: 100%;">
            <thead>
              <tr>
                <th>Code</th>
                <th>Project Name</th>
                <th>Client</th>
                <th style="text-align: right;">Contract</th>
                <th style="text-align: right;">Billed (Rev)</th>
                <th style="text-align: right;">Material Cost</th>
                <th style="text-align: right;">Labor Cost</th>
                <th style="text-align: right;">Gross Profit</th>
                <th style="text-align: right;">Net Margin</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr style="border-top: 2px solid #18181b; background-color: #fafafa; font-weight: bold; font-size: 11px;">
                <td colspan="3" style="padding: 10px 8px;">CUMULATIVE TOTALS</td>
                <td style="padding: 10px 8px; text-align: right;">${formatNPR(totalContract)}</td>
                <td style="padding: 10px 8px; text-align: right;">${formatNPR(totalBilled)}</td>
                <td style="padding: 10px 8px; text-align: right;">${formatNPR(totalMatCost)}</td>
                <td style="padding: 10px 8px; text-align: right;">${formatNPR(totalLabor)}</td>
                <td style="padding: 10px 8px; text-align: right; color: ${cumulativeProfit >= 0 ? "#15803d" : "#b91c1c"};">
                  ${formatNPR(cumulativeProfit)}
                </td>
                <td style="padding: 10px 8px; text-align: right; color: ${cumulativeMargin >= 20 ? "#15803d" : cumulativeMargin >= 10 ? "#b45309" : "#b91c1c"};">
                  ${cumulativeMargin.toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-xl border border-dashed">
        <div className="flex items-center gap-2">
          <Calculator className="h-4.5 w-4.5 text-zinc-500" />
          <p className="text-xs text-zinc-500 font-medium">
            Enter manual labor or subcontractor costs on any project row to dynamically calculate gross margins.
          </p>
        </div>
        <Button onClick={handlePrint} variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Print Report (PDF)
        </Button>
      </div>

      <div className="rounded-2xl border bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 uppercase tracking-wider text-[10px]">
              <TableHead className="font-bold">Code</TableHead>
              <TableHead className="font-bold">Project</TableHead>
              <TableHead className="font-bold">Client</TableHead>
              <TableHead className="text-right font-bold">Contract</TableHead>
              <TableHead className="text-right font-bold">Billed (Rev)</TableHead>
              <TableHead className="text-right font-bold">Mat. Cost</TableHead>
              <TableHead className="text-right font-bold w-32">Labor Cost *</TableHead>
              <TableHead className="text-right font-bold">Gross Profit</TableHead>
              <TableHead className="text-right font-bold">Net Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((p) => {
              const labor = laborCosts[p.projectId] || 0;
              const matCost = Number(p.totalCost);
              const totalCost = matCost + labor;
              const profit = Number(p.totalBilled) - totalCost;
              const margin = Number(p.totalBilled) > 0 ? (profit / Number(p.totalBilled)) * 100 : 0;

              return (
                <TableRow key={p.projectId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 text-xs">
                  <TableCell className="font-mono">{p.projectCode}</TableCell>
                  <TableCell className="font-semibold text-zinc-900 dark:text-zinc-50">{p.projectName}</TableCell>
                  <TableCell className="text-zinc-500">{p.clientName}</TableCell>
                  <TableCell className="text-right">{formatNPR(Number(p.contractAmount))}</TableCell>
                  <TableCell className="text-right font-medium">{formatNPR(Number(p.totalBilled))}</TableCell>
                  <TableCell className="text-right text-purple-600 font-medium">{formatNPR(matCost)}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={labor || ""}
                      onChange={(e) => handleLaborCostChange(p.projectId, parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs text-right"
                      min={0}
                    />
                  </TableCell>
                  <TableCell className={`text-right font-bold ${profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600"}`}>
                    {formatNPR(profit)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        margin >= 20
                          ? "font-bold text-green-600 dark:text-green-400"
                          : margin >= 10
                          ? "font-bold text-amber-600 dark:text-amber-400"
                          : "font-bold text-red-600"
                      }
                    >
                      {margin.toFixed(1)}%
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
