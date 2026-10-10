/**
 * VietQR (NAPAS 247 "chuyển nhanh đến tài khoản") payload builder — the EMVCo
 * string every Vietnamese banking app scans. Built locally (no third-party QR
 * service sees the account or amount); render it with the `qrcode` package.
 */

/** NAPAS BINs of common banks. `match` is tested against the bank name typed in Quản trị. */
export const VN_BANKS: { bin: string; name: string; match: RegExp }[] = [
  { bin: "970440", name: "SeABank - Ngân hàng TMCP Đông Nam Á", match: /seabank|đông nam á/i },
  { bin: "970441", name: "VIB - Ngân hàng TMCP Quốc tế Việt Nam", match: /\bvib\b|quốc tế/i },
  { bin: "970436", name: "Vietcombank - Ngân hàng TMCP Ngoại thương Việt Nam", match: /vietcombank|ngoại thương|\bvcb\b/i },
  { bin: "970415", name: "VietinBank - Ngân hàng TMCP Công thương Việt Nam", match: /vietinbank|công thương/i },
  { bin: "970418", name: "BIDV - Ngân hàng TMCP Đầu tư và Phát triển Việt Nam", match: /\bbidv\b|đầu tư và phát triển/i },
  { bin: "970405", name: "Agribank - Ngân hàng Nông nghiệp và Phát triển Nông thôn", match: /agribank|nông nghiệp/i },
  { bin: "970407", name: "Techcombank - Ngân hàng TMCP Kỹ thương Việt Nam", match: /techcombank|kỹ thương/i },
  { bin: "970422", name: "MB - Ngân hàng TMCP Quân đội", match: /\bmb\b|mbbank|quân đội/i },
  { bin: "970416", name: "ACB - Ngân hàng TMCP Á Châu", match: /\bacb\b|á châu/i },
  { bin: "970432", name: "VPBank - Ngân hàng TMCP Việt Nam Thịnh Vượng", match: /vpbank|thịnh vượng/i },
  { bin: "970423", name: "TPBank - Ngân hàng TMCP Tiên Phong", match: /tpbank|tiên phong/i },
  { bin: "970403", name: "Sacombank - Ngân hàng TMCP Sài Gòn Thương Tín", match: /sacombank|sài gòn thương tín/i },
  { bin: "970437", name: "HDBank - Ngân hàng TMCP Phát triển TP.HCM", match: /hdbank/i },
  { bin: "970448", name: "OCB - Ngân hàng TMCP Phương Đông", match: /\bocb\b|phương đông/i },
  { bin: "970443", name: "SHB - Ngân hàng TMCP Sài Gòn - Hà Nội", match: /\bshb\b/i },
  { bin: "970426", name: "MSB - Ngân hàng TMCP Hàng Hải", match: /\bmsb\b|hàng hải/i },
  { bin: "970431", name: "Eximbank - Ngân hàng TMCP Xuất Nhập khẩu", match: /eximbank|xuất nhập khẩu/i },
  { bin: "970449", name: "LPBank - Ngân hàng TMCP Lộc Phát Việt Nam", match: /lpbank|lộc phát|liên việt/i },
  { bin: "970428", name: "Nam A Bank - Ngân hàng TMCP Nam Á", match: /nam á|nam a bank/i },
  { bin: "970409", name: "Bac A Bank - Ngân hàng TMCP Bắc Á", match: /bắc á|bac a bank/i },
];

export function findBankBin(bankName: string | null | undefined): string | null {
  if (!bankName) return null;
  return VN_BANKS.find((b) => b.match.test(bankName))?.bin ?? null;
}

function tlv(id: string, value: string): string {
  return id + String(value.length).padStart(2, "0") + value;
}

/** CRC-16/CCITT-FALSE, as required by EMVCo field 63. */
function crc16(s: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(s)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Bank apps only accept plain ASCII in the transfer note. */
function asciiNote(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);
}

/** EMVCo payload for a transfer of `amount` VND to `accountNo` at bank `bin`, pre-filling the note. */
export function buildVietQrPayload(input: { bin: string; accountNo: string; amount?: number; note?: string }): string {
  const accountNo = input.accountNo.replace(/\s/g, "");
  const merchant = tlv("00", "A000000727") + tlv("01", tlv("00", input.bin) + tlv("01", accountNo)) + tlv("02", "QRIBFTTA");
  const amount = input.amount && input.amount > 0 ? Math.round(input.amount) : 0;
  const note = input.note ? asciiNote(input.note) : "";
  const body =
    tlv("00", "01") +
    tlv("01", amount ? "12" : "11") +
    tlv("38", merchant) +
    tlv("53", "704") +
    (amount ? tlv("54", String(amount)) : "") +
    tlv("58", "VN") +
    (note ? tlv("62", tlv("08", note)) : "") +
    "6304";
  return body + crc16(body);
}
