export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Badge, Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { taskInclude } from "@/lib/task-select";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const projectIds = (
    await prisma.projectMember.findMany({
      where: { userId: user.id },
      select: { projectId: true },
    })
  ).map((m) => m.projectId);

  const now = new Date();
  let byStatus = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  type TaskWithProject = Awaited<
    ReturnType<
      typeof prisma.task.findMany<{ include: typeof taskInclude }>
    >
  >[number];
  let overdue: TaskWithProject[] = [];
  let myTasks: TaskWithProject[] = [];
  let recentProjects: {
    id: string;
    name: string;
    role: string;
    taskCount: number;
  }[] = [];

  if (projectIds.length > 0) {
    const [statusGroups, overdueTasks, myTasksList, projects] =
      await Promise.all([
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
          take: 10,
        }),
        prisma.task.findMany({
          where: {
            projectId: { in: projectIds },
            OR: [{ assigneeId: user.id }, { createdById: user.id }],
            status: { not: "DONE" },
          },
          include: taskInclude,
          orderBy: { dueDate: "asc" },
          take: 8,
        }),
        prisma.project.findMany({
          where: { id: { in: projectIds } },
          include: {
            members: { where: { userId: user.id }, select: { role: true } },
            _count: { select: { tasks: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

    byStatus = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
    for (const g of statusGroups) {
      byStatus[g.status] = g._count.status;
    }
    overdue = overdueTasks;
    myTasks = myTasksList;
    recentProjects = projects.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.members[0]?.role ?? "MEMBER",
      taskCount: p._count.tasks,
    }));
  }

  return (
    <>
      <Navbar userName={user.name} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <Link
            href="/projects/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            New project
          </Link>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {(
            [
              ["TODO", byStatus.TODO, "todo"],
              ["IN_PROGRESS", byStatus.IN_PROGRESS, "progress"],
              ["DONE", byStatus.DONE, "done"],
            ] as const
          ).map(([label, count, variant]) => (
            <Card key={label}>
              <p className="text-sm text-slate-400">{label.replace("_", " ")}</p>
              <p className="mt-1 text-3xl font-bold text-white">{count}</p>
              <Badge variant={variant}>{label}</Badge>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-white">
              Overdue tasks
            </h2>
            {overdue.length === 0 ? (
              <p className="text-sm text-slate-400">No overdue tasks</p>
            ) : (
              <ul className="space-y-3">
                {overdue.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3 last:border-0"
                  >
                    <div>
                      <Link
                        href={`/projects/${task.projectId}`}
                        className="font-medium text-white hover:text-indigo-300"
                      >
                        {task.title}
                      </Link>
                      <p className="text-xs text-slate-400">
                        {task.project.name}
                      </p>
                    </div>
                    <Badge variant="overdue">
                      {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString()
                        : ""}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 text-lg font-semibold text-white">My tasks</h2>
            {myTasks.length === 0 ? (
              <p className="text-sm text-slate-400">No active tasks</p>
            ) : (
              <ul className="space-y-3">
                {myTasks.map((task) => (
                  <li key={task.id} className="border-b border-slate-800 pb-3 last:border-0">
                    <Link
                      href={`/projects/${task.projectId}`}
                      className="font-medium text-white hover:text-indigo-300"
                    >
                      {task.title}
                    </Link>
                    <div className="mt-1 flex gap-2">
                      <Badge
                        variant={
                          task.status === "DONE"
                            ? "done"
                            : task.status === "IN_PROGRESS"
                              ? "progress"
                              : "todo"
                        }
                      >
                        {task.status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="mt-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Recent projects
          </h2>
          {recentProjects.length === 0 ? (
            <p className="text-sm text-slate-400">
              No projects yet.{" "}
              <Link href="/projects/new" className="text-indigo-400">
                Create one
              </Link>
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {recentProjects.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className="block rounded-lg border border-slate-800 p-4 hover:border-indigo-500"
                  >
                    <span className="font-medium text-white">{p.name}</span>
                    <div className="mt-2 flex gap-2 text-xs text-slate-400">
                      <Badge variant={p.role === "ADMIN" ? "admin" : "default"}>
                        {p.role}
                      </Badge>
                      <span>{p.taskCount} tasks</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </>
  );
}
