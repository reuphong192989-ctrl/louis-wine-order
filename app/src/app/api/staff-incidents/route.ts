import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { createStaffIncident, listStaffIncidents } from "@/lib/sheets/staffIncidents";
import { findUserByUsername } from "@/lib/sheets/users";

export const GET = withErrors(async () => {
  const auth = await requireSession(["OWNER", "ADMIN"]);
  if ("error" in auth) return auth.error;

  const incidents = await listStaffIncidents();
  return NextResponse.json({ incidents });
});

const createSchema = z.object({
  username: z.string().trim().min(1),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  description: z.string().trim().min(1, "Vui lòng mô tả sai sót.").max(1000),
});

/** Manager logs a specific mistake/incident against a staff member's account. */
export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireSession(["OWNER", "ADMIN"]);
  if ("error" in auth) return auth.error;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const targetUser = await findUserByUsername(parsed.data.username);
  if (!targetUser) return NextResponse.json({ error: "Không tìm thấy nhân viên." }, { status: 404 });

  const incident = await createStaffIncident({
    username: parsed.data.username,
    severity: parsed.data.severity,
    description: parsed.data.description,
    createdBy: auth.session.username,
  });
  return NextResponse.json({ incident }, { status: 201 });
});
