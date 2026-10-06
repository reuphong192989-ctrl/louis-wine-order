import { appendRow, readAllRows, updateRow } from "./core";

/** Small key/value settings edited in Quản trị (e.g. the Google Maps rating shown on the website). */
const TAB = "Settings";
const HEADERS = ["key", "value", "updatedAt", "updatedBy"];

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await readAllRows(TAB);
  return Object.fromEntries(rows.map((r) => [r.values.key, r.values.value ?? ""]));
}

export async function setSettings(values: Record<string, string>, username: string): Promise<void> {
  const rows = await readAllRows(TAB);
  const now = new Date().toISOString();
  for (const [key, value] of Object.entries(values)) {
    const record = { key, value, updatedAt: now, updatedBy: username };
    const row = rows.find((r) => r.values.key === key);
    if (row) await updateRow(TAB, row.rowNumber, HEADERS, record);
    else await appendRow(TAB, HEADERS, record);
  }
}

export type GoogleRating = { rating: number | null; count: number | null; reviewUrl: string | null };

export type BankAccountInfo = { bank: string; number: string; holder: string } | null;
export type BankAccounts = { noInvoice: BankAccountInfo; invoice: BankAccountInfo };

/**
 * The 2 accounts the manager configures in Quản trị → Dữ liệu for the cashier
 * screen: one for transfers that don't need a bill marked "cần xuất hoá đơn"
 * (for accounting follow-up), one that does. Purely a label picked at payment
 * time — no real bank integration.
 */
export async function getBankAccounts(): Promise<BankAccounts> {
  const s = await getSettings();
  const build = (prefix: string): BankAccountInfo => {
    const bank = s[`${prefix}Bank`] || "";
    const number = s[`${prefix}Number`] || "";
    const holder = s[`${prefix}Holder`] || "";
    return bank || number || holder ? { bank, number, holder } : null;
  };
  return { noInvoice: build("bankNoInvoice"), invoice: build("bankInvoice") };
}

// Rating on Google Maps when this was built (2026-09-29); the manager updates it in Quản trị → Dữ liệu.
const DEFAULT_GOOGLE_RATING = 4.7;

/** Google Maps rating typed in by the manager (no Google API / billing needed). Never throws. */
export async function getGoogleRating(): Promise<GoogleRating> {
  try {
    const s = await getSettings();
    const rating = s.googleRating === undefined ? DEFAULT_GOOGLE_RATING : Number(s.googleRating) || null;
    const count = Number(s.googleCount) || null;
    return { rating, count, reviewUrl: s.googleReviewUrl || null };
  } catch (e) {
    console.error("getGoogleRating failed", e);
    return { rating: DEFAULT_GOOGLE_RATING, count: null, reviewUrl: null };
  }
}
