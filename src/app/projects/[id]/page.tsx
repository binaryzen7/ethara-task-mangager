import { redirect, notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectDetail } from "@/components/ProjectDetail";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectDetailPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: id, userId: user.id } },
  });
  if (!membership) notFound();

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: { joinedAt: "asc" },
      },
      tasks: {
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!project) notFound();

  return (
    <>
      <Navbar userName={user.name} />
      <ProjectDetail
        project={{
          id: project.id,
          name: project.name,
          description: project.description,
          role: membership.role,
        }}
        members={project.members.map((m) => ({
          userId: m.userId,
          role: m.role,
          user: m.user,
        }))}
        tasks={project.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          dueDate: t.dueDate?.toISOString() ?? null,
          assigneeId: t.assigneeId,
          assignee: t.assignee,
          createdById: t.createdById,
        }))}
        currentUserId={user.id}
      />
    </>
  );
}
