"use server";

import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";
import type { PaymentMode } from "@/generated/prisma/client";
import { nextCode, serializeForClient } from "@/lib/utils";
import {
  addPOItemSchema,
  createPurchaseOrderSchema,
  createSupplierSchema,
  receiveGoodsSchema,
  recordPurchasePaymentSchema,
  updatePurchaseOrderSchema,
  updateSupplierSchema,
  type AddPOItemInput,
  type CreatePurchaseOrderInput,
  type CreateSupplierInput,
  type ReceiveGoodsInput,
  type RecordPurchasePaymentInput,
  type UpdatePurchaseOrderInput,
  type UpdateSupplierInput,
} from "./types";
import { checkServerPermission } from "@/auth/permissions.server";
import { getSystemSettings } from "@/lib/settings-store";
import { getPOById, getSuppliers, getActiveProducts, getVendorLedger, getSupplierById } from "./queries";

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

function toDecimal(value: Decimal.Value | null | undefined) {
  return new Decimal(value ?? 0);
}

function normalizePaymentMode(method: RecordPurchasePaymentInput["paymentMethod"]): PaymentMode {
  return method === "BANK_TRANSFER" ? "BANK" : method;
}


async function getLatestSupplierBalance(tx: any, supplierId: string) {
  const latest = await tx.ledgerEntry.findFirst({
    where: { partyType: "SUPPLIER", partyId: supplierId },
    orderBy: { createdAt: "desc" },
  });
  return latest ? toDecimal(latest.runningBalance) : new Decimal(0);
}

async function resolveActiveUserId(db: any, userId: string): Promise<string> {
  if (!userId) {
    const fallbackUser = await db.user.findFirst({
      where: { isActive: true },
      select: { id: true }
    });
    if (fallbackUser) return fallbackUser.id;
    throw new Error("No active user found in the database. Please seed the database first.");
  }

  const userExists = await db.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });

  if (userExists) {
    return userId;
  }

  const fallbackUser = await db.user.findFirst({
    where: { isActive: true },
    select: { id: true }
  });

  if (fallbackUser) {
    return fallbackUser.id;
  }

  throw new Error("No active user found in the database. Please seed the database first.");
}

export async function createPurchaseOrder(data: CreatePurchaseOrderInput, userId: string) {
  await checkServerPermission("purchase", "create");
  const parsed = createPurchaseOrderSchema.parse(data);
  const db = await getDb();
  const activeUserId = await resolveActiveUserId(db, userId);

  const result = await db.$transaction(async (tx) => {
    const settings = getSystemSettings();
    const rawPrefix = settings?.invoiceSettings?.poPrefix || "PO";
    const prefix = rawPrefix.endsWith("-") ? rawPrefix.slice(0, -1) : rawPrefix;
    const poNumber = await nextCode(tx, "purchaseOrder", "poNumber", prefix);
    const subtotal = parsed.items.reduce(
      (sum, item) => sum.plus(toDecimal(item.unitPrice).times(item.orderedQty)),
      new Decimal(0)
    );
    const discountAmount = toDecimal(parsed.discountAmount);
    const taxAmount = toDecimal(parsed.taxAmount);
    const totalAmount = subtotal.minus(discountAmount).plus(taxAmount);

    const po = await tx.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: parsed.supplierId,
        status: "DRAFT",
        orderDate: toDate(parsed.orderDate),
        expectedDate: parsed.expectedDate ? toDate(parsed.expectedDate) : null,
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        paidAmount: new Decimal(0),
        notes: parsed.notes,
        createdBy: activeUserId,
      },
    });

    for (const item of parsed.items) {
      const unitPrice = toDecimal(item.unitPrice);
      const factor = toDecimal(item.conversionFactor ?? 1);
      const baseQtyEquivalent = toDecimal(item.orderedQty).times(factor);

      await tx.purchaseOrderItem.create({
        data: {
          purchaseOrderId: po.id,
          productId: item.productId,
          orderedQty: item.orderedQty,
          receivedQty: 0,
          unitPrice,
          totalPrice: unitPrice.times(item.orderedQty),
          notes: item.notes,
          orderedUnit: item.orderedUnit || null,
          conversionFactor: factor,
          baseQtyEquivalent: baseQtyEquivalent,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: activeUserId,
        action: "CREATE",
        module: "PURCHASE",
        recordId: po.id,
        newValues: { poNumber, status: "DRAFT", itemsCount: parsed.items.length },
      },
    });

    return po;
  });

  return getPOById(result.id);
}

export async function updatePurchaseOrder(id: string, data: UpdatePurchaseOrderInput, userId: string) {
  await checkServerPermission("purchase", "edit");
  const parsed = updatePurchaseOrderSchema.parse(data);
  const db = await getDb();
  const activeUserId = await resolveActiveUserId(db, userId);

  const po = await db.purchaseOrder.findUnique({ where: { id } });
  if (!po) throw new Error("PO not found");

  const result = await db.$transaction(async (tx) => {
    // 1. If items are updated (only allowed for DRAFT POs)
    if (parsed.items) {
      if (po.status !== "DRAFT") {
        throw new Error("Can only edit items of a draft purchase order");
      }
      if (parsed.items.length === 0) {
        throw new Error("Purchase Order must have at least one line item");
      }

      // Identify existing database item IDs for this PO
      const existingItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id },
        select: { id: true },
      });
      const existingIds = existingItems.map((item: any) => item.id);

      // Identify which database records to delete
      const incomingIds = parsed.items
        .map((item: any) => item.id)
        .filter(Boolean) as string[];
      const idsToDelete = existingIds.filter((id) => !incomingIds.includes(id));

      if (idsToDelete.length > 0) {
        await tx.purchaseOrderItem.deleteMany({
          where: { id: { in: idsToDelete } },
        });
      }

      // Update existing ones or create new ones
      for (const item of parsed.items) {
        if (item.id) {
          const currentItem = await tx.purchaseOrderItem.findUnique({
            where: { id: item.id }
          });
          const activePrice = item.unitPrice !== undefined ? toDecimal(item.unitPrice) : toDecimal(currentItem?.unitPrice);
          const activeFactor = toDecimal(item.conversionFactor ?? currentItem?.conversionFactor ?? 1);
          const baseQtyEquivalent = toDecimal(item.orderedQty).times(activeFactor);

          await tx.purchaseOrderItem.update({
            where: { id: item.id },
            data: {
              orderedQty: item.orderedQty,
              unitPrice: activePrice,
              totalPrice: activePrice.times(item.orderedQty),
              orderedUnit: item.orderedUnit || currentItem?.orderedUnit || null,
              conversionFactor: activeFactor,
              baseQtyEquivalent,
              notes: item.notes !== undefined ? item.notes : currentItem?.notes,
            }
          });
        } else if (item.productId) {
          const activePrice = toDecimal(item.unitPrice);
          const activeFactor = toDecimal(item.conversionFactor ?? 1);
          const baseQtyEquivalent = toDecimal(item.orderedQty).times(activeFactor);

          await tx.purchaseOrderItem.create({
            data: {
              purchaseOrderId: id,
              productId: item.productId,
              orderedQty: item.orderedQty,
              receivedQty: 0,
              unitPrice: activePrice,
              totalPrice: activePrice.times(item.orderedQty),
              orderedUnit: item.orderedUnit || null,
              conversionFactor: activeFactor,
              baseQtyEquivalent,
              notes: item.notes || null,
            }
          });
        }
      }
    }

    // 2. Refetch items to get correct subtotal
    const refreshedItems = await tx.purchaseOrderItem.findMany({
      where: { purchaseOrderId: id }
    });
    const subtotal = refreshedItems.reduce((sum: Decimal, item: any) => sum.plus(new Decimal(item.totalPrice)), new Decimal(0));

    const discountAmount = parsed.discountAmount !== undefined ? toDecimal(parsed.discountAmount) : toDecimal(po.discountAmount);
    const taxAmount = parsed.taxAmount !== undefined ? toDecimal(parsed.taxAmount) : toDecimal(po.taxAmount);
    const totalAmount = subtotal.minus(discountAmount).plus(taxAmount);

    const updated = await tx.purchaseOrder.update({
      where: { id },
      data: {
        supplierId: parsed.supplierId ?? po.supplierId,
        orderDate: parsed.orderDate ? toDate(parsed.orderDate) : po.orderDate,
        expectedDate: parsed.expectedDate ? toDate(parsed.expectedDate) : po.expectedDate,
        notes: parsed.notes !== undefined ? parsed.notes : po.notes,
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
      },
    });

    await tx.auditLog.create({
      data: { userId: activeUserId, action: "UPDATE", module: "PURCHASE", recordId: id, newValues: parsed },
    });

    return updated;
  });

  return getPOById(result.id);
}

export async function addPOItem(data: AddPOItemInput, userId: string) {
  await checkServerPermission("purchase", "edit");
  const parsed = addPOItemSchema.parse(data);
  const db = await getDb();
  const activeUserId = await resolveActiveUserId(db, userId);

  const po = await db.purchaseOrder.findUnique({
    where: { id: parsed.purchaseOrderId },
    include: { items: true },
  });
  if (!po) throw new Error("PO not found");
  if (po.status !== "DRAFT") throw new Error("Can only add items to draft POs");

  const result = await db.$transaction(async (tx) => {
    const unitPrice = toDecimal(parsed.unitPrice);
    const totalPrice = unitPrice.times(parsed.orderedQty);

    await tx.purchaseOrderItem.create({
      data: {
        purchaseOrderId: parsed.purchaseOrderId,
        productId: parsed.productId,
        orderedQty: parsed.orderedQty,
        receivedQty: 0,
        unitPrice,
        totalPrice,
        notes: parsed.notes,
      },
    });

    const subtotal = po.items.reduce((sum, item) => sum.plus(item.totalPrice), new Decimal(0)).plus(totalPrice);
    const totalAmount = subtotal.minus(po.discountAmount).plus(po.taxAmount);
    const updated = await tx.purchaseOrder.update({
      where: { id: parsed.purchaseOrderId },
      data: { subtotal, totalAmount },
    });

    await tx.auditLog.create({
      data: { userId: activeUserId, action: "ADD_ITEM", module: "PURCHASE", recordId: parsed.purchaseOrderId, newValues: parsed },
    });

    return updated;
  });

  return getPOById(result.id);
}

export async function submitPurchaseOrder(id: string, userId: string) {
  await checkServerPermission("purchase", "edit");
  const db = await getDb();
  const activeUserId = await resolveActiveUserId(db, userId);
  const po = await db.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
  if (!po) throw new Error("PO not found");
  if (po.status !== "DRAFT") throw new Error("Can only submit draft POs");
  if (po.items.length === 0) throw new Error("Cannot submit a PO without items");

  const result = await db.$transaction(async (tx) => {
    const updated = await tx.purchaseOrder.update({ where: { id }, data: { status: "ORDERED" } });
    await tx.auditLog.create({
      data: { userId: activeUserId, action: "SUBMIT", module: "PURCHASE", recordId: id, newValues: { status: "ORDERED" } },
    });
    return updated;
  });

  return getPOById(result.id);
}

export async function receiveGoods(data: ReceiveGoodsInput, userId: string) {
  await checkServerPermission("purchase", "edit");
  const parsed = receiveGoodsSchema.parse(data);
  const db = await getDb();
  const activeUserId = await resolveActiveUserId(db, userId);

  const po = await db.purchaseOrder.findUnique({
    where: { id: parsed.purchaseOrderId },
    include: { items: true, supplier: true },
  });
  if (!po) throw new Error("PO not found");
  if (!["ORDERED", "PARTIAL"].includes(po.status)) {
    throw new Error("Can only receive goods for ordered or partial POs");
  }

  const result = await db.$transaction(async (tx) => {
    let receivedValue = new Decimal(0);
    const itemIds = parsed.items.map((item) => item.poItemId);
    const currentItems = await tx.purchaseOrderItem.findMany({ where: { id: { in: itemIds }, purchaseOrderId: po.id } });

    for (const receiveItem of parsed.items) {
      const poItem = currentItems.find((item: any) => item.id === receiveItem.poItemId);
      if (!poItem) throw new Error(`PO item ${receiveItem.poItemId} not found`);

      const remainingQty = toDecimal(poItem.orderedQty).minus(poItem.receivedQty);
      if (toDecimal(receiveItem.receivedQty).greaterThan(remainingQty)) {
        throw new Error(`Cannot receive more than ${remainingQty.toNumber()} units for item ${poItem.id}`);
      }

      const activePrice = toDecimal(receiveItem.receivedPrice);
      const factor = toDecimal(poItem.conversionFactor ?? 1);
      const baseReceivedQty = toDecimal(receiveItem.receivedQty).times(factor);

      await tx.purchaseOrderItem.update({
        where: { id: receiveItem.poItemId },
        data: {
          receivedQty: toDecimal(poItem.receivedQty).plus(receiveItem.receivedQty),
          unitPrice: activePrice,
          totalPrice: activePrice.times(poItem.orderedQty),
        },
      });

      await tx.stockTransaction.create({
        data: {
          type: "PURCHASE_IN",
          productId: poItem.productId,
          warehouseId: parsed.warehouseId,
          quantity: baseReceivedQty,
          unitCost: activePrice.div(factor),
          referenceType: "PURCHASE_ORDER",
          referenceId: po.id,
          notes: parsed.notes ?? `Received from PO ${po.poNumber}`,
          userId: activeUserId,
          transactionUnit: poItem.orderedUnit,
          conversionFactor: factor,
          originalQty: receiveItem.receivedQty,
        },
      });

      await tx.inventoryStock.upsert({
        where: { productId_warehouseId: { productId: poItem.productId, warehouseId: parsed.warehouseId } },
        update: { quantity: { increment: baseReceivedQty } },
        create: {
          productId: poItem.productId,
          warehouseId: parsed.warehouseId,
          quantity: baseReceivedQty,
          reservedQty: 0,
        },
      });

      receivedValue = receivedValue.plus(activePrice.times(receiveItem.receivedQty));
    }

    const subtotalVal = receivedValue;
    const vatAmountVal = parsed.applyVat ? subtotalVal.times(0.13) : new Decimal(0);
    const totalAmountVal = subtotalVal.plus(vatAmountVal);

    const refreshedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: po.id } });
    const allReceived = refreshedItems.every((item: any) => item.receivedQty >= item.orderedQty);
    const newStatus = allReceived ? "RECEIVED" : "PARTIAL";

    const newSubtotal = refreshedItems.reduce((sum: Decimal, item: any) => sum.plus(new Decimal(item.unitPrice).times(item.orderedQty)), new Decimal(0));
    const newTax = parsed.applyVat ? newSubtotal.times(0.13) : new Decimal(0);
    const newTotal = newSubtotal.plus(newTax);

    if (totalAmountVal.greaterThan(0)) {
      const previousBalance = await getLatestSupplierBalance(tx, po.supplierId);
      await tx.ledgerEntry.create({
        data: {
          entryDate: new Date(),
          partyType: "SUPPLIER",
          partyId: po.supplierId,
          entryType: "CREDIT",
          amount: totalAmountVal,
          referenceType: "PURCHASE",
          referenceId: po.id,
          description: `Goods received PO-${po.poNumber} (Subtotal: NPR ${subtotalVal.toNumber()}, VAT: NPR ${vatAmountVal.toNumber()})`,
          runningBalance: previousBalance.plus(totalAmountVal),
          channelType: "GENERAL",
          createdBy: activeUserId,
        },
      });
    }

    let expectedDateVal = po.expectedDate;
    let notesVal = po.notes;

    if (newStatus === "RECEIVED") {
      expectedDateVal = new Date();
    } else if (newStatus === "PARTIAL") {
      const dateStr = new Date().toLocaleDateString("en-IN");
      const partialLine = `[Partial Receipt: ${dateStr}]`;
      if (!notesVal) {
        notesVal = partialLine;
      } else if (!notesVal.includes(partialLine)) {
        notesVal = `${notesVal}\n${partialLine}`;
      }
    }

    const updatedPO = await tx.purchaseOrder.update({
      where: { id: parsed.purchaseOrderId },
      data: {
        status: newStatus,
        subtotal: newSubtotal,
        taxAmount: newTax,
        totalAmount: newTotal,
        expectedDate: expectedDateVal,
        notes: notesVal,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: activeUserId,
        action: "RECEIVE_GOODS",
        module: "PURCHASE",
        recordId: parsed.purchaseOrderId,
        newValues: { status: newStatus, receivedValue: receivedValue.toString() },
      },
    });
    return updatedPO;
  });

  return getPOById(result.id);
}

export async function recordPurchasePayment(data: RecordPurchasePaymentInput, userId: string) {
  await checkServerPermission("purchase", "create");
  const parsed = recordPurchasePaymentSchema.parse(data);
  const db = await getDb();
  const activeUserId = await resolveActiveUserId(db, userId);

  const po = await db.purchaseOrder.findUnique({ where: { id: parsed.purchaseOrderId }, include: { supplier: true } });
  if (!po) throw new Error("PO not found");

  const paymentAmount = toDecimal(parsed.amount);
  const balance = toDecimal(po.totalAmount).minus(po.paidAmount);
  if (paymentAmount.lessThanOrEqualTo(0)) throw new Error("Payment amount must be greater than zero");
  if (paymentAmount.greaterThan(balance)) {
    throw new Error(`Payment amount (${paymentAmount.toString()}) exceeds balance (${balance.toString()})`);
  }

  const result = await db.$transaction(async (tx) => {
    const paymentMethod = normalizePaymentMode(parsed.paymentMethod);
    const paymentDate = toDate(parsed.paymentDate);

    await tx.payment.create({
      data: {
        referenceType: "PURCHASE",
        referenceId: po.id,
        partyType: "SUPPLIER",
        partyId: po.supplierId,
        amount: paymentAmount,
        paymentMethod,
        paymentDate,
        notes: parsed.reference ? `${parsed.reference}${parsed.notes ? ` - ${parsed.notes}` : ""}` : parsed.notes,
        createdBy: activeUserId,
      },
    });

    const previousBalance = await getLatestSupplierBalance(tx, po.supplierId);
    await tx.ledgerEntry.create({
      data: {
        entryDate: paymentDate,
        partyType: "SUPPLIER",
        partyId: po.supplierId,
        entryType: "DEBIT",
        amount: paymentAmount,
        referenceType: "PURCHASE",
        referenceId: po.id,
        description: `Payment against PO ${po.poNumber}`,
        runningBalance: previousBalance.minus(paymentAmount),
        channelType: "GENERAL",
        createdBy: activeUserId,
      },
    });

    await tx.cashBookEntry.create({
      data: {
        entryDate: paymentDate,
        type: "PAID",
        amount: paymentAmount,
        description: `Payment for PO ${po.poNumber}`,
        partyType: "SUPPLIER",
        partyId: po.supplierId,
        referenceType: "PURCHASE",
        referenceId: po.id,
        paymentMethod,
        createdBy: activeUserId,
      },
    });

    const updatedPO = await tx.purchaseOrder.update({
      where: { id: parsed.purchaseOrderId },
      data: { paidAmount: toDecimal(po.paidAmount).plus(paymentAmount) },
    });

    await tx.auditLog.create({
      data: {
        userId: activeUserId,
        action: "RECORD_PAYMENT",
        module: "PURCHASE",
        recordId: parsed.purchaseOrderId,
        newValues: { paidAmount: updatedPO.paidAmount.toString(), paymentMethod },
      },
    });

    return updatedPO;
  });

  return getPOById(result.id);
}



export async function cancelPurchaseOrder(id: string, userId: string) {
  await checkServerPermission("purchase", "delete");
  const db = await getDb();
  const activeUserId = await resolveActiveUserId(db, userId);
  const po = await db.purchaseOrder.findUnique({ where: { id } });
  if (!po) throw new Error("PO not found");
  if (!["DRAFT", "ORDERED"].includes(po.status)) throw new Error("Can only cancel draft or ordered POs");

  const result = await db.$transaction(async (tx) => {
    const updated = await tx.purchaseOrder.update({ where: { id }, data: { status: "CANCELLED" } });
    await tx.auditLog.create({
      data: { userId: activeUserId, action: "CANCEL", module: "PURCHASE", recordId: id, newValues: { status: "CANCELLED" } },
    });
    return updated;
  });

  return getPOById(result.id);
}

export async function createSupplier(data: CreateSupplierInput, userId: string) {
  await checkServerPermission("purchase", "create");
  const parsed = createSupplierSchema.parse(data);
  const db = await getDb();
  const activeUserId = await resolveActiveUserId(db, userId);

  const result = await db.$transaction(async (tx) => {
    const code = parsed.code || (await nextCode(tx, "supplier", "code", "SUP"));
    const supplier = await tx.supplier.create({
      data: {
        code,
        name: parsed.name,
        contactPerson: parsed.contactPerson,
        phone: parsed.phone,
        email: parsed.email,
        address: parsed.address,
        panNumber: parsed.panNumber,
        openingBalance: toDecimal(parsed.openingBalance),
        notes: parsed.notes,
        isActive: parsed.isActive ?? true,
      },
    });

    await tx.auditLog.create({
      data: { userId: activeUserId, action: "CREATE", module: "SUPPLIER", recordId: supplier.id, newValues: { code, name: parsed.name } },
    });

    return supplier;
  });

  revalidatePath("/purchase");
  return serializeForClient(result);
}

export async function updateSupplier(id: string, data: UpdateSupplierInput, userId: string) {
  await checkServerPermission("purchase", "edit");
  const parsed = updateSupplierSchema.parse(data);
  const db = await getDb();
  const activeUserId = await resolveActiveUserId(db, userId);

  const supplier = await db.supplier.findUnique({ where: { id } });
  if (!supplier) throw new Error("Supplier not found");

  const result = await db.$transaction(async (tx) => {
    const updated = await tx.supplier.update({
      where: { id },
      data: {
        code: parsed.code ?? supplier.code,
        name: parsed.name ?? supplier.name,
        contactPerson: parsed.contactPerson !== undefined ? parsed.contactPerson : supplier.contactPerson,
        phone: parsed.phone !== undefined ? parsed.phone : supplier.phone,
        email: parsed.email !== undefined ? parsed.email : supplier.email,
        address: parsed.address !== undefined ? parsed.address : supplier.address,
        panNumber: parsed.panNumber !== undefined ? parsed.panNumber : supplier.panNumber,
        openingBalance: parsed.openingBalance !== undefined ? toDecimal(parsed.openingBalance) : supplier.openingBalance,
        notes: parsed.notes !== undefined ? parsed.notes : supplier.notes,
        isActive: parsed.isActive !== undefined ? parsed.isActive : supplier.isActive,
      },
    });

    await tx.auditLog.create({
      data: { userId: activeUserId, action: "UPDATE", module: "SUPPLIER", recordId: id, newValues: parsed },
    });

    return updated;
  });

  revalidatePath("/purchase");
  return serializeForClient(result);
}

export async function getPurchaseLookups() {
  const suppliersResp = await getSuppliers();
  const products = await getActiveProducts();
  return {
    suppliers: suppliersResp.data,
    products,
  };
}

export async function fetchSupplierLedger(supplierId: string) {
  return getVendorLedger(supplierId);
}

export async function fetchSupplierDetails(supplierId: string) {
  return getSupplierById(supplierId);
}

export async function deleteSupplier(id: string, userId: string) {
  await checkServerPermission("purchase", "delete");
  const db = await getDb();
  const activeUserId = await resolveActiveUserId(db, userId);

  const supplier = await db.supplier.findUnique({ where: { id } });
  if (!supplier) throw new Error("Supplier not found");

  const poCount = await db.purchaseOrder.count({ where: { supplierId: id } });
  if (poCount > 0) {
    throw new Error(`Cannot delete. This supplier has ${poCount} purchase orders. Deactivate instead?`);
  }

  const result = await db.$transaction(async (tx) => {
    const deleted = await tx.supplier.delete({ where: { id } });

    await tx.auditLog.create({
      data: {
        userId: activeUserId,
        action: "DELETE",
        module: "SUPPLIER",
        recordId: id,
        oldValues: supplier as any,
      },
    });

    return deleted;
  });

  revalidatePath("/purchase");
  return serializeForClient(result);
}

export async function deletePurchaseOrder(id: string, userId: string) {
  await checkServerPermission("purchase", "delete");
  const db = await getDb();
  const activeUserId = await resolveActiveUserId(db, userId);

  const po = await db.purchaseOrder.findUnique({ where: { id } });
  if (!po) throw new Error("Purchase order not found");

  if (po.status !== "CANCELLED") {
    throw new Error("Only cancelled purchase orders can be deleted.");
  }

  const result = await db.$transaction(async (tx) => {
    await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
    const deleted = await tx.purchaseOrder.delete({ where: { id } });

    await tx.auditLog.create({
      data: {
        userId: activeUserId,
        action: "DELETE",
        module: "PURCHASE",
        recordId: id,
        oldValues: po as any,
      },
    });

    return deleted;
  });

  revalidatePath("/purchase");
  return serializeForClient(result);
}

export async function createPurchaseReturn(data: {
  supplierId: string;
  notes: string;
  items: Array<{ productId: string; qty: number; unitPrice: number }>;
}, userId: string) {
  await checkServerPermission("purchase", "create");
  const db = await getDb();
  const activeUserId = await resolveActiveUserId(db, userId);

  const result = await db.$transaction(async (tx) => {
    const returnNumber = await nextCode(tx, "purchaseReturn", "returnNumber", "PRN");
    const totalAmount = data.items.reduce((sum, item) => sum.plus(new Decimal(item.unitPrice).times(item.qty)), new Decimal(0));

    const pr = await tx.purchaseReturn.create({
      data: {
        returnNumber,
        supplierId: data.supplierId,
        returnDate: new Date(),
        status: "PROCESSED",
        totalAmount,
        notes: data.notes,
        createdBy: activeUserId,
      },
    });

    for (const item of data.items) {
      await tx.purchaseReturnItem.create({
        data: {
          purchaseReturnId: pr.id,
          productId: item.productId,
          qty: item.qty,
          unitPrice: new Decimal(item.unitPrice),
          totalPrice: new Decimal(item.unitPrice).times(item.qty),
        },
      });

      // Stock transaction RETURN_OUT (negative quantity)
      const stock = await tx.inventoryStock.findFirst({
        where: { productId: item.productId },
      });
      const warehouseId = stock?.warehouseId ?? (await tx.warehouse.findFirst({ select: { id: true } }))?.id;
      if (!warehouseId) throw new Error("No warehouse configured to return stock from.");

      await tx.stockTransaction.create({
        data: {
          type: "RETURN_OUT",
          productId: item.productId,
          warehouseId,
          quantity: -item.qty,
          unitCost: new Decimal(item.unitPrice),
          referenceType: "PURCHASE_RETURN",
          referenceId: pr.id,
          notes: data.notes,
          userId: activeUserId,
        },
      });

      // Decrement inventory stock
      if (stock) {
        await tx.inventoryStock.update({
          where: { id: stock.id },
          data: { quantity: { decrement: item.qty } },
        });
      }
    }

    // Ledger DEBIT bookkeeping (our payables are reduced)
    const previousBalance = await getLatestSupplierBalance(tx, data.supplierId);
    await tx.ledgerEntry.create({
      data: {
        entryDate: new Date(),
        partyType: "SUPPLIER",
        partyId: data.supplierId,
        entryType: "DEBIT",
        amount: totalAmount,
        referenceType: "PURCHASE_RETURN",
        referenceId: pr.id,
        description: `Purchase Return ${returnNumber}: ${data.notes}`,
        runningBalance: previousBalance.minus(totalAmount),
        channelType: "GENERAL",
        createdBy: activeUserId,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: activeUserId,
        action: "RETURN_OUT",
        module: "PURCHASE",
        recordId: pr.id,
        newValues: { returnNumber, totalAmount: totalAmount.toString() },
      },
    });

    return pr;
  });

  revalidatePath("/purchase");
  return serializeForClient(result);
}

export async function fetchPOByIdAction(id: string) {
  const order = await getPOById(id);
  return serializeForClient(order);
}

export async function getProductStockLevels(productIds: string[]) {
  const db = await getDb();
  const stocks = await db.inventoryStock.findMany({
    where: { productId: { in: productIds } },
    select: { productId: true, quantity: true },
  });
  const stockMap: Record<string, number> = {};
  for (const s of stocks) {
    stockMap[s.productId] = Number(s.quantity.toString());
  }
  return stockMap;
}



