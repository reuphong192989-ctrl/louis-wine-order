import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { deletePushSubscriptionByEndpoint, upsertPushSubscription } from "@/lib/sheets/pushSubscriptions";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

/** Registers this browser/device to receive OS-level push alerts (new orders/calls/bookings, kitchen done). */
export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireSession(["OWNER", "ADMIN", "STAFF", "RECEPTION"]);
  if ("error" in auth) return auth.error;

  const parsed = subscribeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu đăng ký thông báo không hợp lệ." }, { status: 400 });
  }

  await upsertPushSubscription({
    username: auth.session.username,
    role: auth.session.role,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
  });
  return NextResponse.json({ ok: true });
});

const unsubscribeSchema = z.object({ endpoint: z.string().url() });

export const DELETE = withErrors(async (req: NextRequest) => {
  const auth = await requireSession(["OWNER", "ADMIN", "STAFF", "RECEPTION"]);
  if ("error" in auth) return auth.error;

  const parsed = unsubscribeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Thiếu endpoint." }, { status: 400 });

  await deletePushSubscriptionByEndpoint(parsed.data.endpoint);
  return NextResponse.json({ ok: true });
});
