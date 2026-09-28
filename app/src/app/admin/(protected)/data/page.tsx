import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import DataMigrationManager from "@/components/admin/DataMigrationManager";

export default async function AdminDataPage() {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "ADMIN")) redirect("/admin/categories");

  return <DataMigrationManager />;
}
