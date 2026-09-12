import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";

const MAX_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** Admin uploads a menu item photo from their device — stored in Vercel Blob, returns the public URL. */
export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireSession(["ADMIN"]);
  if ("error" in auth) return auth.error;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Không nhận được file ảnh." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Ảnh vượt quá 8MB, vui lòng chọn ảnh nhỏ hơn." }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "jpg";
  const pathname = `menu-items/${randomUUID()}.${ext}`;

  try {
    const blob = await put(pathname, file, { access: "public" });
    return NextResponse.json({ url: blob.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const notConfigured = /No blob credentials|BLOB_READ_WRITE_TOKEN|BLOB_STORE_ID/i.test(message);
    return NextResponse.json(
      {
        error: notConfigured
          ? "Chưa cấu hình kho lưu ảnh (Vercel Blob). Vào Vercel Dashboard → Storage để tạo Blob store cho dự án, rồi Redeploy."
          : `Tải ảnh lên thất bại: ${message}`,
      },
      { status: 500 }
    );
  }
});
