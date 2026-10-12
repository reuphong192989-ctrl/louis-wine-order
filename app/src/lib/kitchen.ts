/**
 * Which order lines the kitchen has to prepare. Every order line carries the bill section it was ordered under
 * (`section`: FOOD / DRINK / OTHER, snapshotted when the guest orders). Only food goes to the kitchen screen;
 * drinks, cigars, towels… are served by the floor staff and never get a "cooking / done" state.
 * A line without a section (orders placed before Oct 2026) counts as food, exactly as before.
 * Pure — safe to use in the browser and on the server.
 */
import type { BillGroup } from "./bill-math";

type Line = { section?: BillGroup | null; kitchenStatus: "PENDING" | "COOKING" | "DONE" };

export const needsKitchen = (it: { section?: BillGroup | null }): boolean => !it.section || it.section === "FOOD";

/**
 * "Ready to serve": every dish the kitchen has to make is done. An order with nothing for the kitchen
 * (drinks only) has nothing to wait for, so it counts as ready once it has items at all.
 */
export function kitchenAllDone(items: Line[]): boolean {
  const food = items.filter(needsKitchen);
  return food.length === 0 ? items.length > 0 : food.every((it) => it.kitchenStatus === "DONE");
}

/** Same, but "nothing for the kitchen" is NOT counted as done — for alerts that mean "the kitchen just finished". */
export function kitchenFinishedFood(items: Line[]): boolean {
  const food = items.filter(needsKitchen);
  return food.length > 0 && food.every((it) => it.kitchenStatus === "DONE");
}

/** The kitchen has begun at least one dish it was asked to make. */
export function kitchenStarted(items: Line[]): boolean {
  return items.filter(needsKitchen).some((it) => it.kitchenStatus !== "PENDING");
}
