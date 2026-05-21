export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ApiError, requireProjectAdmin, requireProjectMember } from "@/lib/rbac";
import { jsonError, jsonOk, validationError } from "@/lib/api";
import { inviteMemberSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  try {
    await requireProjectMember(user.id, id);
    const members = await prisma.projectMember.findMany({
      where: { projectId: id },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { joinedAt: "asc" },
    });
    return jsonOk({
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
    });
  } catch (e) {
    if (e instanceof ApiError) return jsonError(e.message, e.status);
    throw e;
  }
}

export async function POST(request: Request, { params }: Params) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const body = inviteMemberSchema.safeParse(await request.json());
  if (!body.success) return validationError(body.error.flatten());

  try {
    await requireProjectAdmin(user.id, id);
    const invitee = await prisma.user.findUnique({
      where: { email: body.data.email },
    });
    if (!invitee) {
      return jsonError("User with this email is not registered", 404);
    }

    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId: invitee.id } },
    });
    if (existing) {
      return jsonError("User is already a member", 409);
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId: id,
        userId: invitee.id,
        role: body.data.role ?? "MEMBER",
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    return jsonOk({ member }, 201);
  } catch (e) {
    if (e instanceof ApiError) return jsonError(e.message, e.status);
    throw e;
  }
}
