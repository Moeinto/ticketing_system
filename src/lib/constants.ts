// ثابت‌ها و برچسب‌های فارسی سامانه تیکتینگ — مطابق PRD بخش ۷

export const ROLES = ["REQUESTER", "AGENT", "LEAD", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const TICKET_TYPES = ["BUG", "ACCESS", "GUIDANCE", "CHANGE"] as const;
export type TicketType = (typeof TICKET_TYPES)[number];

export const IMPACTS = ["SINGLE_USER", "TEAM", "DEPARTMENT", "ORGANIZATION"] as const;
export type Impact = (typeof IMPACTS)[number];

export const PRIORITIES = ["P1", "P2", "P3", "P4"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STATUSES = [
  "NEW",
  "IN_PROGRESS",
  "WAITING_REQUESTER",
  "WAITING_TEAM",
  "RESOLVED",
  "CLOSED",
] as const;
export type Status = (typeof STATUSES)[number];

export const ENVIRONMENTS = ["PRODUCTION", "STAGING", "DEVELOPMENT"] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export const EVENT_TYPES = [
  "CREATED",
  "STATUS_CHANGE",
  "PRIORITY_CHANGE",
  "ASSIGNMENT",
  "COMMENT",
  "INTERNAL_NOTE",
  "ATTACHMENT",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
] as const;

export const LABELS: Record<string, string> = {
  // نقش‌ها
  REQUESTER: "ثبت‌کننده",
  AGENT: "کارشناس پشتیبانی",
  LEAD: "سرپرست پشتیبانی",
  ADMIN: "مدیر سامانه",
  // انواع درخواست
  BUG: "گزارش خطا",
  ACCESS: "درخواست دسترسی",
  GUIDANCE: "درخواست راهنمایی",
  CHANGE: "درخواست تغییر",
  // دامنه تأثیر
  SINGLE_USER: "یک کاربر",
  TEAM: "یک تیم",
  DEPARTMENT: "یک واحد سازمانی",
  ORGANIZATION: "کل سازمان",
  // وضعیت‌ها
  NEW: "جدید",
  IN_PROGRESS: "در حال بررسی",
  WAITING_REQUESTER: "در انتظار پاسخ ثبت‌کننده",
  WAITING_TEAM: "در انتظار تیم دیگر",
  RESOLVED: "حل‌شده",
  CLOSED: "بسته‌شده",
  // اولویت‌ها
  P1: "بحرانی (P1)",
  P2: "بالا (P2)",
  P3: "متوسط (P3)",
  P4: "پایین (P4)",
  // محیط
  PRODUCTION: "Production",
  STAGING: "Staging",
  DEVELOPMENT: "Development",
  // رویدادها
  CREATED: "ایجاد تیکت",
  STATUS_CHANGE: "تغییر وضعیت",
  PRIORITY_CHANGE: "تغییر اولویت",
  ASSIGNMENT: "ارجاع و تخصیص",
  COMMENT: "پیام",
  INTERNAL_NOTE: "یادداشت داخلی",
  ATTACHMENT: "فایل پیوست",
  RESOLVED: "حل‌شدن",
  CLOSED: "بسته‌شدن",
  REOPENED: "بازگشایی",
  status: "وضعیت",
  priority: "اولویت",
  assignee: "کارشناس مسئول",
  team: "تیم مسئول",
};

export const OPEN_STATUSES: Status[] = ["NEW", "IN_PROGRESS", "WAITING_REQUESTER", "WAITING_TEAM"];

export function isOpen(status: string) {
  return OPEN_STATUSES.includes(status as Status);
}

// قواعد اعتبارسنجی فرم — PRD بخش ۸
export const VALIDATION = {
  titleMin: 5,
  titleMax: 200,
  descMin: 20,
  descMax: 5000,
  maxFileSizeMB: 5,
  allowedMimeTypes: [
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
  ],
};

export function formatTicketNumber(n: number) {
  return `TKT-${String(n).padStart(4, "0")}`;
}

export function formatFaDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(d));
  } catch {
    return "—";
  }
}

export function formatDuration(minutes: number | null | undefined) {
  if (minutes == null) return "—";
  if (minutes < 1) return "کمتر از یک دقیقه";
  if (minutes < 60) return `${Math.round(minutes)} دقیقه`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ساعت و ${Math.round(minutes % 60)} دقیقه`;
  const days = Math.floor(hours / 24);
  return `${days} روز و ${hours % 24} ساعت`;
}
