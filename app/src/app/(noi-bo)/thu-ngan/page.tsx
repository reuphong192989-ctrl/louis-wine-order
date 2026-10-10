import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import CashierBoard from "@/components/cashier/CashierBoard";

export default async function CashierPage() {
  const session = await getSession();
  if (!session) redirect("/staff/login");
  if (session.role === "KITCHEN") redirect("/kitchen");
  // Billing is scoped to Quản lý/Chủ sở hữu/Thu ngân — plain nhân viên don't take payment.
  if (session.role === "STAFF" || session.role === "RECEPTION") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-6)" }}>
        <p className="text-muted">Chỉ Quản lý, Chủ sở hữu và Thu ngân mới dùng được màn hình này.</p>
      </div>
    );
  }
  return <CashierBoard username={session.username} role={session.role} />;
}
