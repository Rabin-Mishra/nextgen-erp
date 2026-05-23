import fs from "fs";
import path from "path";

export interface BusinessInfo {
  name: string;
  pan: string;
  address: string;
  phone: string;
  logoUrl?: string;
}

export interface InvoiceSettings {
  defaultVatRate: number; // e.g. 13 for 13%
  prefix: string; // e.g. "INV-"
  terms: string;
  colors: {
    RETAIL: string;
    WHOLESALE: string;
    PROJECT: string;
  };
}

export interface SystemSettings {
  businessInfo: BusinessInfo;
  invoiceSettings: InvoiceSettings;
}

const SETTINGS_FILE_PATH = path.join(process.cwd(), "src", "lib", "settings-store.json");

const defaultSettings: SystemSettings = {
  businessInfo: {
    name: "NextGen Interior And WaterProofing",
    pan: "122782202",
    address: "Gauradaha Nagarpalika-02, Jhapa, Nepal",
    phone: "9843146474",
    logoUrl: "",
  },
  invoiceSettings: {
    defaultVatRate: 13,
    prefix: "INV-",
    terms: "1. 50% advance payment required for project initiation.\n2. Goods once sold are not returnable without authorization.\n3. All disputes are subject to the jurisdiction of Jhapa, Nepal.",
    colors: {
      RETAIL: "#2563eb", // Blue
      WHOLESALE: "#16a34a", // Green
      PROJECT: "#9333ea", // Purple
    },
  },
};

let cachedSettings: SystemSettings | null = null;

export function getSystemSettings(): SystemSettings {
  if (cachedSettings) {
    return cachedSettings;
  }

  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const fileData = fs.readFileSync(SETTINGS_FILE_PATH, "utf-8");
      cachedSettings = JSON.parse(fileData);
      return cachedSettings!;
    }
  } catch (error) {
    console.error("Failed to read settings file, using defaults:", error);
  }

  // Fallback to default
  return defaultSettings;
}

export function saveSystemSettings(settings: SystemSettings): boolean {
  try {
    const dir = path.dirname(SETTINGS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2), "utf-8");
    cachedSettings = settings;
    return true;
  } catch (error) {
    console.error("Failed to write settings file:", error);
    return false;
  }
}
