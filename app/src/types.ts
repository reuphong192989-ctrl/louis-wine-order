export type MenuItemDTO = {
  id: string;
  categoryId: string;
  name: string;
  note: string | null;
  priceText: string;
  priceValue: number | null;
  imageUrl: string | null;
  isHighlight: boolean;
  available: boolean;
  sortOrder: number;
};

export type AdminMenuItemDTO = MenuItemDTO & {
  category: { id: string; slug: string; name: string };
};

export type CategoryDTO = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  items: MenuItemDTO[];
};

export type OrderItemDTO = {
  id: string;
  menuItemId: string | null;
  nameSnapshot: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  kitchenStatus: "PENDING" | "COOKING" | "DONE";
};

export type OrderDTO = {
  id: string;
  tableId: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  totalAmount: number;
  note: string | null;
  createdAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  items: OrderItemDTO[];
};

export type StaffCallDTO = {
  id: string;
  tableId: string;
  status: "PENDING" | "ACKNOWLEDGED";
  createdAt: string;
  acknowledgedAt: string | null;
};

export type RealtimeMessage =
  | { type: "order:new"; data: OrderDTO; ts: number }
  | { type: "order:ack"; data: OrderDTO; ts: number }
  | { type: "order:cancelled"; data: OrderDTO; ts: number }
  | { type: "staffcall:new"; data: StaffCallDTO; ts: number }
  | { type: "staffcall:ack"; data: StaffCallDTO; ts: number }
  | { type: "menu:updated"; data: unknown; ts: number };
