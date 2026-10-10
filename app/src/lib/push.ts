import webpush from "web-push";
import type { Role } from "./sheets/users";
import { deletePushSubscriptionByEndpoint, listPushSubscriptions } from "./sheets/pushSubscriptions";
import { listUsers } from "./sheets/users";

let configured = false;
function vapidReady(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@louiswine.vn", pub, priv);
    configured = true;
  }
  return true;
}

/**
 * OS-level push notification to every staff device subscribed for one of `roles`.
 * Does nothing unless VAPID env vars are set (same "optional, never throws" pattern as notifyStaff/Telegram).
 * Used so staff/kitchen alerts still arrive while the device's screen is locked — something
 * the in-page polling + WebAudio chime cannot do (JS pauses when the screen turns off).
 */
export async function notifyPush(
  roles: Role[],
  payload: { title: string; body: string; tag?: string; url?: string },
): Promise<void> {
  if (!vapidReady()) return;

  const [subs, users] = await Promise.all([listPushSubscriptions(), listUsers()]);
  // Use the account's current role (it may have been changed since the device subscribed); deleted accounts get nothing.
  const roleOf = new Map(users.map((u) => [u.username, u.role]));
  const targets = subs.filter((s) => {
    const role = roleOf.get(s.username);
    return role !== undefined && roles.includes(role);
  });
  if (targets.length === 0) return;

  const data = JSON.stringify({ title: payload.title, body: payload.body, tag: payload.tag, url: payload.url });

  await Promise.all(
    targets.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data,
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription expired or the browser revoked it — stop trying.
          await deletePushSubscriptionByEndpoint(s.endpoint).catch(() => {});
        } else {
          console.error("notifyPush failed", statusCode, err);
        }
      }
    }),
  );
}
