import { NextResponse } from "next/server";

/**
 * Wraps a route handler so an uncaught error (most commonly: Google Sheets
 * env vars missing/misconfigured, or the Sheets API rejecting a request)
 * comes back as a readable JSON error instead of an empty 500.
 */
export function withErrors<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : "Đã có lỗi xảy ra.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
