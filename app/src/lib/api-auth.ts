import { NextResponse } from "next/server";
import { getSession, SessionPayload } from "./auth";

type Role = "OWNER" | "ADMIN" | "STAFF";

export async function requireSession(
  roles?: Role[]
): Promise<{ session: SessionPayload } | { error: NextResponse }> {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 }) };
  }
  if (roles && !roles.includes(session.role)) {
    return { error: NextResponse.json({ error: "Bạn không có quyền thực hiện thao tác này." }, { status: 403 }) };
  }
  return { session };
}
