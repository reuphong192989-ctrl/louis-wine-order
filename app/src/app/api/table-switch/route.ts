import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrors } from "@/lib/api-handler";
import { verifyPassword } from "@/lib/auth";
import { findUserByUsername } from "@/lib/sheets/users";
import { logTableSwitch } from "@/lib/sheets/tableSwitchLog";

const schema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
  previousTableId: z.string().trim().nullable(),
  newTableId: z.string().trim().min(1).max(50),
});

/**
 * Assigns/switches which table a device (tablet, kiosk) is ordering for.
 * No session cookie involved — this runs on the public /order page, which a
 * customer's own device also loads, so it re-verifies the staff member's
 * username/password on every call instead of relying on a login elsewhere.
 * Every attempt (success or failure) matters for the audit trail, but only
 * successful switches are logged — that's what "who changed what, when" means.
 */
export const POST = withErrors(async (req: NextRequest) => {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const user = await findUserByUsername(parsed.data.username);
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Sai tên đăng nhập hoặc mật khẩu nhân viên." }, { status: 401 });
  }

  await logTableSwitch({
    previousTableId: parsed.data.previousTableId,
    newTableId: parsed.data.newTableId,
    username: user.username,
    role: user.role,
  });

  return NextResponse.json({ ok: true });
});
