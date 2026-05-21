import { prisma } from "@/lib/prisma";
import type { ProjectMember, ProjectRole, Task } from "@/generated/prisma/client";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function requireProjectMember(
  userId: string,
  projectId: string,
): Promise<ProjectMember> {
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!membership) {
    throw new ApiError("Project not found", 404);
  }
  return membership;
}

export function isAdmin(role: ProjectRole) {
  return role === "ADMIN";
}

export async function requireProjectAdmin(userId: string, projectId: string) {
  const membership = await requireProjectMember(userId, projectId);
  if (!isAdmin(membership.role)) {
    throw new ApiError("Admin access required", 403);
  }
  return membership;
}

export function canEditTask(
  membership: ProjectMember,
  task: Task,
  userId: string,
): boolean {
  if (isAdmin(membership.role)) return true;
  return task.createdById === userId || task.assigneeId === userId;
}

export function canDeleteTask(
  membership: ProjectMember,
  task: Task,
  userId: string,
): boolean {
  if (isAdmin(membership.role)) return true;
  return task.createdById === userId;
}

export function canAssignToOther(membership: ProjectMember, assigneeId: string | null | undefined, userId: string) {
  if (!assigneeId || assigneeId === userId) return true;
  return isAdmin(membership.role);
}
