import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AdminNav from "@/components/admin/AdminNav";

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/admin/login");

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <AdminNav username={session.username} />
      <main className="scroll-y" style={{ flex: 1, overflowY: "auto", padding: "var(--space-4)" }}>
        {children}
      </main>
    </div>
  );
}
