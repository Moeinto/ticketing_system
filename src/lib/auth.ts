import { cookies, headers } from "next/headers";
import crypto from "crypto";
import { db } from "@/lib/db";
import type { Role } from "@/lib/constants";

export const SESSION_COOKIE = "its_session";
const SESSION_DAYS = 7;

// ---------- هش رمز عبور (scrypt) ----------
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

// ---------- نشست ----------
export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { token, userId, expiresAt } });

  // اگر درخواست از طریق HTTPS (مثلاً لینک preview پشت پروکسی) آمده باشد،
  // کوکی باید SameSite=None و Secure باشد تا مرورگر آن را ذخیره و ارسال کند.
  // در غیر این صورت در بستر iframe/پروکسی، مرورگر کوکی را پس نمی‌زند و همه
  // درخواست‌های بعدی 401 می‌خورند («خطا در بارگذاری درخواست‌ها»).
  const h = await headers();
  const proto = (h.get("x-forwarded-proto") ?? "").split(",")[0].trim();
  const isHttps = proto === "https";

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: isHttps ? "none" : "lax",
    secure: isHttps,
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token } });
    cookieStore.delete(SESSION_COOKIE);
  }
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  teamId: string | null;
  teamName: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { team: true } } },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (!session.user.active) return null;

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role as Role,
    teamId: session.user.teamId,
    teamName: session.user.team?.name ?? null,
  };
}

// ---------- مجوزها ----------
export function isSupportRole(role: Role) {
  return role === "AGENT" || role === "LEAD" || role === "ADMIN";
}

export function canManageTickets(role: Role) {
  return isSupportRole(role);
}

/** کاربر اجازه مشاهده تیکت را دارد؟ (FR: جلوگیری از مشاهده تیکت غیرمجاز) */
export function canViewTicket(
  user: SessionUser,
  ticket: { requesterId: string; assigneeId: string | null; teamId: string | null }
) {
  if (user.role === "ADMIN" || user.role === "LEAD") return true;
  if (isSupportRole(user.role)) {
    // تیکت بدون مسئول و تیم = صف تعیین مسئول، برای همه کارشناسان قابل مشاهده است
    if (!ticket.teamId && !ticket.assigneeId) return true;
    if (ticket.teamId && user.teamId === ticket.teamId) return true;
  }
  return ticket.requesterId === user.id || ticket.assigneeId === user.id;
}

export function jsonError(message: string, status: number = 400) {
  return Response.json({ error: message }, { status });
}
