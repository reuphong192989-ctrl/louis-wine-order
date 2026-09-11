import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { hashPassword } from "@/lib/auth";
import { deleteUser, findUserById, listUsers, updateUser } from "@/lib/sheets/users";

const updateSchema = z.object({
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự").optional(),
  role: z.enum(["ADMIN", "STAFF"]).optional(),
});

export const PUT = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireSession(["ADMIN"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const existing = await findUserById(id);
  if (!existing) return NextResponse.json({ error: "Không tìm thấy tài khoản." }, { status: 404 });

  if (existing.role === "ADMIN" && parsed.data.role === "STAFF") {
    const all = await listUsers();
    const otherAdmins = all.filter((u) => u.role === "ADMIN" && u.id !== id);
    if (otherAdmins.length === 0) {
      return NextResponse.json({ error: "Không thể hạ quyền — đây là tài khoản Quản lý cuối cùng." }, { status: 400 });
    }
  }

  const user = await updateUser(id, {
    passwordHash: parsed.data.password ? await hashPassword(parsed.data.password) : undefined,
    role: parsed.data.role,
  });

  return NextResponse.json({ user: { id: user!.id, username: user!.username, role: user!.role } });
});

export const DELETE = withErrors(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireSession(["ADMIN"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const existing = await findUserById(id);
  if (!existing) return NextResponse.json({ error: "Không tìm thấy tài khoản." }, { status: 404 });

  if (existing.role === "ADMIN") {
    const all = await listUsers();
    const otherAdmins = all.filter((u) => u.role === "ADMIN" && u.id !== id);
    if (otherAdmins.length === 0) {
      return NextResponse.json({ error: "Không thể xoá — đây là tài khoản Quản lý cuối cùng." }, { status: 400 });
    }
  }

  await deleteUser(id);
  return NextResponse.json({ ok: true });
});
