const DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const UNITS = ["", " nghìn", " triệu", " tỷ", " nghìn tỷ", " triệu tỷ"];

/** Reads a 0–999 group; `full` = a higher group precedes it, so leading zeros are spoken ("không trăm linh năm"). */
function readGroup(n: number, full: boolean): string {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  const parts: string[] = [];
  if (h > 0 || full) parts.push(`${DIGITS[h]} trăm`);
  if (t > 1) {
    parts.push(`${DIGITS[t]} mươi`);
    if (u === 1) parts.push("mốt");
    else if (u === 4) parts.push("tư");
    else if (u === 5) parts.push("lăm");
    else if (u > 0) parts.push(DIGITS[u]);
  } else if (t === 1) {
    parts.push("mười");
    if (u === 5) parts.push("lăm");
    else if (u > 0) parts.push(DIGITS[u]);
  } else if (u > 0) {
    if (h > 0 || full) parts.push("linh");
    parts.push(DIGITS[u]);
  }
  return parts.join(" ");
}

/** 6696000 → "Sáu triệu sáu trăm chín mươi sáu nghìn đồng" — the "Bằng chữ" line on a bill. */
export function vndInWords(amount: number): string {
  let n = Math.round(Math.abs(amount));
  if (n === 0) return "Không đồng";
  const groups: number[] = [];
  while (n > 0) {
    groups.push(n % 1000);
    n = Math.floor(n / 1000);
  }
  const words: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) continue;
    words.push(readGroup(groups[i], i < groups.length - 1) + UNITS[i]);
  }
  const text = words.join(" ").replace(/\s+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1) + " đồng";
}
