export type MenuItemDTO = {
  id: string;
  categoryId: string;
  name: string;
  note: string | null;
  priceText: string;
  priceValue: number | null;
  imageUrl: string | null;
  isHighlight: boolean;
  isFeaturedSpecial: boolean;
  available: boolean;
  sortOrder: number;
  nameEn?: string | null;
  noteEn?: string | null;
  nameRu?: string | null;
  noteRu?: string | null;
};

export type AdminMenuItemDTO = MenuItemDTO & {
  category: { id: string; slug: string; name: string };
};

export type CategoryDTO = {
  id: string;
  slug: string;
  name: string;
  nameEn?: string | null;
  nameRu?: string | null;
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
  note: string | null;
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
  /** Website orders only (pickup / delivery / Lumia room). */
  online?: {
    channel: "PICKUP" | "DELIVERY" | "LUMIA_ROOM";
    code: string;
    customerName: string;
    phone: string;
    address: string | null;
    hotelRoom: string | null;
    roomVerified: boolean;
    scheduledTime: string | null;
    subtotal: number;
    discount: number;
    shippingFee: number;
  } | null;
  claimedBy?: string | null;
  claimedAt?: string | null;
  fulfillment?: "" | "DELIVERING" | "DELIVERED";
  fulfilledAt?: string | null;
  fulfilledBy?: string | null;
  paymentMethod?: "CASH" | "TRANSFER" | null;
  paidAt?: string | null;
  paidBy?: string | null;
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

export type ReservationDTO = {
  id: string;
  code: string;
  customerName: string;
  phone: string;
  date: string; // YYYY-MM-DD (Vietnam time)
  time: string; // HH:MM
  guests: number;
  area: string | null;
  occasion: string | null;
  isLumiaGuest: boolean;
  hotelRoom: string | null;
  roomVerified: boolean;
  needShuttle: boolean;
  pickupTime: string | null;
  note: string | null;
  status: "NEW" | "CONFIRMED" | "SEATED" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  handledBy: string | null;
  claimedBy?: string | null;
  claimedAt?: string | null;
  shuttleDoneAt?: string | null;
  shuttleDoneBy?: string | null;
};
