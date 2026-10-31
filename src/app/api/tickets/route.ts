import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser, jsonError, type SessionUser } from "@/lib/auth";
import {
  TICKET_TYPES,
  IMPACTS,
  ENVIRONMENTS,
  STATUSES,
  PRIORITIES,
  VALIDATION,
} from "@/lib/constants";

// ---------- اعتبارسنجی ثبت تیکت (PRD بخش ۷ و ۸) ----------
const bugSchema = z.object({
  environment: z.enum(ENVIRONMENTS),
  reproducible: z.boolean().default(true),
  steps: z.string().max(5000).optional(),
  expected: z.string().min(1, "نتیجه مورد انتظار الزامی است").max(5000),
  actual: z.string().min(1, "نتیجه واقعی الزامی است").max(5000),
  occurrenceTime: z.string().max(200).optional(),
  relatedRecord: z.string().max(200).optional(),
});

const createSchema = z
  .object({
    title: z.string().min(VALIDATION.titleMin, `عنوان باید حداقل ${VALIDATION.titleMin} کاراکتر باشد`).max(VALIDATION.titleMax),
    type: z.enum(TICKET_TYPES),
    serviceId: z.string().min(1, "سامانه مرتبط الزامی است"),
    description: z.string().min(VALIDATION.descMin, `شرح باید حداقل ${VALIDATION.descMin} کاراکتر باشد`).max(VALIDATION.descMax),
    impact: z.enum(IMPACTS),
    bug: bugSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "BUG") {
      if (!data.bug) {
        ctx.addIssue({ code: "custom", message: "اطلاعات تخصصی گزارش خطا الزامی است", path: ["bug"] });
        return;
      }
      if (!data.bug.environment) {
        ctx.addIssue({ code: "custom", message: "محیط وقوع خطا الزامی است", path: ["bug", "environment"] });
      }
      if (!data.bug.expected) {
        ctx.addIssue({ code: "custom", message: "نتیجه مورد انتظار الزامی است", path: ["bug", "expected"] });
      }
      if (!data.bug.actual) {
        ctx.addIssue({ code: "custom", message: "نتیجه واقعی الزامی است", path: ["bug", "actual"] });
      }
      if (data.bug.reproducible && !data.bug.steps?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "مراحل بازتولید برای خطای قابل تکرار الزامی است",
          path: ["bug", "steps"],
        });
      }
      if (!data.bug.reproducible && !data.bug.steps?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "برای خطای غیرقابل تکرار، شرایط وقوع را توضیح دهید",
          path: ["bug", "steps"],
        });
      }
    }
  });

// ---------- مجوز دیدن تیکت در لیست ----------
function ticketScopeFilter(user: SessionUser) {
  if (user.role === "ADMIN" || user.role === "LEAD") return {};
  if (user.role === "AGENT") {
    if (user.teamId) {
      return {
        OR: [
          { teamId: user.teamId },
          { assigneeId: user.id },
          { requesterId: user.id },
          // صف تعیین مسئول: تیکت‌های بدون تیم و بدون کارشناس (FR-07)
          { teamId: null, assigneeId: null },
        ],
      };
    }
    return { OR: [{ assigneeId: user.id }, { requesterId: user.id }, { teamId: null, assigneeId: null }] };
  }
  return { requesterId: user.id };
}

// ---------- GET: لیست تیکت‌ها با جست‌وجو، فیلتر، مرتب‌سازی و صفحه‌بندی (FR-04) ----------
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return jsonError("احراز هویت لازم است", 401);

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const status = sp.get("status");
  const priority = sp.get("priority");
  const type = sp.get("type");
  const serviceId = sp.get("serviceId");
  const teamId = sp.get("teamId");
  const assigneeId = sp.get("assigneeId");
  const mine = sp.get("mine") === "1";
  const openOnly = sp.get("open") === "1";
  const sort = sp.get("sort") ?? "createdAt";
  const dir = sp.get("dir") === "asc" ? "asc" : "desc";
  const page = Math.max(1, parseInt(sp.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(5, parseInt(sp.get("pageSize") ?? "10") || 10));

  const where: Record<string, unknown> = {
    AND: [
      ticketScopeFilter(user),
      q ? { OR: [{ title: { contains: q } }, { description: { contains: q } }] } : {},
      status && STATUSES.includes(status as never) ? { status } : {},
      priority && PRIORITIES.includes(priority as never) ? { priority } : {},
      type && TICKET_TYPES.includes(type as never) ? { type } : {},
      serviceId ? { serviceId } : {},
      teamId ? { teamId } : {},
      assigneeId ? { assigneeId } : {},
      // «درخواست‌های من»: تیکت‌هایی که کاربر ثبت کرده یا به او تخصیص یافته است
      mine ? { OR: [{ requesterId: user.id }, { assigneeId: user.id }] } : {},
      openOnly ? { status: { in: ["NEW", "IN_PROGRESS", "WAITING_REQUESTER", "WAITING_TEAM"] } } : {},
    ],
  };

  const orderByMap: Record<string, unknown> = {
    createdAt: { createdAt: dir },
    updatedAt: { updatedAt: dir },
    priority: { priority: dir },
  };
  const orderBy = orderByMap[sort] ?? { createdAt: dir };

  const [total, tickets] = await Promise.all([
    db.ticket.count({ where }),
    db.ticket.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        service: { select: { name: true } },
        requester: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        _count: { select: { comments: true, attachments: true } },
      },
    }),
  ]);

  // تعداد باز و معوق برای هدر صف
  const [openCount, newCount] = await Promise.all([
    db.ticket.count({ where: { AND: [ticketScopeFilter(user), { status: { in: ["NEW", "IN_PROGRESS", "WAITING_REQUESTER", "WAITING_TEAM"] } }] } }),
    db.ticket.count({ where: { AND: [ticketScopeFilter(user), { status: "NEW" }] } }),
  ]);

  return Response.json({
    tickets: tickets.map((t) => ({
      id: t.id,
      number: t.number,
      title: t.title,
      type: t.type,
      status: t.status,
      priority: t.priority,
      impact: t.impact,
      serviceName: t.service.name,
      requester: t.requester,
      assignee: t.assignee,
      team: t.team,
      commentCount: t._count.comments,
      attachmentCount: t._count.attachments,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      resolvedAt: t.resolvedAt,
      closedAt: t.closedAt,
    })),
    total,
    page,
    pageSize,
    openCount,
    newCount,
  });
}

// ---------- POST: ثبت درخواست جدید (FR-02, FR-03) ----------
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return jsonError("احراز هویت لازم است", 401);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("بدنه درخواست نامعتبر است");

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return Response.json({ error: "اعتبارسنجی ناموفق بود", fieldErrors }, { status: 400 });
  }

  const data = parsed.data;
  const service = await db.service.findUnique({ where: { id: data.serviceId } });
  if (!service || !service.active) return jsonError("سامانه مرتبط معتبر نیست", 400);

  // ثبت‌کننده، وضعیت اولیه و اولویت نهایی از سمت سرور تعیین می‌شود (FR-02)
  const lastTicket = await db.ticket.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
  const number = (lastTicket?.number ?? 0) + 1;

  const ticket = await db.ticket.create({
    data: {
      number,
      title: data.title.trim(),
      description: data.description.trim(),
      type: data.type,
      serviceId: data.serviceId,
      impact: data.impact,
      status: "NEW",
      requesterId: user.id,
      bugDetail:
        data.type === "BUG" && data.bug
          ? {
              create: {
                environment: data.bug.environment,
                reproducible: data.bug.reproducible,
                steps: data.bug.steps?.trim() || null,
                expected: data.bug.expected.trim(),
                actual: data.bug.actual.trim(),
                occurrenceTime: data.bug.occurrenceTime?.trim() || null,
                relatedRecord: data.bug.relatedRecord?.trim() || null,
              },
            }
          : undefined,
      events: {
        create: {
          actorId: user.id,
          type: "CREATED",
          description: `تیکت با شماره ${number} توسط ${user.name} ثبت شد`,
        },
      },
    },
  });

  return Response.json(
    { ticket: { id: ticket.id, number: ticket.number, status: ticket.status } },
    { status: 201 }
  );
}
