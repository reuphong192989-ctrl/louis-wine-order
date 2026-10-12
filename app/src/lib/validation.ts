import { z } from "zod";
import { formatVnd } from "./format";

export const menuItemInputSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(1, "Tên món không được để trống"),
  note: z.string().trim().max(500).optional().nullable(),
  // "fixed": có giá cố định (khách order trực tiếp được).
  // "text": Thời giá / Đang cập nhật — khách phải gọi nhân viên.
  priceMode: z.enum(["fixed", "text"]),
  priceValue: z.number().int().positive().max(999_999_999).optional(),
  priceLabel: z.string().trim().min(1).max(60).optional(),
  imageUrl: z.string().trim().max(500).optional().nullable(),
  available: z.boolean().optional(),
  isHighlight: z.boolean().optional(),
  isFeaturedSpecial: z.boolean().optional(),
  // Translations — omitted (undefined) keeps the stored value, "" / null clears it.
  nameEn: z.string().trim().max(200).optional().nullable(),
  noteEn: z.string().trim().max(500).optional().nullable(),
  nameRu: z.string().trim().max(200).optional().nullable(),
  noteRu: z.string().trim().max(500).optional().nullable(),
  // Bill overrides — omitted (undefined) keeps the stored value, null/"" clears it (= follow the category / "phần").
  vatRate: z.number().int().min(0).max(100).optional().nullable(),
  group: z.enum(["FOOD", "DRINK", "OTHER"]).optional().nullable(),
  unit: z.string().trim().max(20).optional().nullable(),
});

/** VAT %, bill section and unit to store: what the form sent, or the existing values for fields it didn't send. */
export function resolveBillFields(
  input: MenuItemInput,
  existing?: { vatRate: number | null; group: "FOOD" | "DRINK" | "OTHER" | null; unit: string | null },
): { vatRate: number | null; group: "FOOD" | "DRINK" | "OTHER" | null; unit: string | null } {
  return {
    vatRate: input.vatRate === undefined ? (existing?.vatRate ?? null) : input.vatRate,
    group: input.group === undefined ? (existing?.group ?? null) : input.group,
    unit: input.unit === undefined ? (existing?.unit ?? null) : input.unit || null,
  };
}

type TranslationKey = "nameEn" | "noteEn" | "nameRu" | "noteRu";

/** Translation fields to store: values sent by the form, or the existing ones for fields it didn't send. */
export function resolveTranslations(
  input: MenuItemInput,
  existing?: Partial<Record<TranslationKey, string | null>>,
): Record<TranslationKey, string | null> {
  const pick = (k: TranslationKey) => (input[k] === undefined ? (existing?.[k] ?? null) : input[k] || null);
  return { nameEn: pick("nameEn"), noteEn: pick("noteEn"), nameRu: pick("nameRu"), noteRu: pick("noteRu") };
}

export type MenuItemInput = z.infer<typeof menuItemInputSchema>;

export function resolvePriceFields(input: MenuItemInput): { priceText: string; priceValue: number | null } {
  if (input.priceMode === "fixed") {
    if (!input.priceValue) throw new Error("Cần nhập giá khi chọn 'Giá cố định'.");
    return { priceText: formatVnd(input.priceValue), priceValue: input.priceValue };
  }
  return { priceText: input.priceLabel?.trim() || "Thời giá", priceValue: null };
}
