import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import {
  fetchInventoryAlerts,
  fetchInventoryItems,
  fetchStockSummary,
  fetchCategories,
  fetchBrands,
} from "@/modules/inventory/queries";
import AddProductModal from "@/components/inventory/AddProductModal";
import AdjustStockModal from "@/components/inventory/AdjustStockModal";
import CategoriesTab from "@/components/inventory/CategoriesTab";
import BrandsTab from "@/components/inventory/BrandsTab";
import { getCurrentUser } from "@/auth/session";
import { hasPermission } from "@/auth/permissions";
import { Role } from "@/lib/constants";
import { formatNPR } from "@/lib/utils";

type InventoryPageProps = {
  searchParams?: Promise<{ tab?: string; search?: string; page?: string; filter?: string }>;
};

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const user = await getCurrentUser();
  const role = user?.role ?? "VIEWER";

  const params = await searchParams;
  const tab = params?.tab ?? "stock";
  const search = params?.search ?? "";
  const page = parseInt(params?.page ?? "1") || 1;
  const filter = params?.filter ?? "";

  const [itemsResp, summary, alerts, categoriesResp, brandsResp] = await Promise.all([
    fetchInventoryItems(tab === "stock" ? { page, search, pageSize: 25, lowStock: filter === "reorder" } : { page: 1, pageSize: 25 }),
    fetchStockSummary(),
    fetchInventoryAlerts(),
    fetchCategories(tab === "categories" ? { page, search, pageSize: 10 } : { page: 1, pageSize: 10 }),
    fetchBrands(tab === "brands" ? { page, search, pageSize: 10 } : { page: 1, pageSize: 10 }),
  ]);
  const items = itemsResp?.data ?? [];
  const pagination = itemsResp?.pagination ?? { page: 1, pageSize: 25, total: 0 };

  const categories = categoriesResp?.data ?? [];
  const categoriesPagination = categoriesResp?.pagination ?? { page: 1, pageSize: 10, total: 0 };

  const brands = brandsResp?.data ?? [];
  const brandsPagination = brandsResp?.pagination ?? { page: 1, pageSize: 10, total: 0 };

  const tabs = [
    { id: "stock", label: "Stock Levels" },
    { id: "categories", label: "Categories" },
    { id: "brands", label: "Brands" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Operations"
        description="Monitor product levels, brands, categories, and warehouse stocks."
      />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <CardHeader>
            <CardTitle>Total Active Products</CardTitle>
            <CardDescription>Products assigned to active inventory records.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-4 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">{summary.totalProducts}</div>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <CardHeader>
            <CardTitle>Total Stock Units</CardTitle>
            <CardDescription>Sum of available quantities across warehouses.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-4 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">{summary.totalStock}</div>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <CardHeader>
            <CardTitle>Active Stock Value</CardTitle>
            <CardDescription>Value of active items in stock at cost.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-4 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
              {formatNPR(summary.totalValue)}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <CardHeader>
            <CardTitle>Reorder Alerts</CardTitle>
            <CardDescription>Products below reorder level across warehouses.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-4 flex items-center justify-between gap-2">
              <Badge variant={alerts.length > 0 ? "destructive" : "secondary"}>
                {alerts.length > 0 ? `${alerts.length} require attention` : "All good"}
              </Badge>
              {alerts.length > 0 && (
                <Link
                  href={`/inventory?tab=stock${filter === "reorder" ? "" : "&filter=reorder"}`}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                    filter === "reorder"
                      ? "bg-zinc-100 text-zinc-900 border-zinc-300 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-50 dark:border-zinc-700"
                      : "bg-rose-600 text-white border-transparent hover:bg-rose-700 shadow-sm"
                  }`}
                >
                  {filter === "reorder" ? "Show All" : "View"}
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <nav className="flex gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
        {tabs.map((item) => (
          <Link
            key={item.id}
            href={`/inventory?tab=${item.id}`}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === item.id
                ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Conditional Rendering of Tabs */}
      {tab === "stock" && (
        <>
          {alerts.length > 0 ? (
            <section className="rounded-3xl border border-orange-200 bg-orange-50 p-6 dark:border-orange-900/40 dark:bg-orange-950/60 animate-fade-in flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-orange-900 dark:text-orange-100">Low stock alerts</h2>
                <p className="mt-2 text-sm text-orange-700 dark:text-orange-300">
                  {alerts.length} item{alerts.length === 1 ? "" : "s"} are at or below their reorder level.
                </p>
              </div>
              <Link
                href={`/inventory?tab=stock${filter === "reorder" ? "" : "&filter=reorder"}`}
                className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all w-fit ${
                  filter === "reorder"
                    ? "bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-50 dark:border-zinc-800"
                    : "bg-orange-600 text-white border-transparent hover:bg-orange-700 shadow-sm"
                }`}
              >
                {filter === "reorder" ? "Show All Items" : "Filter Critical Items"}
              </Link>
            </section>
          ) : (
            <section className="rounded-3xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No reorder alerts at the moment.</p>
            </section>
          )}

          <section className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 animate-fade-in">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Inventory Snapshot</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Review stock levels and warehouse allocations.</p>
              </div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">{items.length} inventory rows</div>
            </div>
            <div className="flex items-center justify-end gap-2 mb-4">
              {hasPermission(role as Role, "inventory", "create") && (
                <>
                  <AddProductModal />
                  <AdjustStockModal stocks={items} />
                </>
              )}
            </div>
            <InventoryTable items={items} pagination={pagination} searchQuery={search} role={role} />
          </section>
        </>
      )}

      {tab === "categories" && (
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 animate-fade-in">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Product Categories</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Manage inventory classification categories and product tracking buckets.
            </p>
          </div>
          <CategoriesTab
            initialCategories={categories as any}
            pagination={categoriesPagination}
            searchQuery={tab === "categories" ? search : ""}
            role={role}
          />
        </section>
      )}

      {tab === "brands" && (
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 animate-fade-in">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Product Brands</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Manage manufacturers, paint brands, and supply brands in stock.
            </p>
          </div>
          <BrandsTab
            initialBrands={brands as any}
            pagination={brandsPagination}
            searchQuery={tab === "brands" ? search : ""}
            role={role}
          />
        </section>
      )}
    </div>
  );
}

