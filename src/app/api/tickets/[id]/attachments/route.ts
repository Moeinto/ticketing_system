import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, canViewTicket, jsonError } from "@/lib/auth";
import { VALIDATION } from "@/lib/constants";
import crypto from "crypto";
import fs from "fs";
import path from "path";

type Ctx = { params: Promise<{ id: string }> };

const UPLOAD_DIR = "/home/z/my-project/uploads";

// ---------- POST: بارگذاری فایل پیوست (FR-09) ----------
export async function POST(req: NextRequest, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return jsonError("احراز هویت لازم است", 401);

  const { id } = await ctx.params;
  const ticket = await db.ticket.findUnique({ where: { id } });
  if (!ticket) return jsonError("تیکت یافت نشد", 404);
  if (!canViewTicket(user, ticket)) return jsonError("دسترسی به این تیکت مجاز نیست", 403);

  const formData = await req.formData().catch(() => null);
  if (!formData) return jsonError("بدنه درخواست نامعتبر است", 400);

  const file = formData.get("file") as File | null;
  if (!file) return jsonError("فایلی ارسال نشده است", 400);

  // کنترل نوع و حجم در سمت سرور — نام فایل مبنای اعتماد نیست (FR-09)
  const maxBytes = VALIDATION.maxFileSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return jsonError(`حجم فایل نباید بیش از ${VALIDATION.maxFileSizeMB} مگابایت باشد`, 400);
  }
  const mimeType = file.type || "application/octet-stream";
  if (!VALIDATION.allowedMimeTypes.includes(mimeType)) {
    return jsonError("نوع فایل مجاز نیست (فقط تصویر، PDF، متن، Excel، Word و ZIP)", 400);
  }
  // بررسی امضای بایت‌های اولیه برای جلوگیری از فایل اجرایی مبدل‌شکل
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return jsonError("بارگذاری فایل اجرایی مجاز نیست", 400);
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const storedName = `${crypto.randomBytes(16).toString("hex")}${path.extname(file.name).slice(0, 20) || ".bin"}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, storedName), buffer);

  const attachment = await db.ticketAttachment.create({
    data: {
      ticketId: ticket.id,
      uploaderId: user.id,
      fileName: file.name.slice(0, 200),
      storedName,
      mimeType,
      size: file.size,
    },
    include: { uploader: { select: { id: true, name: true } } },
  });

  await db.ticketEvent.create({
    data: {
      ticketId: ticket.id,
      actorId: user.id,
      type: "ATTACHMENT",
      description: `فایل «${attachment.fileName}» پیوست شد`,
    },
  });

  return Response.json({ attachment }, { status: 201 });
}
