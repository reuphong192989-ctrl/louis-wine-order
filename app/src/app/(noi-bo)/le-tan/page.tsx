import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import ReceptionBoard from "@/components/reception/ReceptionBoard";

export default async function ReceptionPage() {
  const session = await getSession();
  if (!session) redirect("/staff/login");
  if (session.role === "CASHIER") redirect("/thu-ngan");
  if (session.role === "KITCHEN") redirect("/kitchen");
  return <ReceptionBoard username={session.username} role={session.role} />;
}
