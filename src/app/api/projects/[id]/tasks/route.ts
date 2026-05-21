import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  ApiError,
  canAssignToOther,
  requireProjectMember,
} from "@/lib/rbac";
import { jsonError, jsonOk, validationError } from "@/lib/api";
import { createTaskSchema } from "@/lib/validations";
import { taskInclude } from "@/lib/task-select";
import type { TaskStatus } from "@/generated/prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as TaskStatus | null;
  const assignee = searchParams.get("assignee");

  try {
    await requireProjectMember(user.id, id);

    const tasks = await prisma.task.findMany({
      where: {
        projectId: id,
        ...(status && { status }),
        ...(assignee === "me" && { assigneeId: user.id }),
      },
      include: taskInclude,
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    });

    return jsonOk({ tasks });
  } catch (e) {
    if (e instanceof ApiError) return jsonError(e.message, e.status);
    throw e;
  }
}

export async function POST(request: Request, { params }: Params) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const body = createTaskSchema.safeParse(await request.json());
  if (!body.success) return validationError(body.error.flatten());

  try {
    const membership = await requireProjectMember(user.id, id);

    if (
      body.data.assigneeId &&
      !canAssignToOther(membership, body.data.assigneeId, user.id)
    ) {
      return jsonError("Only admins can assign tasks to other members", 403);
    }

    if (body.data.assigneeId) {
      const assigneeMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: id, userId: body.data.assigneeId },
        },
      });
      if (!assigneeMember) {
        return jsonError("Assignee must be a project member", 400);
      }
    }

    const task = await prisma.task.create({
      data: {
        projectId: id,
        title: body.data.title,
        description: body.data.description,
        status: body.data.status ?? "TODO",
        dueDate: body.data.dueDate ? new Date(body.data.dueDate) : null,
        assigneeId: body.data.assigneeId ?? null,
        createdById: user.id,
      },
      include: taskInclude,
    });

    return jsonOk({ task }, 201);
  } catch (e) {
    if (e instanceof ApiError) return jsonError(e.message, e.status);
    throw e;
  }
}
