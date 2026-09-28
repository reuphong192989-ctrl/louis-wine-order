import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import KitchenDashboard from "@/components/kitchen/KitchenDashboard";

export default async function KitchenPage() {
  const session = await getSession();
  if (!session) redirect("/staff/login");

  return <KitchenDashboard username={session.username} role={session.role} />;
}
