import { listCategories } from "@/lib/sheets/categories";
import { listAllMenuItems, type MenuItem } from "@/lib/sheets/menuItems";
import { reviewSummary } from "@/lib/sheets/reviews";

/** Menu item as the public website renders it (same data the QR table menu uses). */
export type MenuItemDTO = {
  id: string;
  name: string;
  note: string | null;
  priceText: string;
  priceValue: number | null;
  imageUrl: string | null;
  isHighlight: boolean;
  isSpecial: boolean;
  available: boolean;
};

export type MenuCategoryDTO = {
  id: string;
  slug: string;
  name: string;
  items: MenuItemDTO[];
};

function toDTO(i: MenuItem): MenuItemDTO {
  return {
    id: i.id,
    name: i.name,
    note: i.note,
    priceText: i.priceText,
    priceValue: i.priceValue,
    imageUrl: i.imageUrl,
    isHighlight: i.isHighlight,
    isSpecial: i.isFeaturedSpecial,
    available: i.available,
  };
}

/** Categories with the items currently on sale — hidden ("hết hàng") items are left out, like the table menu. */
export async function getMenu(): Promise<MenuCategoryDTO[]> {
  const [cats, items] = await Promise.all([listCategories(), listAllMenuItems()]);
  return cats
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      items: items.filter((i) => i.categoryId === c.id && i.available).map(toDTO),
    }))
    .filter((c) => c.items.length > 0);
}

export async function getFeaturedItems(limit = 8): Promise<MenuItemDTO[]> {
  const items = await listAllMenuItems();
  return items
    .filter((i) => i.isHighlight && i.available && i.imageUrl)
    .sort((a, b) => Number(b.isFeaturedSpecial) - Number(a.isFeaturedSpecial))
    .slice(0, limit)
    .map(toDTO);
}

export type ReviewDTO = {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  visitType: string | null;
  isLumiaGuest: boolean;
  createdAt: string;
};

export async function getReviews() {
  const s = await reviewSummary();
  const list: ReviewDTO[] = s.list.map((r) => ({
    id: r.id,
    customerName: r.customerName,
    rating: r.rating,
    comment: r.comment,
    visitType: r.visitType,
    isLumiaGuest: r.isLumiaGuest,
    createdAt: r.createdAt,
  }));
  return { count: s.count, avg: s.avg, dist: s.dist, list };
}
