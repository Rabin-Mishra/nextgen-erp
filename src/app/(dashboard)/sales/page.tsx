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
          <div className="mb-6 border-b pb-4">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Sales Returns Log</h2>
            <p className="text-sm text-zinc-500">Distinct Red-themed Return Notes (SRN-XXXX) tracking re-credited inventory stock and digital cash book payouts.</p>
          </div>
          
          <div className="space-y-6">
            {returnsResp.data.length ? returnsResp.data.map((r: any) => (
              <div key={r.id} className="rounded-xl border border-red-100 bg-red-50/20 p-5 dark:border-red-950/40 dark:bg-red-950/10">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-red-100/60 pb-3 dark:border-red-950/20 mb-3">
                  <div>
                    <span className="inline-flex items-center rounded-lg bg-red-100 px-3 py-1 font-mono text-xs font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
                      {r.returnNumber}
                    </span>
                    <span className="ml-3 text-xs text-zinc-500 font-medium">
                      Date: {new Date(r.returnDate).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs text-zinc-500 font-semibold">
                      Original Invoice: <span className="font-mono text-zinc-800 dark:text-zinc-200">{r.invoice?.invoiceNumber ?? "—"}</span>
                    </span>
                    <span className="text-xs text-zinc-500 font-semibold flex items-center gap-1.5">
                      Refund Method: <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 font-mono text-[10px]">{r.refundMethod}</Badge>
                    </span>
                    <Badge className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 text-[10px] font-bold px-2 py-0.5">{r.status}</Badge>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-zinc-600 dark:text-zinc-300">
                    <thead>
                      <tr className="border-b border-red-100/40 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        <th className="px-3 py-1.5 text-left">Product Name</th>
                        <th className="px-3 py-1.5 text-left">Warehouse</th>
                        <th className="px-3 py-1.5 text-right">Qty</th>
                        <th className="px-3 py-1.5 text-right">Rate</th>
                        <th className="px-3 py-1.5 text-right">Total Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100/20 font-medium">
                      {r.items?.map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 text-zinc-800 dark:text-zinc-200">{item.product?.name}</td>
                          <td className="px-3 py-2 text-zinc-500">{item.warehouse?.name}</td>
                          <td className="px-3 py-2 text-right">{item.qty}</td>
                          <td className="px-3 py-2 text-right">{formatNPR(Number(item.unitPrice))}</td>
                          <td className="px-3 py-2 text-right text-zinc-800 dark:text-zinc-200">{formatNPR(Number(item.totalPrice))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 pt-3 border-t border-red-100/40 dark:border-red-950/20 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 text-xs">
                  <div className="text-zinc-500 max-w-md">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">Reason:</span> {r.notes || "No reason specified."}
                  </div>
                  {(() => {
                    const originalVatPercent = r.invoice?.vatPercent ? Number(r.invoice.vatPercent) : 0;
                    const hasVat = originalVatPercent > 0;
                    const totalAmount = Number(r.totalAmount);
                    const subtotal = hasVat ? totalAmount / (1 + originalVatPercent / 100) : totalAmount;
                    const vatAmount = totalAmount - subtotal;
                    
                    return (
                      <div className="text-right space-y-1 ml-auto font-medium text-zinc-600 dark:text-zinc-400">
                        {hasVat && (
                          <>
                            <div>Subtotal: <span className="text-zinc-900 dark:text-zinc-100">{formatNPR(subtotal)}</span></div>
                            <div>VAT ({originalVatPercent}%): <span className="text-zinc-900 dark:text-zinc-100">{formatNPR(vatAmount)}</span></div>
                          </>
                        )}
                        <div className="font-bold text-red-700 dark:text-red-300 text-sm pt-1">
                          Total Credit: {formatNPR(totalAmount)}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )) : (
              <div className="rounded-xl border border-dashed p-10 text-center text-sm text-zinc-500">
                No Sales Returns found.
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
