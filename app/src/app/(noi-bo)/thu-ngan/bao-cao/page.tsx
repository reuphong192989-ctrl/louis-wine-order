import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import BillReportView from "@/components/cashier/BillReportView";

/** Daily / weekly bill report — managers and cashiers. */
export default async function BillReportPage() {
  const session = await getSession();
  if (!session) redirect("/staff/login");
  if (session.role === "KITCHEN") redirect("/kitchen");
  if (session.role === "RECEPTION") redirect("/le-tan");
  if (session.role === "STAFF") redirect("/staff");
  return <BillReportView username={session.username} role={session.role} />;
}
