import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import type { PurchaseOrderSchema } from "@/modules/purchase/types";
import { getBusinessSettingsAction } from "@/modules/settings/actions";
import { formatAmountOnly } from "@/lib/utils";

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 10,
    color: "#18181b",
    backgroundColor: "#ffffff",
  },
  header: {
    padding: 16,
    color: "#ffffff",
    marginBottom: 18,
    backgroundColor: "#2563eb", // blue-600 premium brand color
    borderRadius: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 700,
  },
  row: {
    flexDirection: "row",
  },
  between: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  section: {
    marginBottom: 14,
  },
  grid: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f4f4f5",
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    marginBottom: 16,
  },
  muted: {
    color: "#71717a",
  },
  tableHeaderContainer: {
    backgroundColor: "#f4f4f5",
    borderBottomWidth: 1,
    borderBottomColor: "#d4d4d8",
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tableHeaderLabel: {
    fontWeight: "bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e4e4e7",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  
  // Column widths for Before Receiving (!isReceived)
  itemColBefore: {
    width: "40%",
  },
  altUnitColBefore: {
    width: "20%",
  },
  qtyColBefore: {
    width: "13%",
    textAlign: "right",
  },
  priceColBefore: {
    width: "13%",
    textAlign: "right",
  },
  totalColBefore: {
    width: "14%",
    textAlign: "right",
  },

  // Column widths for After Receiving (isReceived)
  itemColAfter: {
    width: "25%",
  },
  altUnitColAfter: {
    width: "12%",
  },
  qtyColAfter: {
    width: "9%",
    textAlign: "right",
  },
  receivedColAfter: {
    width: "9%",
    textAlign: "right",
  },
  priceColAfter: {
    width: "11%",
    textAlign: "right",
  },
  totalColAfter: {
    width: "11%",
    textAlign: "right",
  },
  statusColAfter: {
    width: "11%",
    textAlign: "center",
  },
  notesColAfter: {
    width: "12%",
  },

  totals: {
    marginLeft: "auto",
    width: 220,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 6,
    padding: 8,
    backgroundColor: "#fafafa",
  },
  totalsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#e4e4e7",
    paddingBottom: 4,
    marginBottom: 6,
    fontWeight: "bold",
  },
  totalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#a1a1aa",
    fontSize: 11,
    fontWeight: 700,
  },
  instructionsContainer: {
    width: "55%",
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 6,
    padding: 8,
    backgroundColor: "#fafafa",
  },
  instructionsTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#71717a",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 9,
    color: "#18181b",
  },
  footer: {
    marginTop: 24,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e4e4e7",
    textAlign: "center",
    color: "#71717a",
    fontSize: 8,
  },
  badgePending: {
    color: "#b45309",
    backgroundColor: "#fef3c7",
    fontSize: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    textAlign: "center",
  },
  badgeComplete: {
    color: "#047857",
    backgroundColor: "#d1fae5",
    fontSize: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    textAlign: "center",
  },
});

interface POPDFProps {
  po: PurchaseOrderSchema;
  businessName: string;
  pan: string;
  phone: string;
  address: string;
}

export function POPDF({ po, businessName, pan, phone, address }: POPDFProps) {
  const isReceived = ["PARTIAL", "RECEIVED"].includes(po.status);

  // Helper to format date strings for display
  const formatDateStr = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    
    // Convert to BS
    const bsYear = d.getFullYear() + 57;
    const bsMonth = String(((d.getMonth() + 8) % 12) + 1).padStart(2, "0");
    const bsDay = String(d.getDate()).padStart(2, "0");
    const bsDate = `${bsYear}-${bsMonth}-${bsDay}`;

    return `${bsDate} BS (${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})`;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.between}>
            <View>
              <Text style={styles.headerTitle}>{businessName}</Text>
              <Text style={{ fontSize: 9, opacity: 0.9 }}>
                PAN: {pan} | Phone: {phone}
              </Text>
              <Text style={{ fontSize: 9, opacity: 0.9 }}>{address}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 14, fontWeight: "bold" }}>PURCHASE ORDER</Text>
              <Text style={{ fontSize: 11, fontWeight: "bold", marginTop: 4 }}>
                {po.poNumber}
              </Text>
              <Text style={{ fontSize: 8, textTransform: "uppercase", opacity: 0.9, marginTop: 2 }}>
                Status: {po.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Vendor & General Grid */}
        <View style={styles.grid}>
          <View style={{ width: "50%" }}>
            <Text style={styles.instructionsTitle}>Supplier Background</Text>
            <Text style={{ fontSize: 10, fontWeight: "bold" }}>{po.supplierName}</Text>
            {po.supplierPanNumber && (
              <Text style={[styles.muted, { fontSize: 9, marginTop: 2 }]}>
                PAN: {po.supplierPanNumber}
              </Text>
            )}
            {po.supplierPhone && (
              <Text style={[styles.muted, { fontSize: 9, marginTop: 1 }]}>
                Phone: {po.supplierPhone}
              </Text>
            )}
          </View>
          <View style={{ width: "45%", alignItems: "flex-end" }}>
            <View style={{ marginBottom: 4 }}>
              <Text style={[styles.instructionsTitle, { textAlign: "right" }]}>Order Date</Text>
              <Text style={{ fontSize: 9, textAlign: "right" }}>{formatDateStr(po.orderDate)}</Text>
            </View>
            <View>
              <Text style={[styles.instructionsTitle, { textAlign: "right" }]}>Expected Delivery</Text>
              <Text style={{ fontSize: 9, textAlign: "right" }}>
                {po.status === "RECEIVED" && po.expectedDate ? formatDateStr(po.expectedDate) : ""}
              </Text>
            </View>
          </View>
        </View>

        {/* Items Table */}
        {isReceived ? (
          // After Receiving
          <View>
            <View style={styles.tableHeaderContainer}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.itemColAfter, styles.tableHeaderLabel]}>Product Item</Text>
                <Text style={[styles.altUnitColAfter, styles.tableHeaderLabel]}>Alternate Unit</Text>
                <Text style={[styles.qtyColAfter, styles.tableHeaderLabel]}>Ordered</Text>
                <Text style={[styles.receivedColAfter, styles.tableHeaderLabel]}>Received</Text>
                <Text style={[styles.priceColAfter, styles.tableHeaderLabel]}>Unit Price</Text>
                <Text style={[styles.totalColAfter, styles.tableHeaderLabel]}>Line Total</Text>
                <Text style={[styles.statusColAfter, styles.tableHeaderLabel]}>Status</Text>
                <Text style={[styles.notesColAfter, styles.tableHeaderLabel, { paddingLeft: 4 }]}>Notes</Text>
              </View>
              <View style={[styles.tableHeaderRow, { marginTop: 2 }]}>
                <Text style={[styles.itemColAfter, styles.tableHeaderLabel, { color: "#71717a" }]}></Text>
                <Text style={[styles.altUnitColAfter, styles.tableHeaderLabel, { color: "#71717a", fontSize: 7 }]}>(UoM)</Text>
                <Text style={[styles.qtyColAfter, styles.tableHeaderLabel, { color: "#71717a" }]}>Qty</Text>
                <Text style={[styles.receivedColAfter, styles.tableHeaderLabel, { color: "#71717a" }]}>Qty</Text>
                <Text style={[styles.priceColAfter, styles.tableHeaderLabel, { color: "#71717a" }]}>(NPR)</Text>
                <Text style={[styles.totalColAfter, styles.tableHeaderLabel, { color: "#71717a" }]}>(NPR)</Text>
                <Text style={[styles.statusColAfter, styles.tableHeaderLabel, { color: "#71717a" }]}></Text>
                <Text style={[styles.notesColAfter, styles.tableHeaderLabel, { color: "#71717a", paddingLeft: 4 }]}></Text>
              </View>
            </View>
            {po.items.map((item) => {
              const isComplete = item.receivedQty >= item.orderedQty;
              return (
                <View key={item.id} style={styles.tableRow}>
                  <View style={styles.itemColAfter}>
                    <Text style={{ fontWeight: "bold" }}>{item.productName}</Text>
                    <Text style={[styles.muted, { fontSize: 8, marginTop: 1 }]}>{item.productCode}</Text>
                  </View>
                  <Text style={styles.altUnitColAfter}>
                    {item.productPurchaseUnit && item.productPurchaseUnit !== item.productBaseUnit
                      ? `1 ${item.productPurchaseUnit} = ${Number(item.productPurchaseConversionFactor)} ${item.productBaseUnit}`
                      : "—"}
                  </Text>
                  <Text style={styles.qtyColAfter}>
                    {item.orderedQty} {item.productUnit}
                  </Text>
                  <Text style={[styles.receivedColAfter, { color: isComplete ? "#047857" : "#b45309" }]}>
                    {item.receivedQty} {item.productUnit}
                  </Text>
                  <Text style={styles.priceColAfter}>{formatAmountOnly(Number(item.unitPrice))}</Text>
                  <Text style={styles.totalColAfter}>{formatAmountOnly(Number(item.totalPrice))}</Text>
                  <View style={styles.statusColAfter}>
                    <Text style={isComplete ? styles.badgeComplete : styles.badgePending}>
                      {isComplete ? "RECEIVED" : "PENDING"}
                    </Text>
                  </View>
                  <Text style={[styles.notesColAfter, { fontSize: 8, color: "#52525b", paddingLeft: 4 }]}>
                    {item.notes || "—"}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          // Before Receiving
          <View>
            <View style={styles.tableHeaderContainer}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.itemColBefore, styles.tableHeaderLabel]}>Product Item</Text>
                <Text style={[styles.altUnitColBefore, styles.tableHeaderLabel]}>Alternate Unit</Text>
                <Text style={[styles.qtyColBefore, styles.tableHeaderLabel]}>Ordered</Text>
                <Text style={[styles.priceColBefore, styles.tableHeaderLabel]}>Unit Price</Text>
                <Text style={[styles.totalColBefore, styles.tableHeaderLabel]}>Line Total</Text>
              </View>
              <View style={[styles.tableHeaderRow, { marginTop: 2 }]}>
                <Text style={[styles.itemColBefore, styles.tableHeaderLabel, { color: "#71717a" }]}></Text>
                <Text style={[styles.altUnitColBefore, styles.tableHeaderLabel, { color: "#71717a", fontSize: 7 }]}>(UoM)</Text>
                <Text style={[styles.qtyColBefore, styles.tableHeaderLabel, { color: "#71717a" }]}>Qty</Text>
                <Text style={[styles.priceColBefore, styles.tableHeaderLabel, { color: "#71717a" }]}>(NPR)</Text>
                <Text style={[styles.totalColBefore, styles.tableHeaderLabel, { color: "#71717a" }]}>(NPR)</Text>
              </View>
            </View>
            {po.items.map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <View style={styles.itemColBefore}>
                  <Text style={{ fontWeight: "bold" }}>{item.productName}</Text>
                  <Text style={[styles.muted, { fontSize: 8, marginTop: 1 }]}>{item.productCode}</Text>
                </View>
                <Text style={styles.altUnitColBefore}>
                  {item.productPurchaseUnit && item.productPurchaseUnit !== item.productBaseUnit
                    ? `1 ${item.productPurchaseUnit} = ${Number(item.productPurchaseConversionFactor)} ${item.productBaseUnit}`
                    : "—"}
                </Text>
                <Text style={styles.qtyColBefore}>
                  {item.orderedQty} {item.productUnit}
                </Text>
                <Text style={styles.priceColBefore}>{""}</Text>
                <Text style={styles.totalColBefore}>{""}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Bottom Section: Instructions and Financial Totals */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginTop: 16 }}>
          {/* Procurement Instructions (only show after receiving, hide before receiving) */}
          <View style={{ width: "45%" }}>
            {isReceived && (
              <View style={styles.instructionsContainer}>
                <Text style={styles.instructionsTitle}>Procurement Instructions</Text>
                <Text style={styles.instructionsText}>
                  {po.notes || "No special procurement instructions provided."}
                </Text>
              </View>
            )}
          </View>

          {/* Totals Section */}
          <View style={styles.totals}>
            <View style={styles.totalsHeader}>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: "#71717a" }}>Summary</Text>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: "#71717a" }}>Amount (NPR)</Text>
            </View>
            
            <View style={styles.totalLine}>
              <Text style={styles.muted}>Subtotal:</Text>
              <Text>{isReceived ? formatAmountOnly(Number(po.subtotal)) : ""}</Text>
            </View>

            {Number(po.discountAmount) > 0 && (
              <View style={styles.totalLine}>
                <Text style={{ color: "#dc2626" }}>Discount:</Text>
                <Text style={{ color: "#dc2626" }}>
                  {isReceived ? `- ${formatAmountOnly(Number(po.discountAmount))}` : ""}
                </Text>
              </View>
            )}

            {Number(po.taxAmount) > 0 && (
              <View style={styles.totalLine}>
                <Text style={styles.muted}>VAT (13%):</Text>
                <Text>
                  {isReceived ? `+ ${formatAmountOnly(Number(po.taxAmount))}` : ""}
                </Text>
              </View>
            )}

            <View style={styles.grandTotal}>
              <Text style={{ fontWeight: "bold" }}>Total Amount:</Text>
              <Text style={{ fontWeight: "bold" }}>
                {isReceived ? formatAmountOnly(Number(po.totalAmount)) : ""}
              </Text>
            </View>

            <View style={[styles.totalLine, { fontSize: 8 }]}>
              <Text style={styles.muted}>Paid Amount:</Text>
              <Text>{isReceived ? formatAmountOnly(Number(po.paidAmount)) : ""}</Text>
            </View>

            <View style={[styles.totalLine, { fontSize: 9, color: "#ea580c" }]}>
              <Text style={{ fontWeight: "bold" }}>Balance Due:</Text>
              <Text style={{ fontWeight: "bold" }}>
                {isReceived ? formatAmountOnly(Number(po.balance)) : ""}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          This is a system generated document. Thank you for your partnership.
        </Text>
      </Page>
    </Document>
  );
}

let settingsPromise: Promise<Record<string, string>> | null = null;

async function getSetting(key: string, fallback: string): Promise<string> {
  if (!settingsPromise) {
    settingsPromise = getBusinessSettingsAction();
  }
  const settings = await settingsPromise;
  return settings[key] ?? fallback;
}

export async function generatePOPDF(po: PurchaseOrderSchema) {
  // Reset cached promise so fresh settings are fetched upon every invocation
  settingsPromise = null;

  const businessName = await getSetting("business_name", "NextGen Interior And WaterProofing");
  const pan = await getSetting("business_pan", "122782202");
  const phone = await getSetting("business_phone", "9843146474");
  const address = await getSetting("business_address", "Gauradaha Nagarpalika-02, Jhapa, Nepal");

  return pdf(
    <POPDF
      po={po}
      businessName={businessName}
      pan={pan}
      phone={phone}
      address={address}
    />
  ).toBlob();
}
