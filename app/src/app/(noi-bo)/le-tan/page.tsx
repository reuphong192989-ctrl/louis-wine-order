import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import ReceptionBoard from "@/components/reception/ReceptionBoard";

export default async function ReceptionPage() {
  const session = await getSession();
  if (!session) redirect("/staff/login");
  return <ReceptionBoard username={session.username} role={session.role} />;
}
