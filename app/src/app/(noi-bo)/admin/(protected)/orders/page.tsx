import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import OrdersManager from "@/components/admin/OrdersManager";

export default async function AdminOrdersPage() {
  const session = await getSession();
  if (!session || session.role !== "OWNER") redirect("/admin/categories");

  return <OrdersManager />;
}
