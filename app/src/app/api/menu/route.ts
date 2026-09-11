import { NextResponse } from "next/server";
import { withErrors } from "@/lib/api-handler";
import { listCategories } from "@/lib/sheets/categories";
import { listAllMenuItems } from "@/lib/sheets/menuItems";

/** Public menu feed for the customer ordering screen — only items marked available. */
export const GET = withErrors(async () => {
  const [categories, items] = await Promise.all([listCategories(), listAllMenuItems()]);

  const result = categories.map((cat) => ({
    ...cat,
    items: items
      .filter((it) => it.categoryId === cat.id && it.available)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }));

  return NextResponse.json({ categories: result });
});
