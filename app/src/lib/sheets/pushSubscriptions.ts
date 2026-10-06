import { randomUUID } from "crypto";
import { appendRow, deleteRow, readAllRows, updateRow } from "./core";
import type { Role } from "./users";

const TAB = "PushSubscriptions";
const HEADERS = ["id", "username", "role", "endpoint", "p256dh", "auth", "createdAt"];

export type PushSubscriptionRow = {
  id: string;
  username: string;
  role: Role;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
};

function decode(values: Record<string, string>): PushSubscriptionRow {
  return {
    id: values.id,
    username: values.username,
    role: values.role as Role,
    endpoint: values.endpoint,
    p256dh: values.p256dh,
    auth: values.auth,
    createdAt: values.createdAt,
  };
}

export async function listPushSubscriptions(): Promise<PushSubscriptionRow[]> {
  const rows = await readAllRows(TAB);
  return rows.map((r) => decode(r.values));
}

/** One browser/device registration per (username, endpoint) — re-subscribing from the same device updates it in place. */
export async function upsertPushSubscription(input: {
  username: string;
  role: Role;
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<void> {
  const rows = await readAllRows(TAB);
  const existing = rows.find((r) => r.values.username === input.username && r.values.endpoint === input.endpoint);
  if (existing) {
    await updateRow(TAB, existing.rowNumber, HEADERS, { ...existing.values, ...input });
    return;
  }
  await appendRow(TAB, HEADERS, { id: randomUUID(), createdAt: new Date().toISOString(), ...input });
}

export async function deletePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
  const rows = await readAllRows(TAB);
  const matches = rows.filter((r) => r.values.endpoint === endpoint);
  for (const row of matches) await deleteRow(TAB, row.rowNumber);
}

export const PUSH_SUBSCRIPTIONS_TAB = TAB;
export const PUSH_SUBSCRIPTIONS_HEADERS = HEADERS;
