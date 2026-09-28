import { NextResponse } from "next/server";
import { dataBackend } from "@/lib/sheets/core";
import { ping } from "@/lib/sheets/backend-postgres";

export const dynamic = "force-dynamic";

/**
 * Public health check: which storage backend is active and whether each one is
 * configured/reachable. Never returns connection strings or keys.
 */
export async function GET() {
  let postgres: "ok" | "not_configured" | "error" = "not_configured";
  let postgresError: string | undefined;
  if (process.env.DATABASE_URL) {
    try {
      await ping();
      postgres = "ok";
    } catch (e) {
      postgres = "error";
      postgresError = e instanceof Error ? e.message.replace(/postgres(ql)?:\/\/\S+/gi, "[url]") : "unknown";
    }
  }
  const sheetsConfigured = !!(
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  );

  const backend = dataBackend();
  const ok = backend === "postgres" ? postgres === "ok" : sheetsConfigured;
  return NextResponse.json(
    { ok, backend, postgres, postgresError, sheets: sheetsConfigured ? "configured" : "not_configured" },
    { status: ok ? 200 : 503 },
  );
}
