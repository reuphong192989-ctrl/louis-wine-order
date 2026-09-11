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
});

export type MenuItemInput = z.infer<typeof menuItemInputSchema>;

export function resolvePriceFields(input: MenuItemInput): { priceText: string; priceValue: number | null } {
  if (input.priceMode === "fixed") {
    if (!input.priceValue) throw new Error("Cần nhập giá khi chọn 'Giá cố định'.");
    return { priceText: formatVnd(input.priceValue), priceValue: input.priceValue };
  }
  return { priceText: input.priceLabel?.trim() || "Thời giá", priceValue: null };
}
