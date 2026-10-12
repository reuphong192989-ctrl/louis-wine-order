/**
 * End-to-end check that the kitchen only deals with food, against an in-memory stand-in for PostgreSQL:
 * the section is snapshotted on each order line, the kitchen view drops drinks, "kitchen finished" ignores drinks,
 * old lines without a section still count as food, and only food cancellations are shown to the kitchen.
 * Run: npm run check:kitchen
 */
import assert from "node:assert/strict";
import { installFakePg } from "./fake-pg";

const db = installFakePg();

async function main() {
  const { createCategory, updateCategory } = await import("@/lib/sheets/categories");
  const { createMenuItem } = await import("@/lib/sheets/menuItems");
  const { billMetaByMenuItemId } = await import("@/lib/billing");
  const { createOrder, listOrders, setOrderStatus, setOrderItemStatus, cancelOrderItem } = await import("@/lib/sheets/orders");
  const { listCancelledItems } = await import("@/lib/sheets/cancelledItems");
  const { needsKitchen, kitchenAllDone, kitchenFinishedFood, kitchenStarted } = await import("@/lib/kitchen");

  // ---- a food category and a drinks category, one dish each
  const mkCat = async (name: string, group: "FOOD" | "DRINK", sortOrder: number) => {
    const c = await createCategory({ name, slug: name.toLowerCase().replace(/\W+/g, "-"), sortOrder });
    await updateCategory(c.id, { group });
    return c.id;
  };
  const rau = await mkCat("Rau", "FOOD", 0);
  const ngot = await mkCat("Nước Ngọt", "DRINK", 1);
  const base = { note: null, imageUrl: null, isHighlight: false, isFeaturedSpecial: false, available: true, nameEn: null, noteEn: null, nameRu: null, noteRu: null, vatRate: null, group: null, unit: null, sortOrder: 0 };
  const food = await createMenuItem({ ...base, categoryId: rau, name: "Rau muống xào tỏi", priceText: "88.000đ", priceValue: 88_000 });
  const soda = await createMenuItem({ ...base, categoryId: ngot, name: "Pepsi", priceText: "20.000đ", priceValue: 20_000 });

  // ---- place orders the way the API does: look up each dish's section and store it on the line
  const meta = await billMetaByMenuItemId();
  const line = (it: typeof food, qty: number) => ({
    menuItemId: it.id, nameSnapshot: it.name, unitPrice: it.priceValue!, qty, lineTotal: it.priceValue! * qty, note: null,
    section: meta.get(it.id)?.group ?? ("FOOD" as const),
  });
  const mixed = await createOrder({ tableId: "T4-01", lines: [line(food, 2), line(soda, 3)] });
  const drinksOnly = await createOrder({ tableId: "T4-02", lines: [line(soda, 1)] });
  await setOrderStatus(mixed.id, "CONFIRMED", "staff");
  await setOrderStatus(drinksOnly.id, "CONFIRMED", "staff");

  let orders = await listOrders("CONFIRMED");
  const mixedNow = orders.find((o) => o.id === mixed.id)!;
  assert.deepEqual(mixedNow.items.map((i) => [i.nameSnapshot, i.section]).sort(), [["Pepsi", "DRINK"], ["Rau muống xào tỏi", "FOOD"]], "section is stored on each line");

  // ---- kitchen view (what GET /api/orders returns for the kitchen): food lines only, drinks-only orders disappear
  const kitchenView = orders.map((o) => ({ ...o, items: o.items.filter(needsKitchen) })).filter((o) => o.items.length > 0);
  assert.equal(kitchenView.length, 1);
  assert.deepEqual(kitchenView[0].items.map((i) => i.nameSnapshot), ["Rau muống xào tỏi"]);

  // ---- "kitchen finished" only waits for the food
  assert.equal(kitchenAllDone(mixedNow.items), false);
  assert.equal(kitchenFinishedFood(mixedNow.items), false);
  assert.equal(kitchenStarted(mixedNow.items), false);
  const dish = mixedNow.items.find((i) => i.nameSnapshot === "Rau muống xào tỏi")!;
  await setOrderItemStatus(dish.id, "COOKING");
  const cooking = (await setOrderItemStatus(dish.id, "COOKING"))!;
  assert.equal(kitchenStarted(cooking.items), true);
  const finished = (await setOrderItemStatus(dish.id, "DONE"))!;
  assert.equal(finished.items.find((i) => i.nameSnapshot === "Pepsi")!.kitchenStatus, "PENDING", "the drink stays untouched");
  assert.equal(kitchenFinishedFood(finished.items), true, "all food done = kitchen finished, although the Pepsi was never 'cooked'");
  assert.equal(kitchenAllDone(finished.items), true);
  // an order with nothing to cook: ready at once for the guest/reception views, but it never fires the "kitchen finished" alert
  const only = orders.find((o) => o.id === drinksOnly.id)!;
  assert.equal(kitchenAllDone(only.items), true);
  assert.equal(kitchenFinishedFood(only.items), false);
  assert.equal(kitchenStarted(only.items), false);

  // ---- lines saved before the column existed are food, exactly as before
  db.insertRaw("OrderItems", { id: "legacy-line", orderId: mixed.id, menuItemId: "", nameSnapshot: "Món cũ", unitPrice: "1000", qty: "1", lineTotal: "1000", kitchenStatus: "PENDING", note: "" });
  orders = await listOrders("CONFIRMED");
  const legacy = orders.find((o) => o.id === mixed.id)!.items.find((i) => i.id === "legacy-line")!;
  assert.equal(legacy.section, "FOOD");
  assert.equal(needsKitchen(legacy), true);
  assert.equal(needsKitchen({}), true, "missing section = food");

  // ---- cancellations: the kitchen is told to stop for food, not for a drink
  const freshMixed = orders.find((o) => o.id === mixed.id)!;
  const pepsiLine = freshMixed.items.find((i) => i.nameSnapshot === "Pepsi")!;
  const rauLine = freshMixed.items.find((i) => i.nameSnapshot === "Rau muống xào tỏi")!;
  const by = { username: "owner", role: "OWNER" };
  assert.ok(!("error" in (await cancelOrderItem(pepsiLine.id, 1, "Khách đổi ý", by, null))));
  assert.ok(!("error" in (await cancelOrderItem(rauLine.id, 1, "Khách đổi ý", by, { costBearer: "RESTAURANT", costBearerStaff: null }))));
  const log = await listCancelledItems("2000-01-01T00:00:00.000Z", "2100-01-01T00:00:00.000Z");
  const bySection = Object.fromEntries(log.map((c) => [c.nameSnapshot, c.section]));
  assert.deepEqual(bySection, { Pepsi: "DRINK", "Rau muống xào tỏi": "FOOD" }, "cancellation log keeps the section");
  const kitchenAlerts = log.filter((c) => c.scope !== "return" && needsKitchen(c));
  assert.deepEqual(kitchenAlerts.map((c) => c.nameSnapshot), ["Rau muống xào tỏi"], "only the food cancellation reaches the kitchen screen");

  console.log("kitchen-db checks passed");
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
