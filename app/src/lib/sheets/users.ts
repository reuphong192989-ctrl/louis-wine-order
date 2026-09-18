import { randomUUID } from "crypto";
import { appendRow, deleteRow, readAllRows, updateRow } from "./core";

const TAB = "Users";
const HEADERS = ["id", "username", "passwordHash", "role"];

export type Role = "OWNER" | "ADMIN" | "STAFF";

export type SheetUser = {
  id: string;
  username: string;
  passwordHash: string;
  role: Role;
};

function decode(values: Record<string, string>): SheetUser {
  return {
    id: values.id,
    username: values.username,
    passwordHash: values.passwordHash,
    role: values.role as Role,
  };
}

export async function listUsers(): Promise<SheetUser[]> {
  const rows = await readAllRows(TAB);
  return rows.map((r) => decode(r.values));
}

export async function findUserByUsername(username: string): Promise<SheetUser | null> {
  const all = await listUsers();
  return all.find((u) => u.username === username) ?? null;
}

export async function findUserById(id: string): Promise<SheetUser | null> {
  const all = await listUsers();
  return all.find((u) => u.id === id) ?? null;
}

export async function createUser(input: { username: string; passwordHash: string; role: Role }): Promise<SheetUser> {
  const user: SheetUser = { id: randomUUID(), ...input };
  await appendRow(TAB, HEADERS, user);
  return user;
}

/** Partial update — omit passwordHash to keep the current password unchanged. */
export async function updateUser(
  id: string,
  patch: { passwordHash?: string; role?: Role }
): Promise<SheetUser | null> {
  const rows = await readAllRows(TAB);
  const row = rows.find((r) => r.values.id === id);
  if (!row) return null;
  const current = decode(row.values);
  const next: SheetUser = {
    ...current,
    passwordHash: patch.passwordHash ?? current.passwordHash,
    role: patch.role ?? current.role,
  };
  await updateRow(TAB, row.rowNumber, HEADERS, next);
  return next;
}

export async function deleteUser(id: string): Promise<boolean> {
  const rows = await readAllRows(TAB);
  const row = rows.find((r) => r.values.id === id);
  if (!row) return false;
  await deleteRow(TAB, row.rowNumber);
  return true;
}

export const USERS_TAB = TAB;
export const USERS_HEADERS = HEADERS;
