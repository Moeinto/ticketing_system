import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser, canViewTicket, canManageTickets, isSupportRole, jsonError } from "@/lib/auth";
import { STATUSES, PRIORITIES, LABELS } from "@/lib/constants";

type Ctx = { params: Promise<{ id: string }> };

// ---------- GET: جزئیات کامل تیکت ----------
export async function GET(_req: NextRequest, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return jsonError("احراز هویت لازم است", 401);

  const { id } = await ctx.params;
  const ticket = await db.ticket.findUnique({
    where: { id },
    include: {
      service: true,
      requester: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true } },
      team: true,
      bugDetail: true,
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, role: true } } },
      },
      attachments: { include: { uploader: { select: { id: true, name: true } } } },
      assignments: {
        orderBy: { createdAt: "desc" },
        include: {
          assignee: { select: { id: true, name: true } },
          team: { select: { id: true, name: true } },
          by: { select: { id: true, name: true } },
        },
      },
      events: {
        orderBy: { createdAt: "asc" },
        include: { actor: { select: { id: true, name: true } } },
      },
    },
  });

  if (!ticket) return jsonError("تیکت یافت نشد", 404);
  if (!canViewTicket(user, ticket)) return jsonError("دسترسی به این تیکت مجاز نیست", 403);

  const showInternal = isSupportRole(user.role);

  // یادداشت‌های داخلی فقط برای نقش‌های مجاز (FR-08)
  const comments = showInternal
    ? ticket.comments
    : ticket.comments.filter((c) => !c.isInternal);

  return Response.json({
    ticket: {
      ...ticket,
      comments,
      // برای ثبت‌کننده، متن یادداشت داخلی حذف می‌شود
    },
    permissions: {
      canManage: canManageTickets(user.role),
      isRequester: ticket.requesterId === user.id,
      showInternal,
    },
  });
}

// ---------- PATCH: تغییر وضعیت، اولویت، ارجاع (FR-05, 06, 07) ----------
const patchSchema = z.object({
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assigneeId: z.string().nullable().optional(),
  teamId: z.string().nullable().optional(),
  reopenReason: z.string().max(1000).optional(),
  assignReason: z.string().max(1000).optional(),
});

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return jsonError("احراز هویت لازم است", 401);

  const { id } = await ctx.params;
  const ticket = await db.ticket.findUnique({ where: { id } });
  if (!ticket) return jsonError("تیکت یافت نشد", 404);
  if (!canViewTicket(user, ticket)) return jsonError("دسترسی به این تیکت مجاز نیست", 403);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return jsonError("مقادیر ارسالی نامعتبر است", 400);
  const data = parsed.data;

  const canManage = canManageTickets(user.role);
  const isRequester = ticket.requesterId === user.id;

  // ثبت‌کننده فقط مجاز به بازگشایی تیکت حل‌شده است (FR-05)
  if (!canManage) {
    if (!isRequester) return jsonError("شما مجاز به تغییر این تیکت نیستید", 403);
    const onlyReopen =
      data.status === "IN_PROGRESS" &&
      ticket.status === "RESOLVED" &&
      !data.priority &&
      !data.assigneeId &&
      !data.teamId;
    if (!onlyReopen) {
      return jsonError("ثبت‌کننده فقط می‌تواند تیکت حل‌شده را بازگشایی کند", 403);
    }
  }

  // بستن تیکت پیش از حل مجاز نیست (FR-05)
  if (data.status === "CLOSED" && ticket.status !== "RESOLVED" && ticket.status !== "CLOSED") {
    return jsonError("بستن تیکت پیش از ثبت نتیجه رسیدگی (حل‌شدن) مجاز نیست", 400);
  }
  if (data.status === "RESOLVED" && ticket.status === "CLOSED") {
    return jsonError("تیکت بسته‌شده قابل تغییر به حل‌شده نیست", 400);
  }

  const events: {
    actorId: string;
    type: string;
    field?: string;
    oldValue?: string;
    newValue?: string;
    description?: string;
  }[] = [];
  const updateData: Record<string, unknown> = {};

  // --- تغییر وضعیت ---
  if (data.status && data.status !== ticket.status) {
    const isReopen = ticket.status === "RESOLVED" && data.status !== "CLOSED";
    updateData.status = data.status;
    events.push({
      actorId: user.id,
      type: isReopen ? "REOPENED" : "STATUS_CHANGE",
      field: "status",
      oldValue: LABELS[ticket.status],
      newValue: LABELS[data.status],
      description: data.reopenReason
        ? `بازگشایی: ${data.reopenReason}`
        : `تغییر وضعیت از «${LABELS[ticket.status]}» به «${LABELS[data.status]}»`,
    });
    if (isReopen) {
      updateData.reopenCount = { increment: 1 };
      updateData.resolvedAt = null;
      updateData.closedAt = null;
    }
    if (data.status === "RESOLVED") updateData.resolvedAt = new Date();
    if (data.status === "CLOSED") updateData.closedAt = new Date();
    if (data.status !== "RESOLVED" && data.status !== "CLOSED") {
      updateData.resolvedAt = null;
      updateData.closedAt = null;
    }
  }

  // --- تغییر اولویت ---
  if (data.priority && data.priority !== ticket.priority) {
    updateData.priority = data.priority;
    events.push({
      actorId: user.id,
      type: "PRIORITY_CHANGE",
      field: "priority",
      oldValue: ticket.priority ? LABELS[ticket.priority] : null,
      newValue: LABELS[data.priority],
      description: `اولویت از «${ticket.priority ? LABELS[ticket.priority] : "تعیین‌نشده"}» به «${LABELS[data.priority]}» تغییر یافت`,
    });
  }

  // --- ارجاع: تیم و کارشناس (FR-07) ---
  if (data.assigneeId !== undefined || data.teamId !== undefined) {
    const newAssigneeId =
      data.assigneeId !== undefined ? data.assigneeId : ticket.assigneeId;
    const newTeamId = data.teamId !== undefined ? data.teamId : ticket.teamId;

    if (newAssigneeId !== ticket.assigneeId || newTeamId !== ticket.teamId) {
      if (newAssigneeId) {
        const assignee = await db.user.findUnique({ where: { id: newAssigneeId } });
        if (!assignee || !assignee.active || !isSupportRole(assignee.role as never)) {
          return jsonError("کارشناس مقصد معتبر نیست", 400);
        }
        updateData.assigneeId = newAssigneeId;
      } else {
        updateData.assigneeId = null;
      }
      if (newTeamId) {
        const team = await db.team.findUnique({ where: { id: newTeamId } });
        if (!team || !team.active) return jsonError("تیم مقصد معتبر نیست", 400);
        updateData.teamId = newTeamId;
      } else {
        updateData.teamId = null;
      }

      const parts: string[] = [];
      if (newTeamId !== ticket.teamId) {
        parts.push(newTeamId ? `تیم «${LABELS.team}»` : "");
      }
      if (newAssigneeId !== ticket.assigneeId) {
        const assignee = newAssigneeId
          ? await db.user.findUnique({ where: { id: newAssigneeId }, select: { name: true } })
          : null;
        parts.push(assignee ? `تخصیص به ${assignee.name}` : "حذف تخصیص کارشناس");
      }
      events.push({
        actorId: user.id,
        type: "ASSIGNMENT",
        field: "assignee",
        oldValue: ticket.assigneeId ?? undefined,
        newValue: newAssigneeId ?? undefined,
        description: data.assignReason || parts.filter(Boolean).join(" — ") || "ارجاع درخواست",
      });

      await db.ticketAssignment.create({
        data: {
          ticketId: ticket.id,
          assigneeId: newAssigneeId,
          teamId: newTeamId,
          reason: data.assignReason || "ارجاع درخواست",
          byId: user.id,
        },
      });
    }
  }

  if (events.length === 0) {
    return jsonError("تغییری اعمال نشد", 400);
  }

  const updated = await db.ticket.update({
    where: { id: ticket.id },
    data: {
      ...updateData,
      events: { create: events },
    },
    include: { assignee: { select: { id: true, name: true } }, team: { select: { id: true, name: true } } },
  });

  return Response.json({
    ticket: {
      id: updated.id,
      status: updated.status,
      priority: updated.priority,
      assignee: updated.assignee,
      team: updated.team,
    },
  });
}
