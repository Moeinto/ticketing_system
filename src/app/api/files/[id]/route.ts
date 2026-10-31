import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, canViewTicket, jsonError } from "@/lib/auth";
import fs from "fs";
import path from "path";

type Ctx = { params: Promise<{ id: string }> };

const UPLOAD_DIR = "/home/z/my-project/uploads";

// دسترسی به فایل مطابق مجوز دسترسی به تیکت (FR-09)
export async function GET(_req: NextRequest, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return jsonError("احراز هویت لازم است", 401);

  const { id } = await ctx.params;
  const attachment = await db.ticketAttachment.findUnique({
    where: { id },
    include: { ticket: { select: { requesterId: true, assigneeId: true, teamId: true } } },
  });
  if (!attachment) return jsonError("فایل یافت نشد", 404);

  if (!canViewTicket(user, attachment.ticket)) {
    return jsonError("دسترسی به این فایل مجاز نیست", 403);
  }

  const filePath = path.join(UPLOAD_DIR, attachment.storedName);
  // جلوگیری از Path Traversal
  if (!filePath.startsWith(UPLOAD_DIR) || !fs.existsSync(filePath)) {
    return jsonError("فایل روی سرور موجود نیست", 404);
  }

  const buffer = fs.readFileSync(filePath);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
