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
 * Transfer account shown on the cashier screen / printed bill. Since 2026-10-10 the owner's
 * rule is: transfers go ONLY to the company account (and get a VAT invoice); a guest who
 * doesn't need an invoice pays cash. `noInvoice` is kept in the type for old bills but is
 * always null now — the personal account is never offered again, even if one was saved.
 */
// Company account given by the owner on 2026-10-10 — used until a manager saves another in Quản trị.
const DEFAULT_COMPANY_ACCOUNT: NonNullable<BankAccountInfo> = {
  bank: "SeABank - Ngân hàng TMCP Đông Nam Á",
  number: "3567979",
  holder: "CONG TY CO PHAN SU KIEN VA AM THUC LOUIS - CN DA NANG",
};

export async function getBankAccounts(): Promise<BankAccounts> {
  const s = await getSettings();
  const build = (prefix: string, fallback: NonNullable<BankAccountInfo>): BankAccountInfo => {
    const bank = s[`${prefix}Bank`] || "";
    const number = s[`${prefix}Number`] || "";
    const holder = s[`${prefix}Holder`] || "";
    return bank || number || holder ? { bank, number, holder } : fallback;
  };
  return { noInvoice: null, invoice: build("bankInvoice", DEFAULT_COMPANY_ACCOUNT) };
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
