import { z } from "zod";
import { findUserByUsername } from "./sheets/users";
import type { CostAssignment } from "./sheets/orders";

/** Optional request fields: who absorbs a cancelled dish the kitchen already started. */
export const costAssignmentFields = {
  costBearer: z.enum(["RESTAURANT", "STAFF"]).nullable().optional(),
  costBearerStaff: z.string().trim().max(60).nullable().optional(),
};

export async function resolveCostAssignment(input: {
  costBearer?: "RESTAURANT" | "STAFF" | null;
  costBearerStaff?: string | null;
}): Promise<{ cost: CostAssignment } | { error: string }> {
  if (!input.costBearer) return { cost: null };
  if (input.costBearer === "RESTAURANT") return { cost: { costBearer: "RESTAURANT", costBearerStaff: null } };
  const username = input.costBearerStaff?.trim();
  if (!username || !(await findUserByUsername(username))) return { error: "Nhân viên chịu chi phí không tồn tại." };
  return { cost: { costBearer: "STAFF", costBearerStaff: username } };
}
