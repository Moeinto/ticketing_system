import { db } from "@/lib/db";
import { getSessionUser, isSupportRole, jsonError } from "@/lib/auth";
import { STATUSES, TICKET_TYPES, PRIORITIES, OPEN_STATUSES } from "@/lib/constants";

function minutesBetween(a: Date | null, b: Date | null): number | null {
  if (!a || !b || b < a) return null;
  return (b.getTime() - a.getTime()) / 60000;
}

// گزارش‌های پایه عملیاتی (FR-10)
export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonError("احراز هویت لازم است", 401);
  if (!isSupportRole(user.role)) return jsonError("گزارش‌ها فقط برای تیم پشتیبانی قابل مشاهده است", 403);

  const tickets = await db.ticket.findMany({
    select: {
      status: true,
      type: true,
      priority: true,
      teamId: true,
      team: { select: { name: true } },
      assigneeId: true,
      assignee: { select: { name: true } },
      reopenCount: true,
      firstRespondedAt: true,
      resolvedAt: true,
      closedAt: true,
      createdAt: true,
    },
  });

  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  const byType = Object.fromEntries(TICKET_TYPES.map((t) => [t, 0]));
  const byTeam: Record<string, number> = {};
  const byAgent: Record<string, number> = {};

  let firstResponseSum = 0;
  let firstResponseCount = 0;
  let resolutionSum = 0;
  let resolutionCount = 0;
  let resolvedTotal = 0;
  let reopenedTotal = 0;

  for (const t of tickets) {
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
    byType[t.type] = (byType[t.type] ?? 0) + 1;
    const teamName = t.team?.name ?? "بدون تیم";
    byTeam[teamName] = (byTeam[teamName] ?? 0) + 1;
    const agentName = t.assignee?.name ?? "بدون مسئول";
    byAgent[agentName] = (byAgent[agentName] ?? 0) + 1;

    const fr = minutesBetween(t.createdAt, t.firstRespondedAt);
    if (fr != null) {
      firstResponseSum += fr;
      firstResponseCount++;
    }
    if (t.resolvedAt) {
      resolvedTotal++;
      if (t.reopenCount > 0) reopenedTotal++;
      const res = minutesBetween(t.createdAt, t.resolvedAt);
      if (res != null) {
        resolutionSum += res;
        resolutionCount++;
      }
    }
  }

  const unassignedOpen = tickets.filter(
    (t) => OPEN_STATUSES.includes(t.status as never) && !t.assigneeId && !t.teamId
  ).length;

  const openByPriority = Object.fromEntries(
    PRIORITIES.map((p) => [p, tickets.filter((t) => t.priority === p && OPEN_STATUSES.includes(t.status as never)).length])
  );

  return Response.json({
    total: tickets.length,
    byStatus,
    byType,
    byTeam,
    byAgent,
    openByPriority,
    unassignedOpen,
    avgFirstResponseMinutes: firstResponseCount ? firstResponseSum / firstResponseCount : null,
    avgResolutionMinutes: resolutionCount ? resolutionSum / resolutionCount : null,
    reopenRate: resolvedTotal ? reopenedTotal / resolvedTotal : null,
  });
}
