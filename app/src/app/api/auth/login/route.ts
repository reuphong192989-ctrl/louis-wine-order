import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrors } from "@/lib/api-handler";
import { findUserByUsername } from "@/lib/sheets/users";
import { signSession, verifyPassword, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const POST = withErrors(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Vui lòng nhập tên đăng nhập và mật khẩu." }, { status: 400 });
  }

  const user = await findUserByUsername(parsed.data.username);
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Sai tên đăng nhập hoặc mật khẩu." }, { status: 401 });
  }

  const token = await signSession({ sub: user.id, username: user.username, role: user.role });
  const res = NextResponse.json({ user: { username: user.username, role: user.role } });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
});
