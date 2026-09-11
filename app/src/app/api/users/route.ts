import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { hashPassword } from "@/lib/auth";
import { createUser, findUserByUsername, listUsers } from "@/lib/sheets/users";

export const GET = withErrors(async () => {
  const auth = await requireSession(["ADMIN"]);
  if ("error" in auth) return auth.error;

  const users = await listUsers();
  return NextResponse.json({ users: users.map((u) => ({ id: u.id, username: u.username, role: u.role })) });
});

const createSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, "Tên đăng nhập tối thiểu 2 ký tự")
    .regex(/^[a-z0-9._-]+$/, "Tên đăng nhập chỉ gồm chữ thường, số, dấu chấm/gạch ngang"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  role: z.enum(["ADMIN", "STAFF"]),
});

export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireSession(["ADMIN"]);
  if ("error" in auth) return auth.error;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const existing = await findUserByUsername(parsed.data.username);
  if (existing) {
    return NextResponse.json({ error: "Tên đăng nhập đã tồn tại." }, { status: 409 });
  }

  const user = await createUser({
    username: parsed.data.username,
    passwordHash: await hashPassword(parsed.data.password),
    role: parsed.data.role,
  });

  return NextResponse.json({ user: { id: user.id, username: user.username, role: user.role } }, { status: 201 });
});
