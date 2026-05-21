export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { taskInclude } from "@/lib/task-select";

export async function GET() {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const projectIds = (
    await prisma.projectMember.findMany({
      where: { userId: user.id },
      select: { projectId: true },
    })
  ).map((m) => m.projectId);

  if (projectIds.length === 0) {
    return jsonOk({
      byStatus: { TODO: 0, IN_PROGRESS: 0, DONE: 0 },
      overdue: [],
      myTasks: [],
      recentProjects: [],
    });
  }

  const now = new Date();

  const [statusGroups, overdue, myTasks, recentProjects] = await Promise.all([
    prisma.task.groupBy({
      by: ["status"],
      where: { projectId: { in: projectIds } },
      _count: { status: true },
    }),
    prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        dueDate: { lt: now },
        status: { not: "DONE" },
      },
      include: taskInclude,
      orderBy: { dueDate: "asc" },
      take: 20,
    }),
    prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        OR: [{ assigneeId: user.id }, { createdById: user.id }],
        status: { not: "DONE" },
      },
      include: taskInclude,
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    prisma.project.findMany({
      where: { id: { in: projectIds } },
      include: {
        members: {
          where: { userId: user.id },
          select: { role: true },
        },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const byStatus = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  for (const g of statusGroups) {
    byStatus[g.status] = g._count.status;
  }

  return jsonOk({
    byStatus,
    overdue,
    myTasks,
    recentProjects: recentProjects.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.members[0]?.role,
      taskCount: p._count.tasks,
    })),
  });
}
