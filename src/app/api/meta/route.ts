import { db } from "@/lib/db";
import { getSessionUser, isSupportRole } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "احراز هویت لازم است" }, { status: 401 });

  const [services, teams, supportUsers] = await Promise.all([
    db.service.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.team.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    isSupportRole(user.role)
      ? db.user.findMany({
          where: { active: true, role: { in: ["AGENT", "LEAD", "ADMIN"] } },
          select: { id: true, name: true, role: true, teamId: true, team: { select: { name: true } } },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return Response.json({
    services: services.map((s) => ({ id: s.id, name: s.name })),
    teams: teams.map((t) => ({ id: t.id, name: t.name })),
    agents: supportUsers.map((u) => ({ id: u.id, name: u.name, role: u.role, teamId: u.teamId, teamName: u.team?.name ?? null })),
  });
}
