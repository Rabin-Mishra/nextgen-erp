import { getCurrentUser } from "./session";
import { hasPermission } from "./permissions";
import type { Module, Action } from "./permissions";
import { ROLE_LABELS } from "../lib/constants";

/**
 * Server-side wrapper to fetch session user and enforce permission check.
 * Throws Error on access denied or unauthenticated.
 */
export async function checkServerPermission(module: Module, action: Action): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized: Please log in first.");
  }
  const isAllowed = hasPermission(user.role, module, action);
  if (!isAllowed) {
    throw new Error(
      `Access Denied: Your security role (${ROLE_LABELS[user.role] || user.role}) is not authorized to perform '${action}' on the ${module} module.`
    );
  }
}
