import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  ApiError,
  canAssignToOther,
  canDeleteTask,
  canEditTask,
  requireProjectMember,
} from "@/lib/rbac";
import { jsonError, jsonOk, validationError } from "@/lib/api";
import { updateTaskSchema } from "@/lib/validations";
import { taskInclude } from "@/lib/task-select";

type Params = { params: Promise<{ id: string }> };

async function getTaskWithAccess(userId: string, taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return null;
  const membership = await requireProjectMember(userId, task.projectId);
  return { task, membership };
}

export async function GET(_request: Request, { params }: Params) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  try {
    const result = await getTaskWithAccess(user.id, id);
    if (!result) return jsonError("Task not found", 404);

    const task = await prisma.task.findUnique({
      where: { id },
      include: taskInclude,
    });
    return jsonOk({ task });
  } catch (e) {
    if (e instanceof ApiError) return jsonError(e.message, e.status);
    throw e;
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const body = updateTaskSchema.safeParse(await request.json());
  if (!body.success) return validationError(body.error.flatten());

  try {
    const result = await getTaskWithAccess(user.id, id);
    if (!result) return jsonError("Task not found", 404);

    const { task, membership } = result;
    if (!canEditTask(membership, task, user.id)) {
      return jsonError("You cannot edit this task", 403);
    }

    if (
      body.data.assigneeId !== undefined &&
      !canAssignToOther(membership, body.data.assigneeId, user.id)
    ) {
      return jsonError("Only admins can assign tasks to other members", 403);
    }

    if (body.data.assigneeId) {
      const assigneeMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: task.projectId,
            userId: body.data.assigneeId,
          },
        },
      });
      if (!assigneeMember) {
        return jsonError("Assignee must be a project member", 400);
      }
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(body.data.title !== undefined && { title: body.data.title }),
        ...(body.data.description !== undefined && {
          description: body.data.description,
        }),
        ...(body.data.status !== undefined && { status: body.data.status }),
        ...(body.data.dueDate !== undefined && {
          dueDate: body.data.dueDate ? new Date(body.data.dueDate) : null,
        }),
        ...(body.data.assigneeId !== undefined && {
          assigneeId: body.data.assigneeId,
        }),
      },
      include: taskInclude,
    });

    return jsonOk({ task: updated });
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
    const result = await getTaskWithAccess(user.id, id);
    if (!result) return jsonError("Task not found", 404);

    const { task, membership } = result;
    if (!canDeleteTask(membership, task, user.id)) {
      return jsonError("You cannot delete this task", 403);
    }

    await prisma.task.delete({ where: { id } });
    return jsonOk({ success: true });
  } catch (e) {
    if (e instanceof ApiError) return jsonError(e.message, e.status);
    throw e;
  }
}
