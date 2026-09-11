import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { updateCategory, deleteCategory } from "@/lib/sheets/categories";
import { countItemsInCategory } from "@/lib/sheets/menuItems";

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  sortOrder: z.number().int().optional(),
});

export const PUT = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireSession(["ADMIN"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const category = await updateCategory(id, parsed.data);
  if (!category) return NextResponse.json({ error: "Không tìm thấy danh mục." }, { status: 404 });

  return NextResponse.json({ category });
});

export const DELETE = withErrors(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireSession(["ADMIN"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const itemCount = await countItemsInCategory(id);
  if (itemCount > 0) {
    return NextResponse.json(
      { error: "Không thể xoá danh mục còn món ăn. Hãy xoá hoặc chuyển các món trước." },
      { status: 400 }
    );
  }

  await deleteCategory(id);
  return NextResponse.json({ ok: true });
});
