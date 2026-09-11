import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { menuItemInputSchema, resolvePriceFields } from "@/lib/validation";
import { deleteMenuItem, findMenuItemById, updateMenuItem } from "@/lib/sheets/menuItems";

export const PUT = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireSession(["ADMIN"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const parsed = menuItemInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  let priceFields;
  try {
    priceFields = resolvePriceFields(parsed.data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const existing = await findMenuItemById(id);
  if (!existing) return NextResponse.json({ error: "Không tìm thấy món." }, { status: 404 });

  const item = await updateMenuItem(id, {
    categoryId: parsed.data.categoryId,
    name: parsed.data.name,
    note: parsed.data.note || null,
    priceText: priceFields.priceText,
    priceValue: priceFields.priceValue,
    imageUrl: parsed.data.imageUrl || null,
    available: parsed.data.available ?? true,
    isHighlight: parsed.data.isHighlight ?? false,
    sortOrder: existing.sortOrder,
  });

  return NextResponse.json({ item });
});

export const DELETE = withErrors(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireSession(["ADMIN"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  await deleteMenuItem(id);
  return NextResponse.json({ ok: true });
});
