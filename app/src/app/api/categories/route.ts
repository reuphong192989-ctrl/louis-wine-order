import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { listCategories, createCategory, findCategoryBySlug } from "@/lib/sheets/categories";
import { countItemsInCategory } from "@/lib/sheets/menuItems";

export const GET = withErrors(async () => {
  const auth = await requireSession(["OWNER", "ADMIN", "STAFF"]);
  if ("error" in auth) return auth.error;

  const categories = await listCategories();
  const withCounts = await Promise.all(
    categories.map(async (c) => ({ ...c, _count: { items: await countItemsInCategory(c.id) } }))
  );
  return NextResponse.json({ categories: withCounts });
});

const createSchema = z.object({
  name: z.string().trim().min(1, "Tên danh mục không được để trống"),
  slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang"),
});

export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireSession(["OWNER", "ADMIN"]);
  if ("error" in auth) return auth.error;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const existing = await findCategoryBySlug(parsed.data.slug);
  if (existing) {
    return NextResponse.json({ error: "Slug danh mục đã tồn tại." }, { status: 409 });
  }

  const all = await listCategories();
  const maxSort = all.reduce((max, c) => Math.max(max, c.sortOrder), -1);
  const category = await createCategory({ name: parsed.data.name, slug: parsed.data.slug, sortOrder: maxSort + 1 });

  return NextResponse.json({ category }, { status: 201 });
});
