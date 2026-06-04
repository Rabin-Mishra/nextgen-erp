import { getDb } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const db = await getDb();
    
    // Count the users in the database
    const userCount = await db.user.count();
    
    // Fetch user emails to see if they match the seeded ones
    const users = await db.user.findMany({
      select: {
        email: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      databaseUrlConfigured: !!(process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL),
      userCount,
      users,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || String(error),
      stack: error.stack,
    });
  }
}
