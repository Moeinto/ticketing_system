import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, verifyPassword, jsonError } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("ایمیل معتبر نیست"),
  password: z.string().min(1, "رمز عبور الزامی است"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "اطلاعات ورود نامعتبر است", 400);
    }
    const { email, password } = parsed.data;

    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user || !user.active) {
      return jsonError("ایمیل یا رمز عبور اشتباه است", 401);
    }
    if (!verifyPassword(password, user.passwordHash)) {
      return jsonError("ایمیل یا رمز عبور اشتباه است", 401);
    }

    const token = await createSession(user.id);
    return Response.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, teamId: user.teamId },
      // توکن برای ذخیره در localStorage — پشتیبان کوکی در بستر iframe/پروکسی
      token,
    });
  } catch {
    return jsonError("خطا در پردازش درخواست ورود", 500);
  }
}
