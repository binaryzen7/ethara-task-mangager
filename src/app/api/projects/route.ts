export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk, validationError } from "@/lib/api";
import { createProjectSchema } from "@/lib/validations";

export async function GET() {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const projects = await prisma.project.findMany({
    where: { members: { some: { userId: user.id } } },
    include: {
      members: {
        where: { userId: user.id },
        select: { role: true },
      },
      _count: { select: { tasks: true, members: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk({
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      createdAt: p.createdAt,
      role: p.members[0]?.role,
      taskCount: p._count.tasks,
      memberCount: p._count.members,
    })),
  });
}

export async function POST(request: Request) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const body = createProjectSchema.safeParse(await request.json());
  if (!body.success) return validationError(body.error.flatten());

  const project = await prisma.project.create({
    data: {
      name: body.data.name,
      description: body.data.description,
      createdById: user.id,
      members: {
        create: { userId: user.id, role: "ADMIN" },
      },
    },
    include: {
      members: { where: { userId: user.id }, select: { role: true } },
    },
  });

  return jsonOk(
    {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        createdAt: project.createdAt,
        role: project.members[0]?.role,
      },
    },
    201,
  );
}
