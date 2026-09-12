import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { menuItemInputSchema, resolvePriceFields } from "@/lib/validation";
import { findCategoryById, listCategories } from "@/lib/sheets/categories";
import { createMenuItem, listAllMenuItems, nextSortOrderInCategory } from "@/lib/sheets/menuItems";

export const GET = withErrors(async (req: NextRequest) => {
  const auth = await requireSession(["ADMIN", "STAFF"]);
  if ("error" in auth) return auth.error;

  const categoryId = req.nextUrl.searchParams.get("categoryId") ?? undefined;
  const [items, categories] = await Promise.all([listAllMenuItems(), listCategories()]);
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const filtered = (categoryId ? items.filter((it) => it.categoryId === categoryId) : items)
    .slice()
    .sort((a, b) => (a.categoryId === b.categoryId ? a.sortOrder - b.sortOrder : a.categoryId.localeCompare(b.categoryId)));

  const withCategory = filtered.map((it) => ({
    ...it,
    category: categoryById.get(it.categoryId) ?? { id: it.categoryId, slug: "", name: "(không rõ)" },
  }));

  return NextResponse.json({ items: withCategory });
});

export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireSession(["ADMIN"]);
  if ("error" in auth) return auth.error;

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

  const category = await findCategoryById(parsed.data.categoryId);
  if (!category) return NextResponse.json({ error: "Danh mục không tồn tại." }, { status: 400 });

  const sortOrder = await nextSortOrderInCategory(parsed.data.categoryId);

  const item = await createMenuItem({
    categoryId: parsed.data.categoryId,
    name: parsed.data.name,
    note: parsed.data.note || null,
    priceText: priceFields.priceText,
    priceValue: priceFields.priceValue,
    imageUrl: parsed.data.imageUrl || null,
    available: parsed.data.available ?? true,
    isHighlight: parsed.data.isHighlight ?? false,
    isFeaturedSpecial: parsed.data.isFeaturedSpecial ?? false,
    sortOrder,
  });

  return NextResponse.json({ item }, { status: 201 });
});
