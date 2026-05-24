"use server";

import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";
import type { PaymentMode } from "@/generated/prisma/client";
import {
  addPOItemSchema,
  createPurchaseOrderSchema,
  createSupplierSchema,
  receiveGoodsSchema,
  recordPurchasePaymentSchema,
  updatePurchaseOrderSchema,
  updateSupplierSchema,
  uploadBillSchema,
  type AddPOItemInput,
  type CreatePurchaseOrderInput,
  type CreateSupplierInput,
  type ReceiveGoodsInput,
  type RecordPurchasePaymentInput,
  type UpdatePurchaseOrderInput,
  type UpdateSupplierInput,
  type UploadBillInput,
} from "./types";
import { getPOById, getSuppliers, getActiveProducts, getVendorLedger } from "./queries";

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

function toDecimal(value: Decimal.Value | null | undefined) {
  return new Decimal(value ?? 0);
}

function normalizePaymentMode(method: RecordPurchasePaymentInput["paymentMethod"]): PaymentMode {
  return method === "BANK_TRANSFER" ? "BANK" : method;
}

async function nextCode(tx: any, model: "purchaseOrder" | "supplier", field: "poNumber" | "code", prefix: string) {
  const latest = await tx[model].findFirst({
    where: { [field]: { startsWith: `${prefix}-` } },
    orderBy: { [field]: "desc" },
  });
  const latestNumber = latest?.[field]?.split("-").at(-1);
  const nextNumber = Number.parseInt(latestNumber ?? "0", 10) + 1;
  return `${prefix}-${String(nextNumber).padStart(4, "0")}`;
}

async function getLatestSupplierBalance(tx: any, supplierId: string) {
  const latest = await tx.ledgerEntry.findFirst({
    where: { partyType: "SUPPLIER", partyId: supplierId },
    orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
  });
  return latest ? toDecimal(latest.runningBalance) : new Decimal(0);
}

export async function createPurchaseOrder(data: CreatePurchaseOrderInput, userId: string) {
  const parsed = createPurchaseOrderSchema.parse(data);
  const db = await getDb();

  const result = await db.$transaction(async (tx) => {
    const poNumber = await nextCode(tx, "purchaseOrder", "poNumber", "PO");
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
        createdBy: userId,
      },
    });

    await tx.purchaseOrderItem.createMany({
      data: parsed.items.map((item) => {
        const unitPrice = toDecimal(item.unitPrice);
        return {
          purchaseOrderId: po.id,
          productId: item.productId,
          orderedQty: item.orderedQty,
          receivedQty: 0,
          unitPrice,
          totalPrice: unitPrice.times(item.orderedQty),
          notes: item.notes,
        };
      }),
    });

    await tx.auditLog.create({
      data: {
        userId,
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
  const parsed = updatePurchaseOrderSchema.parse(data);
  const db = await getDb();

  const po = await db.purchaseOrder.findUnique({ where: { id } });
  if (!po) throw new Error("PO not found");
  if (po.status !== "DRAFT") throw new Error("Can only update draft POs");

  const result = await db.$transaction(async (tx) => {
    const discountAmount = parsed.discountAmount !== undefined ? toDecimal(parsed.discountAmount) : toDecimal(po.discountAmount);
    const taxAmount = parsed.taxAmount !== undefined ? toDecimal(parsed.taxAmount) : toDecimal(po.taxAmount);
    const totalAmount = toDecimal(po.subtotal).minus(discountAmount).plus(taxAmount);

    const updated = await tx.purchaseOrder.update({
      where: { id },
      data: {
        supplierId: parsed.supplierId ?? po.supplierId,
        orderDate: parsed.orderDate ? toDate(parsed.orderDate) : po.orderDate,
        expectedDate: parsed.expectedDate ? toDate(parsed.expectedDate) : po.expectedDate,
        notes: parsed.notes !== undefined ? parsed.notes : po.notes,
        discountAmount,
        taxAmount,
        totalAmount,
      },
    });

    await tx.auditLog.create({
      data: { userId, action: "UPDATE", module: "PURCHASE", recordId: id, newValues: parsed },
    });

    return updated;
  });

  return getPOById(result.id);
}

export async function addPOItem(data: AddPOItemInput, userId: string) {
  const parsed = addPOItemSchema.parse(data);
  const db = await getDb();

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
      data: { userId, action: "ADD_ITEM", module: "PURCHASE", recordId: parsed.purchaseOrderId, newValues: parsed },
    });

    return updated;
  });

  return getPOById(result.id);
}

export async function submitPurchaseOrder(id: string, userId: string) {
  const db = await getDb();
  const po = await db.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
  if (!po) throw new Error("PO not found");
  if (po.status !== "DRAFT") throw new Error("Can only submit draft POs");
  if (po.items.length === 0) throw new Error("Cannot submit a PO without items");

  const result = await db.$transaction(async (tx) => {
    const updated = await tx.purchaseOrder.update({ where: { id }, data: { status: "ORDERED" } });
    await tx.auditLog.create({
      data: { userId, action: "SUBMIT", module: "PURCHASE", recordId: id, newValues: { status: "ORDERED" } },
    });
    return updated;
  });

  return getPOById(result.id);
}

export async function receiveGoods(data: ReceiveGoodsInput, userId: string) {
  const parsed = receiveGoodsSchema.parse(data);
  const db = await getDb();

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

      const remainingQty = poItem.orderedQty - poItem.receivedQty;
      if (receiveItem.receivedQty > remainingQty) {
        throw new Error(`Cannot receive more than ${remainingQty} units for item ${poItem.id}`);
      }

      await tx.purchaseOrderItem.update({
        where: { id: receiveItem.poItemId },
        data: { receivedQty: poItem.receivedQty + receiveItem.receivedQty },
      });

      await tx.stockTransaction.create({
        data: {
          type: "PURCHASE_IN",
          productId: poItem.productId,
          warehouseId: parsed.warehouseId,
          quantity: receiveItem.receivedQty,
          unitCost: poItem.unitPrice,
          referenceType: "PURCHASE_ORDER",
          referenceId: po.id,
          notes: parsed.notes ?? `Received from PO ${po.poNumber}`,
          userId,
        },
      });

      await tx.inventoryStock.upsert({
        where: { productId_warehouseId: { productId: poItem.productId, warehouseId: parsed.warehouseId } },
        update: { quantity: { increment: receiveItem.receivedQty } },
        create: {
          productId: poItem.productId,
          warehouseId: parsed.warehouseId,
          quantity: receiveItem.receivedQty,
          reservedQty: 0,
        },
      });

      receivedValue = receivedValue.plus(toDecimal(poItem.unitPrice).times(receiveItem.receivedQty));
    }

    const refreshedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: po.id } });
    const allReceived = refreshedItems.every((item: any) => item.receivedQty >= item.orderedQty);
    const newStatus = allReceived ? "RECEIVED" : "PARTIAL";

    if (receivedValue.greaterThan(0)) {
      const previousBalance = await getLatestSupplierBalance(tx, po.supplierId);
      await tx.ledgerEntry.create({
        data: {
          entryDate: new Date(),
          partyType: "SUPPLIER",
          partyId: po.supplierId,
          entryType: "CREDIT",
          amount: receivedValue,
          referenceType: "PURCHASE",
          referenceId: po.id,
          description: `Goods received from PO ${po.poNumber}`,
          runningBalance: previousBalance.plus(receivedValue),
          channelType: "GENERAL",
          createdBy: userId,
        },
      });
    }

    const updatedPO = await tx.purchaseOrder.update({ where: { id: parsed.purchaseOrderId }, data: { status: newStatus } });
    await tx.auditLog.create({
      data: {
        userId,
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
  const parsed = recordPurchasePaymentSchema.parse(data);
  const db = await getDb();

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
        createdBy: userId,
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
        createdBy: userId,
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
        createdBy: userId,
      },
    });

    const updatedPO = await tx.purchaseOrder.update({
      where: { id: parsed.purchaseOrderId },
      data: { paidAmount: toDecimal(po.paidAmount).plus(paymentAmount) },
    });

    await tx.auditLog.create({
      data: {
        userId,
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

export async function uploadBill(data: UploadBillInput, userId: string) {
  const parsed = uploadBillSchema.parse(data);
  const db = await getDb();

  const po = await db.purchaseOrder.findUnique({ where: { id: parsed.purchaseOrderId } });
  if (!po) throw new Error("PO not found");

  const result = await db.$transaction(async (tx) => {
    const updated = await tx.purchaseOrder.update({
      where: { id: parsed.purchaseOrderId },
      data: { billImageUrl: parsed.billImageUrl },
    });
    await tx.auditLog.create({
      data: {
        userId,
        action: "UPLOAD_BILL",
        module: "PURCHASE",
        recordId: parsed.purchaseOrderId,
        newValues: { billImageUrl: parsed.billImageUrl },
      },
    });
    return updated;
  });

  return getPOById(result.id);
}

export async function cancelPurchaseOrder(id: string, userId: string) {
  const db = await getDb();
  const po = await db.purchaseOrder.findUnique({ where: { id } });
  if (!po) throw new Error("PO not found");
  if (!["DRAFT", "ORDERED"].includes(po.status)) throw new Error("Can only cancel draft or ordered POs");

  const result = await db.$transaction(async (tx) => {
    const updated = await tx.purchaseOrder.update({ where: { id }, data: { status: "CANCELLED" } });
    await tx.auditLog.create({
      data: { userId, action: "CANCEL", module: "PURCHASE", recordId: id, newValues: { status: "CANCELLED" } },
    });
    return updated;
  });

  return getPOById(result.id);
}

export async function createSupplier(data: CreateSupplierInput, userId: string) {
  const parsed = createSupplierSchema.parse(data);
  const db = await getDb();

  return db.$transaction(async (tx) => {
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
      data: { userId, action: "CREATE", module: "SUPPLIER", recordId: supplier.id, newValues: { code, name: parsed.name } },
    });

    return supplier;
  });
}

export async function updateSupplier(id: string, data: UpdateSupplierInput, userId: string) {
  const parsed = updateSupplierSchema.parse(data);
  const db = await getDb();

  const supplier = await db.supplier.findUnique({ where: { id } });
  if (!supplier) throw new Error("Supplier not found");

  return db.$transaction(async (tx) => {
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
      data: { userId, action: "UPDATE", module: "SUPPLIER", recordId: id, newValues: parsed },
    });

    return updated;
  });
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

export async function deleteSupplier(id: string, userId: string) {
  const db = await getDb();

  const supplier = await db.supplier.findUnique({ where: { id } });
  if (!supplier) throw new Error("Supplier not found");

  const poCount = await db.purchaseOrder.count({ where: { supplierId: id } });
  if (poCount > 0) {
    throw new Error(`Cannot delete. This supplier has ${poCount} purchase orders. Deactivate instead?`);
  }

  return db.$transaction(async (tx) => {
    const deleted = await tx.supplier.delete({ where: { id } });

    await tx.auditLog.create({
      data: {
        userId,
        action: "DELETE",
        module: "SUPPLIER",
        recordId: id,
        oldValues: supplier as any,
      },
    });

    revalidatePath("/purchase");
    return deleted;
  });
}



