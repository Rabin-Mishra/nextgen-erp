import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CreateInvoiceForm } from "@/components/sales/CreateInvoiceForm";
import { InvoiceTable } from "@/components/sales/InvoiceTable";
import { OutstandingDuesTable } from "@/components/sales/OutstandingDuesTable";
import { SalesStats } from "@/components/sales/SalesStats";
import { CustomerListTable } from "@/components/sales/CustomerListTable";
import { AddCustomerModal } from "@/components/sales/AddCustomerModal";
import { formatNPR } from "@/lib/utils";
import {
  getCustomers,
  getInvoiceFormLookups,
  getOutstandingDues,
  getRevenueByChannel,
  getSalesInvoices,
  getSalesReturns,
  getSalesStats,
} from "@/modules/sales/queries";

type SalesPageProps = {
  searchParams?: Promise<{ tab?: string }>;
};

export default async function SalesPage({ searchParams }: SalesPageProps) {
  const params = await searchParams;
  const tab = params?.tab ?? "invoices";
  const now = new Date();

  const [invoicesResp, stats, customersResp, outstanding, returnsResp, lookups, revenueByChannel] = await Promise.all([
    getSalesInvoices(),
    getSalesStats(),
    getCustomers(),
    getOutstandingDues(),
    getSalesReturns(),
    getInvoiceFormLookups(),
    getRevenueByChannel(now.getMonth() + 1, now.getFullYear()),
  ]);

  const tabs = [
    { id: "invoices", label: "Invoices" },
    { id: "customers", label: "Customers" },
    { id: "outstanding", label: "Outstanding" },
    { id: "returns", label: "Returns" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Sales Invoices"
          description="Create multi-channel invoices, track customer payments, credit dues, and returns."
        />
        <CreateInvoiceForm {...lookups} />
      </div>

      <SalesStats stats={stats} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40">
          <CardContent className="pt-2">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-200">Retail Revenue</p>
            <p className="mt-1 text-2xl font-semibold">{formatNPR(Number(revenueByChannel.retail))}</p>
          </CardContent>
        </Card>
        <Card className="border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40">
          <CardContent className="pt-2">
            <p className="text-sm font-medium text-green-700 dark:text-green-200">Wholesale Revenue</p>
            <p className="mt-1 text-2xl font-semibold">{formatNPR(Number(revenueByChannel.wholesale))}</p>
          </CardContent>
        </Card>
        <Card className="border border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950/40">
          <CardContent className="pt-2">
            <p className="text-sm font-medium text-purple-700 dark:text-purple-200">Project Revenue</p>
            <p className="mt-1 text-2xl font-semibold">{formatNPR(Number(revenueByChannel.project))}</p>
          </CardContent>
        </Card>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
        {tabs.map((item) => (
          <Link
            key={item.id}
            href={`/sales?tab=${item.id}`}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${tab === item.id ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950" : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {tab === "invoices" && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Invoices</h2>
            <p className="text-sm text-zinc-500">Retail, wholesale, and project invoices with payment status.</p>
          </div>
          {invoicesResp.data.length ? (
            <InvoiceTable invoices={invoicesResp.data} />
          ) : (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-zinc-500">No invoices yet.</p>
          )}
        </section>
      )}

      {tab === "customers" && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Customers</h2>
              <p className="text-sm text-zinc-500">Active customer accounts, credit limits, and detailed double-entry ledgers.</p>
            </div>
            <AddCustomerModal />
          </div>
          <CustomerListTable customers={customersResp.data as any} />
        </section>
      )}

      {tab === "outstanding" && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Outstanding Dues</h2>
            <p className="text-sm text-zinc-500">Customers with unpaid invoice balances.</p>
          </div>
          {outstanding.length ? <OutstandingDuesTable dues={outstanding} /> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-zinc-500">No outstanding dues.</p>}
        </section>
      )}

      {tab === "returns" && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Returns</h2>
            <p className="text-sm text-zinc-500">Returned sales items posted back to stock.</p>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Invoice</th>
                  <th className="px-4 py-2 text-left">Item</th>
                  <th className="px-4 py-2 text-left">Warehouse</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {returnsResp.data.length ? returnsResp.data.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-2">{new Date(entry.createdAt).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-2 font-mono">{entry.invoiceNumber ?? "-"}</td>
                    <td className="px-4 py-2">{entry.productName}</td>
                    <td className="px-4 py-2">{entry.warehouseName}</td>
                    <td className="px-4 py-2 text-right">{entry.quantity}</td>
                    <td className="px-4 py-2 text-right">{formatNPR(Number(entry.value))}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-500">No returns recorded.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
