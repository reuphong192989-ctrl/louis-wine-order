import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import DataMigrationManager from "@/components/admin/DataMigrationManager";
import IntegrationsPanel from "@/components/admin/IntegrationsPanel";

export default async function AdminDataPage() {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "ADMIN")) redirect("/admin/categories");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      <IntegrationsPanel />
      <DataMigrationManager />
    </div>
  );
}
