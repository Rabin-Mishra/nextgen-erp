import type { Session } from "next-auth";
import { auth } from "../auth-middleware";
import { getDb } from "../lib/db";

export async function getCurrentUser(): Promise<Session["user"] | null> {
  const session = await auth();
  if (!session?.user?.email) return null;

  try {
    const db = await getDb();
    const user = await db.user.findUnique({
      where: { email: session.user.email.trim().toLowerCase() },
    });
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    } as any;
  } catch (error) {
    console.error("Error resolving session user from db, falling back to session cookie:", error);
    return session?.user ?? null;
  }
}

export type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;

