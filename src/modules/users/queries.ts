import { getDb } from "../../lib/db";
import { Role } from "../../lib/constants";
import { Prisma } from "../../generated/prisma/client";

export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  lastLogin: Date | null;
}

export async function getUsersList(): Promise<UserItem[]> {
  const db = await getDb();
  const users = await db.user.findMany({
    orderBy: [
      { role: "asc" },
      { name: "asc" }
    ],
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as Role,
    isActive: u.isActive,
    createdAt: u.createdAt,
    lastLogin: u.lastLogin,
  }));
}

export interface AuditLogFilters {
  userId?: string;
  module?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export async function getAuditLogs(filters: AuditLogFilters = {}) {
  const db = await getDb();
  const { userId, module: moduleName, action, startDate, endDate, page = 1, limit = 20 } = filters;

  const where: Prisma.AuditLogWhereInput = {};

  if (userId) {
    where.userId = userId;
  }
  if (moduleName) {
    where.module = moduleName;
  }
  if (action) {
    where.action = action;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(`${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      where.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
    }
  }

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
    db.auditLog.count({ where }),
  ]);

  return {
    logs: logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userName: log.user.name,
      userEmail: log.user.email,
      action: log.action,
      module: log.module,
      recordId: log.recordId,
      oldValues: log.oldValues,
      newValues: log.newValues,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt,
    })),
    pagination: {
      page,
      limit,
      totalItems: total,
      pageCount: Math.ceil(total / limit),
    },
  };
}

export async function getAuditLogModules(): Promise<string[]> {
  const db = await getDb();
  const result = await db.auditLog.groupBy({
    by: ["module"],
  });
  return result.map((r) => r.module).filter(Boolean);
}

export async function getAuditLogActions(): Promise<string[]> {
  const db = await getDb();
  const result = await db.auditLog.groupBy({
    by: ["action"],
  });
  return result.map((r) => r.action).filter(Boolean);
}
