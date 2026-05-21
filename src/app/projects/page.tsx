import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Badge, Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const projects = await prisma.project.findMany({
    where: { members: { some: { userId: user.id } } },
    include: {
      members: { where: { userId: user.id }, select: { role: true } },
      _count: { select: { tasks: true, members: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <Navbar userName={user.name} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <Link
            href="/projects/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            New project
          </Link>
        </div>

        {projects.length === 0 ? (
          <Card>
            <p className="text-slate-400">
              No projects yet. Create your first project to get started.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card className="h-full transition hover:border-indigo-500">
                  <h2 className="font-semibold text-white">{p.name}</h2>
                  {p.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                      {p.description}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <Badge variant={p.members[0]?.role === "ADMIN" ? "admin" : "default"}>
                      {p.members[0]?.role}
                    </Badge>
                    <span className="text-slate-500">
                      {p._count.tasks} tasks · {p._count.members} members
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
