import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser, canViewTicket, isSupportRole, jsonError } from "@/lib/auth";
import { VALIDATION } from "@/lib/constants";

type Ctx = { params: Promise<{ id: string }> };

const commentSchema = z.object({
  body: z.string().min(1, "متن پیام الزامی است").max(5000, "حداکثر ۵۰۰۰ کاراکتر"),
  isInternal: z.boolean().default(false),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return jsonError("احراز هویت لازم است", 401);

  const { id } = await ctx.params;
  const ticket = await db.ticket.findUnique({ where: { id } });
  if (!ticket) return jsonError("تیکت یافت نشد", 404);
  if (!canViewTicket(user, ticket)) return jsonError("دسترسی به این تیکت مجاز نیست", 403);

  const body = await req.json().catch(() => null);
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "پیام نامعتبر است", 400);
  }

  const isSupport = isSupportRole(user.role);
  // یادداشت داخلی فقط برای نقش‌های پشتیبانی (FR-08)
  const isInternal = isSupport ? parsed.data.isInternal : false;

  const [comment] = await db.$transaction([
    db.ticketComment.create({
      data: {
        ticketId: ticket.id,
        authorId: user.id,
        body: parsed.data.body.trim(),
        isInternal,
      },
      include: { author: { select: { id: true, name: true, role: true } } },
    }),
    db.ticketEvent.create({
      data: {
        ticketId: ticket.id,
        actorId: user.id,
        type: isInternal ? "INTERNAL_NOTE" : "COMMENT",
        description: isInternal ? "یادداشت داخلی ثبت شد" : "پیام جدید ثبت شد",
      },
    }),
    // زمان اولین پاسخ انسانی معتبر (FR-10 / شاخص موفقیت)
    ...(!isInternal && isSupport && !ticket.firstRespondedAt
      ? [
          db.ticket.update({
            where: { id: ticket.id },
            data: { firstRespondedAt: new Date() },
          }),
        ]
      : []),
  ]);

  return Response.json({ comment }, { status: 201 });
}
