export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ApiError, requireProjectAdmin } from "@/lib/rbac";
import { jsonError, jsonOk, validationError } from "@/lib/api";
import { updateMemberSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string; userId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const { id, userId } = await params;
  const body = updateMemberSchema.safeParse(await request.json());
  if (!body.success) return validationError(body.error.flatten());

  try {
    await requireProjectAdmin(user.id, id);

    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId } },
    });
    if (!member) return jsonError("Member not found", 404);

    if (member.role === "ADMIN" && body.data.role === "MEMBER") {
      const adminCount = await prisma.projectMember.count({
        where: { projectId: id, role: "ADMIN" },
      });
      if (adminCount <= 1) {
        return jsonError("Cannot demote the last admin", 400);
      }
    }

    const updated = await prisma.projectMember.update({
      where: { projectId_userId: { projectId: id, userId } },
      data: { role: body.data.role },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    return jsonOk({ member: updated });
  } catch (e) {
    if (e instanceof ApiError) return jsonError(e.message, e.status);
    throw e;
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const { id, userId } = await params;
  try {
    await requireProjectAdmin(user.id, id);

    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId } },
    });
    if (!member) return jsonError("Member not found", 404);

    if (member.role === "ADMIN") {
      const adminCount = await prisma.projectMember.count({
        where: { projectId: id, role: "ADMIN" },
      });
      if (adminCount <= 1) {
        return jsonError("Cannot remove the last admin", 400);
      }
    }

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId: id, userId } },
    });

    return jsonOk({ success: true });
  } catch (e) {
    if (e instanceof ApiError) return jsonError(e.message, e.status);
    throw e;
  }
}
