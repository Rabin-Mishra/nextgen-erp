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
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f4f4f5",
    borderBottom: "1px solid #d4d4d8",
    paddingVertical: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #e4e4e7",
    paddingVertical: 6,
  },
  item: {
    width: "46%",
    paddingHorizontal: 4,
  },
  qty: {
    width: "12%",
    textAlign: "right",
    paddingHorizontal: 4,
  },
  amount: {
    width: "21%",
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
});

function money(value: string | number) {
  return `NPR ${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

        <View style={styles.tableHeader}>
          <Text style={styles.item}>Item</Text>
          <Text style={styles.qty}>Qty</Text>
          <Text style={styles.amount}>Rate</Text>
          <Text style={styles.amount}>Total</Text>
        </View>
        {invoice.items.map((item) => (
          <View key={item.id} style={styles.tableRow}>
            <Text style={styles.item}>{item.productName}</Text>
            <Text style={styles.qty}>{item.qty}</Text>
            <Text style={styles.amount}>{money(item.unitPrice)}</Text>
            <Text style={styles.amount}>{money(item.totalPrice)}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalLine}><Text>Subtotal</Text><Text>{money(invoice.subtotal)}</Text></View>
          <View style={styles.totalLine}><Text>Discount</Text><Text>{money(invoice.discountAmount)}</Text></View>
          <View style={styles.totalLine}><Text>VAT</Text><Text>{money(invoice.vatAmount)}</Text></View>
          <View style={styles.grandTotal}><Text>Total</Text><Text>{money(invoice.totalAmount)}</Text></View>
        </View>

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
