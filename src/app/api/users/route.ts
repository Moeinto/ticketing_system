import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser, hashPassword, jsonError } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

// GET: فهرست کاربران — فقط برای نقش‌های مدیریتی
export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonError("احراز هویت لازم است", 401);
  if (user.role !== "ADMIN" && user.role !== "LEAD") return jsonError("دسترسی مجاز نیست", 403);

  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      team: { select: { id: true, name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return Response.json({ users });
}

const createSchema = z.object({
  name: z.string().min(2, "نام الزامی است").max(100),
  email: z.string().email("ایمیل معتبر نیست"),
  password: z.string().min(6, "رمز عبور حداقل ۶ کاراکتر باشد"),
  role: z.enum(ROLES),
  teamId: z.string().nullable().optional(),
});

// POST: ایجاد کاربر جدید — فقط مدیر سامانه (FR-01)
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return jsonError("احراز هویت لازم است", 401);
  if (user.role !== "ADMIN") return jsonError("فقط مدیر سامانه می‌تواند کاربر ایجاد کند", 403);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است", 400);
  }

  const { name, email, password, role, teamId } = parsed.data;
  const exists = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (exists) return jsonError("این ایمیل قبلاً ثبت شده است", 400);

  const newUser = await db.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: hashPassword(password),
      role,
      teamId: teamId || null,
    },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  return Response.json({ user: newUser }, { status: 201 });
}

// PATCH: فعال/غیرفعال‌سازی کاربر — فقط مدیر سامانه
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return jsonError("احراز هویت لازم است", 401);
  if (user.role !== "ADMIN") return jsonError("فقط مدیر سامانه مجاز است", 403);

  const body = await req.json().catch(() => null);
  const userId = body?.userId as string | undefined;
  const active = body?.active as boolean | undefined;
  if (!userId || typeof active !== "boolean") return jsonError("پارامترها نامعتبر است", 400);
  if (userId === user.id) return jsonError("امکان غیرفعال‌سازی حساب خودتان وجود ندارد", 400);

  const updated = await db.user.update({
    where: { id: userId },
    data: { active },
    select: { id: true, active: true },
  });
  if (!active) {
    await db.session.deleteMany({ where: { userId } });
  }
  return Response.json({ user: updated });
}
