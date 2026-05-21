export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ApiError, requireProjectAdmin, requireProjectMember } from "@/lib/rbac";
import { jsonError, jsonOk, validationError } from "@/lib/api";
import { updateProjectSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  try {
    const membership = await requireProjectMember(user.id, id);
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        _count: { select: { tasks: true, members: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!project) return jsonError("Project not found", 404);

    return jsonOk({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        createdAt: project.createdAt,
        createdBy: project.createdBy,
        role: membership.role,
        taskCount: project._count.tasks,
        memberCount: project._count.members,
      },
    });
  } catch (e) {
    if (e instanceof ApiError) return jsonError(e.message, e.status);
    throw e;
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const body = updateProjectSchema.safeParse(await request.json());
  if (!body.success) return validationError(body.error.flatten());

  try {
    await requireProjectAdmin(user.id, id);
    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(body.data.name !== undefined && { name: body.data.name }),
        ...(body.data.description !== undefined && {
          description: body.data.description,
        }),
      },
    });
    return jsonOk({ project });
  } catch (e) {
    if (e instanceof ApiError) return jsonError(e.message, e.status);
    throw e;
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  try {
    await requireProjectAdmin(user.id, id);
    await prisma.project.delete({ where: { id } });
    return jsonOk({ success: true });
  } catch (e) {
    if (e instanceof ApiError) return jsonError(e.message, e.status);
    throw e;
  }
}
