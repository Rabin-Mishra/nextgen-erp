import type { Role } from "../lib/constants";
import { ROLE_LABELS } from "../lib/constants";

export type Action = "view" | "create" | "edit" | "delete" | "export" | "approve";

export type Module =
  | "dashboard"
  | "inventory"
  | "purchase"
  | "sales"
  | "projects"
  | "ledger"
  | "cashbook"
  | "reports"
  | "users"
  | "expenses";

// Map each role to its allowed modules and the actions permitted within each module
const PERMISSIONS: Record<Role, Partial<Record<Module, Action[]>>> = {
  SUPERADMIN: {
    dashboard: ["view", "create", "edit", "delete", "export", "approve"],
    inventory: ["view", "create", "edit", "delete", "export", "approve"],
    purchase: ["view", "create", "edit", "delete", "export", "approve"],
    sales: ["view", "create", "edit", "delete", "export", "approve"],
    projects: ["view", "create", "edit", "delete", "export", "approve"],
    ledger: ["view", "create", "edit", "delete", "export", "approve"],
    cashbook: ["view", "create", "edit", "delete", "export", "approve"],
    reports: ["view", "create", "edit", "delete", "export", "approve"],
    users: ["view", "create", "edit", "delete", "export", "approve"],
    expenses: ["view", "create", "edit", "delete", "export", "approve"],
  },
  OWNER: {
    dashboard: ["view", "create", "edit", "delete", "export", "approve"],
    inventory: ["view", "create", "edit", "delete", "export", "approve"],
    purchase: ["view", "create", "edit", "delete", "export", "approve"],
    sales: ["view", "create", "edit", "delete", "export", "approve"],
    projects: ["view", "create", "edit", "delete", "export", "approve"],
    ledger: ["view", "create", "edit", "delete", "export", "approve"],
    cashbook: ["view", "create", "edit", "delete", "export", "approve"],
    reports: ["view", "create", "edit", "delete", "export", "approve"],
    users: ["view"], // Owner only has view-only access to user management
    expenses: ["view", "create", "edit", "delete", "export", "approve"],
  },
  MANAGER: {
    dashboard: ["view", "create", "edit", "delete", "export", "approve"],
    inventory: ["view", "create", "edit", "delete", "export", "approve"],
    purchase: ["view", "create", "edit", "delete", "export", "approve"],
    sales: ["view", "create", "edit", "delete", "export", "approve"],
    projects: ["view", "create", "edit", "delete", "export", "approve"],
    ledger: ["view"], // Managers can view ledger but not reverse/edit it
    cashbook: ["view", "create", "edit", "delete", "export", "approve"],
    reports: ["view", "create", "edit", "delete", "export", "approve"],
    users: [], // Managers do not manage users
    expenses: ["view", "create", "edit", "delete", "export", "approve"],
  },
  SALES_STAFF: {
    dashboard: ["view"],
    sales: ["view", "create", "edit", "delete", "export", "approve"],
    cashbook: ["view", "create", "edit"], // LTD access: view, create, edit cashbook entries (no delete/approve)
    inventory: ["view"], // LTD access: view inventory
    ledger: [], // NO access
    projects: ["view", "create", "edit"], // LTD access: view, create, edit projects
    reports: [], // NO access
    purchase: [],
    users: [],
    expenses: ["view"],
  },
  PURCHASE_STAFF: {
    dashboard: ["view"],
    purchase: ["view", "create", "edit", "delete", "export", "approve"],
    inventory: ["view", "create", "edit", "delete", "export", "approve"],
    ledger: [], // NO access
    reports: [], // NO access
    sales: [],
    projects: ["view", "create", "edit"], // LTD access: view, create, edit projects
    cashbook: ["view", "create", "edit"], // LTD access: view, create, edit cashbook entries
    users: [],
    expenses: ["view"],
  },
  VIEWER: {
    dashboard: ["view"],
    inventory: ["view"],
    purchase: ["view"],
    sales: ["view"],
    projects: ["view"],
    ledger: ["view"],
    cashbook: ["view"],
    reports: ["view"],
    users: [],
    expenses: ["view"],
  },
};

/**
 * Check whether a user's role allows them to perform a specific action inside a module.
 */
export function hasPermission(role: Role, module: Module, action: Action): boolean {
  const rolePermissions = PERMISSIONS[role];
  if (!rolePermissions) return false;
  const actions = rolePermissions[module];
  return actions ? actions.includes(action) : false;
}

