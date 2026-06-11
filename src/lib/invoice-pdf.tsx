import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import type { SalesInvoiceSchema } from "@/modules/sales/types";
import { getBusinessSettingsAction } from "@/modules/settings/actions";

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 10,
    color: "#18181b",
  },
  header: {
    padding: 16,
    color: "#ffffff",
    marginBottom: 18,
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
  muted: {
    color: "#71717a",
  },
  tableHeaderContainer: {
    backgroundColor: "#f4f4f5",
    borderBottom: "1px solid #d4d4d8",
    paddingVertical: 5,
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
    borderBottom: "1px solid #e4e4e7",
    paddingVertical: 6,
  },
  item: {
    width: "35%",
    paddingHorizontal: 4,
  },
  altUnit: {
    width: "15%",
    paddingHorizontal: 4,
  },
  qty: {
    width: "10%",
    textAlign: "right",
    paddingHorizontal: 4,
  },
  rate: {
    width: "20%",
    textAlign: "right",
    paddingHorizontal: 4,
  },
  total: {
    width: "20%",
    textAlign: "right",
    paddingHorizontal: 4,
  },
  totals: {
    marginLeft: "auto",
    width: 220,
    marginTop: 16,
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
    borderTop: "1px solid #a1a1aa",
    fontSize: 12,
    fontWeight: 700,
  },
  footer: {
    marginTop: 24,
    paddingTop: 10,
    borderTop: "1px solid #e4e4e7",
    textAlign: "center",
    color: "#71717a",
  },
  returnedRow: {
    backgroundColor: "#fffafb",
  },
  strikeText: {
    textDecoration: "line-through",
    color: "#71717a",
    fontSize: 8,
  },
  returnedText: {
    color: "#dc2626",
    fontSize: 8,
  },
  netText: {
    fontWeight: 700,
    fontSize: 9,
  },
  redBold: {
    color: "#dc2626",
    fontWeight: 700,
  },
});

function money(value: string | number) {
  const num = Number(value);
  const absVal = Math.abs(num).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return num < 0 ? `-${absVal}` : absVal;
}

interface InvoicePDFProps {
  invoice: SalesInvoiceSchema;
  businessName: string;
  pan: string;
  phone: string;
  address: string;
  terms: string;
  retailColor: string;
  wholesaleColor: string;
  projectColor: string;
}

export function InvoicePDF({
  invoice,
  businessName,
  pan,
  phone,
  address,
  terms,
  retailColor,
  wholesaleColor,
  projectColor,
}: InvoicePDFProps) {
  const invoiceColors: Record<string, string> = {
    RETAIL: retailColor,
    WHOLESALE: wholesaleColor,
    PROJECT: projectColor,
  };

  // Aggregate returns by product variant/ID for detailed row breakdown
  const returnsByProduct = new Map<
    string,
    {
      qty: number;
      totalPrice: number;
      details: Array<{ returnNumber: string; qty: number; notes: string | null }>;
    }
  >();

  if (invoice.returns) {
    for (const ret of invoice.returns) {
      for (const item of ret.items) {
        const existing = returnsByProduct.get(item.productId) || { qty: 0, totalPrice: 0, details: [] };
        existing.qty += item.qty;
        existing.totalPrice += Number(item.totalPrice);
        existing.details.push({
          returnNumber: ret.returnNumber,
          qty: item.qty,
          notes: ret.notes,
        });
        returnsByProduct.set(item.productId, existing);
      }
    }
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={[styles.header, { backgroundColor: invoiceColors[invoice.invoiceType] || retailColor }]}>
          <View style={styles.between}>
            <View>
              <Text style={styles.headerTitle}>{businessName}</Text>
              <Text>PAN: {pan} | Phone: {phone}</Text>
              <Text>{address}</Text>
            </View>
            <View>
              <Text>INVOICE</Text>
              <Text>{invoice.invoiceNumber}</Text>
              <Text>{invoice.invoiceType}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.between, styles.section]}>
          <View>
            <Text style={styles.muted}>Bill To</Text>
            <Text>{invoice.customerName}</Text>
            <Text>{invoice.customerAddress || "Address not provided"}</Text>
            <Text>PAN: {invoice.customerPanNumber || "-"}</Text>
          </View>
          <View>
            <Text>Invoice Date: {new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}</Text>
            <Text>Due Date: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-IN") : "-"}</Text>
            <Text>Status: {invoice.status}</Text>
          </View>
        </View>

        <View style={styles.tableHeaderContainer}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.item, styles.tableHeaderLabel]}>Item & Returns Description</Text>
            <Text style={[styles.altUnit, styles.tableHeaderLabel]}>Alternate Unit</Text>
            <Text style={[styles.qty, styles.tableHeaderLabel]}>Qty</Text>
            <Text style={[styles.rate, styles.tableHeaderLabel]}>Rate</Text>
            <Text style={[styles.total, styles.tableHeaderLabel]}>Total</Text>
          </View>
          <View style={[styles.tableHeaderRow, { marginTop: 2 }]}>
            <Text style={[styles.item, styles.tableHeaderLabel]}></Text>
            <Text style={[styles.altUnit, styles.tableHeaderLabel, { color: "#71717a", fontSize: 7 }]}>(UoM)</Text>
            <Text style={[styles.qty, styles.tableHeaderLabel]}></Text>
            <Text style={[styles.rate, styles.tableHeaderLabel, { color: "#71717a" }]}>(NPR)</Text>
            <Text style={[styles.total, styles.tableHeaderLabel, { color: "#71717a" }]}>(NPR)</Text>
          </View>
        </View>
        {invoice.items.map((item) => {
          const retInfo = returnsByProduct.get(item.productId);
          const isFullyReturned = retInfo && retInfo.qty >= item.qty;

          return (
            <View key={item.id} style={[styles.tableRow, isFullyReturned ? styles.returnedRow : {}]}>
              <View style={styles.item}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                  <Text style={{ fontWeight: 700 }}>{item.productName}</Text>
                  {isFullyReturned && (
                    <Text style={{ fontSize: 7, color: "#b91c1c", backgroundColor: "#fee2e2", paddingHorizontal: 4, borderRadius: 2, fontWeight: 700 }}>
                      Fully Returned
                    </Text>
                  )}
                  {retInfo && !isFullyReturned && (
                    <Text style={{ fontSize: 7, color: "#d97706", backgroundColor: "#fef3c7", paddingHorizontal: 4, borderRadius: 2, fontWeight: 700 }}>
                      Partially Returned
                    </Text>
                  )}
                </View>
                <Text style={styles.muted}>SKU: {item.productCode} {item.notes ? `| Notes: ${item.notes}` : ""}</Text>
                
                {retInfo && retInfo.details.map((d, idx) => (
                  <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 }}>
                    <Text style={{ fontSize: 7, fontWeight: 700, color: "#b91c1c", backgroundColor: "#fee2e2", paddingHorizontal: 3, borderRadius: 2 }}>
                      {d.returnNumber}
                    </Text>
                    <Text style={{ fontSize: 8, color: "#b91c1c" }}>
                      Returned: -{d.qty} {item.productUnit} {d.notes ? `— "${d.notes}"` : ""}
                    </Text>
                  </View>
                ))}
              </View>
              
              <Text style={styles.altUnit}>
                {item.productAltSalesUnit && item.productAltSalesUnit !== item.productBaseUnit
                  ? `1 ${item.productAltSalesUnit} = ${Number(item.productAltSalesConversionFactor)} ${item.productBaseUnit}`
                  : "—"}
              </Text>
              
              <View style={styles.qty}>
                {retInfo ? (
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.strikeText}>{item.qty} {item.productUnit}</Text>
                    <Text style={styles.returnedText}>-{retInfo.qty} {item.productUnit}</Text>
                    <Text style={styles.netText}>{item.qty - retInfo.qty} {item.productUnit}</Text>
                  </View>
                ) : (
                  <Text>{item.qty} {item.productUnit}</Text>
                )}
              </View>
              
              <View style={styles.rate}>
                <Text>{money(item.unitPrice)}</Text>
              </View>
              
              <View style={styles.total}>
                {retInfo ? (
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.strikeText}>{money(item.totalPrice)}</Text>
                    <Text style={styles.returnedText}>-{money(retInfo.totalPrice)}</Text>
                    <Text style={styles.netText}>{money(Number(item.totalPrice) - retInfo.totalPrice)}</Text>
                  </View>
                ) : (
                  <Text>{money(item.totalPrice)}</Text>
                )}
              </View>
            </View>
          );
        })}

        {(() => {
          const totalReturned = invoice.returns
            ? invoice.returns.reduce((sum, ret) => sum + Number(ret.totalAmount), 0)
            : 0;

          const netTotal = Number(invoice.totalAmount);
          const originalTotal = netTotal + totalReturned;

          const originalSubtotal = Number(invoice.subtotal);
          const originalDiscountAmount = Number(invoice.discountAmount);
          const originalVatAmount = Number(invoice.vatAmount);

          return (
            <View style={styles.totals}>
              <View style={styles.totalLine}>
                <Text style={styles.muted}>Original Subtotal</Text>
                <Text>{money(originalSubtotal)}</Text>
              </View>
              {originalDiscountAmount > 0 && (
                <View style={styles.totalLine}>
                  <Text style={styles.muted}>Original Discount</Text>
                  <Text>{money(originalDiscountAmount)}</Text>
                </View>
              )}
              {originalVatAmount > 0 && (
                <View style={styles.totalLine}>
                  <Text style={styles.muted}>Original VAT ({invoice.vatPercent}%)</Text>
                  <Text>{money(originalVatAmount)}</Text>
                </View>
              )}
              <View style={styles.totalLine}>
                <Text style={{ fontWeight: 700 }}>Original Total</Text>
                <Text style={{ fontWeight: 700 }}>{money(originalTotal)}</Text>
              </View>

              {totalReturned > 0 && (
                <>
                  <View style={styles.totalLine}>
                    <Text style={styles.redBold}>Total Returned (incl. VAT)</Text>
                    <Text style={styles.redBold}>-{money(totalReturned)}</Text>
                  </View>
                  <View style={styles.grandTotal}>
                    <Text>Net Invoice Value</Text>
                    <Text>{money(netTotal)}</Text>
                  </View>
                </>
              )}

              {totalReturned === 0 && (
                <View style={styles.grandTotal}>
                  <Text>Total Amount</Text>
                  <Text>{money(netTotal)}</Text>
                </View>
              )}

              <View style={[styles.totalLine, { fontSize: 8 }]}><Text style={styles.muted}>Amount Paid</Text><Text>{money(invoice.paidAmount)}</Text></View>
              <View style={[styles.totalLine, { fontSize: 9, color: "#ea580c" }]}><Text style={{ fontWeight: 700 }}>Balance Due</Text><Text style={{ fontWeight: 700 }}>{money(invoice.balanceAmount)}</Text></View>
            </View>
          );
        })()}

        <Text style={styles.footer}>Payment Method: {invoice.paymentMethod || "-"} | {terms}</Text>
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

export async function generateInvoicePDF(invoice: SalesInvoiceSchema) {
  // Reset cached promise so fresh settings are fetched upon every invocation
  settingsPromise = null;

  const businessName = await getSetting('business_name', 'NextGen Interior And WaterProofing');
  const pan = await getSetting('business_pan', '122782202');
  const phone = await getSetting('business_phone', '9843146474');
  const address = await getSetting('business_address', 'Gauradaha Nagarpalika-02, Jhapa, Nepal');
  const terms = await getSetting('invoice_terms', 'Thank you for your business!');

  const retailColor = await getSetting('invoice_color_retail', '#2563eb');
  const wholesaleColor = await getSetting('invoice_color_wholesale', '#16a34a');
  const projectColor = await getSetting('invoice_color_project', '#9333ea');

  return pdf(
    <InvoicePDF
      invoice={invoice}
      businessName={businessName}
      pan={pan}
      phone={phone}
      address={address}
      terms={terms}
      retailColor={retailColor}
      wholesaleColor={wholesaleColor}
      projectColor={projectColor}
    />
  ).toBlob();
}
