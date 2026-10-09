import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import MyConfirmationHistory from "@/components/staff/MyConfirmationHistory";

export default async function MyHistoryPage() {
  const session = await getSession();
  if (!session) redirect("/staff/login");
  if (session.role === "RECEPTION") redirect("/le-tan");

  return <MyConfirmationHistory username={session.username} />;
}
