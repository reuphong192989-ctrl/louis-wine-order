import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { billReportXlsx, buildBillReport } from "@/lib/bill-report";

export const dynamic = "force-dynamic";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 62;

/**
 * Bill report for managers and cashiers. ?from=YYYY-MM-DD&to=YYYY-MM-DD (Vietnam dates, inclusive);
 * &format=xlsx downloads it as an Excel file.
 */
export const GET = withErrors(async (req: NextRequest) => {
  const auth = await requireSession(["OWNER", "ADMIN", "CASHIER"]);
  if ("error" in auth) return auth.error;

  const sp = req.nextUrl.searchParams;
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? from;
  if (!DATE.test(from) || !DATE.test(to) || from > to) {
    return NextResponse.json({ error: "Khoảng ngày không hợp lệ." }, { status: 400 });
  }
  const days = (Date.parse(to) - Date.parse(from)) / 86_400_000 + 1;
  if (!Number.isFinite(days) || days > MAX_DAYS) {
    return NextResponse.json({ error: `Chỉ xem tối đa ${MAX_DAYS} ngày một lần.` }, { status: 400 });
  }

  const report = await buildBillReport(from, to);
  if (sp.get("format") !== "xlsx") return NextResponse.json(report);

  const file = billReportXlsx(report, auth.session.username);
  const name = from === to ? `bao-cao-hoa-don-${from}.xlsx` : `bao-cao-hoa-don-${from}_${to}.xlsx`;
  return new NextResponse(Buffer.from(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
});
