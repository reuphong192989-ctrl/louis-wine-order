import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrors } from "@/lib/api-handler";
import { requireSession } from "@/lib/api-auth";
import { setReviewVisible } from "@/lib/sheets/reviews";

const patchSchema = z.object({ isVisible: z.boolean() });

/** Admin: hide or show a review on the public website. */
export const PATCH = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireSession(["OWNER", "ADMIN"]);
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  if (!(await setReviewVisible(id, parsed.data.isVisible))) {
    return NextResponse.json({ error: "Không tìm thấy đánh giá." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
});
