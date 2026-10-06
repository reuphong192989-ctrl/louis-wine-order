import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import StaffDashboard from "@/components/staff/StaffDashboard";

export default async function StaffPage() {
  const session = await getSession();
  if (!session) redirect("/staff/login");
  if (session.role === "RECEPTION") redirect("/le-tan");
  if (session.role === "CASHIER") redirect("/thu-ngan");

  return <StaffDashboard username={session.username} role={session.role} />;
}
