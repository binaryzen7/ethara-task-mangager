"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Card, Input, Label, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/fetch-client";

type Member = {
  userId: string;
  role: string;
  user: { id: string; email: string; name: string };
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  assigneeId: string | null;
  assignee: { id: string; name: string; email: string } | null;
  createdById: string;
};

type Project = {
  id: string;
  name: string;
  description: string | null;
  role: string;
};

export function ProjectDetail({
  project,
  members,
  tasks: initialTasks,
  currentUserId,
}: {
  project: Project;
  members: Member[];
  tasks: Task[];
  currentUserId: string;
}) {
  const router = useRouter();
  const isAdmin = project.role === "ADMIN";
  const [tab, setTab] = useState<"tasks" | "team" | "settings">("tasks");
  const [tasks, setTasks] = useState(initialTasks);
  const [memberList, setMemberList] = useState(members);
  const [error, setError] = useState("");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");

  const [projName, setProjName] = useState(project.name);
  const [projDesc, setProjDesc] = useState(project.description ?? "");

  async function refresh() {
    router.refresh();
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await apiFetch<{ task: Task }>(
      `/api/projects/${project.id}/tasks`,
      {
        method: "POST",
        body: JSON.stringify({
          title: taskTitle,
          description: taskDesc || undefined,
          dueDate: taskDue ? new Date(taskDue).toISOString() : undefined,
          assigneeId: taskAssignee || undefined,
        }),
      },
    );
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.data?.task) {
      setTasks((prev) => [res.data!.task, ...prev]);
      setTaskTitle("");
      setTaskDesc("");
      setTaskDue("");
      setTaskAssignee("");
    }
  }

  async function updateTaskStatus(taskId: string, status: string) {
    const res = await apiFetch<{ task: Task }>(`/api/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.data?.task) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...res.data!.task } : t)),
      );
    }
  }

  async function deleteTask(taskId: string) {
    if (!confirm("Delete this task?")) return;
    const res = await apiFetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (res.error) {
      setError(res.error);
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  async function inviteMember(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await apiFetch<{ member: Member & { user: Member["user"] } }>(
      `/api/projects/${project.id}/members`,
      {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      },
    );
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.data?.member) {
      const m = res.data.member;
      setMemberList((prev) => [
        ...prev,
        {
          userId: m.userId,
          role: m.role,
          user: m.user,
        },
      ]);
      setInviteEmail("");
    }
  }

  async function removeMember(userId: string) {
    if (!confirm("Remove this member?")) return;
    const res = await apiFetch(
      `/api/projects/${project.id}/members/${userId}`,
      { method: "DELETE" },
    );
    if (res.error) {
      setError(res.error);
      return;
    }
    setMemberList((prev) => prev.filter((m) => m.userId !== userId));
  }

  async function changeMemberRole(userId: string, role: string) {
    const res = await apiFetch(
      `/api/projects/${project.id}/members/${userId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ role }),
      },
    );
    if (res.error) {
      setError(res.error);
      return;
    }
    setMemberList((prev) =>
      prev.map((m) => (m.userId === userId ? { ...m, role } : m)),
    );
  }

  async function saveProject(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await apiFetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: projName, description: projDesc || null }),
    });
    if (res.error) setError(res.error);
    else await refresh();
  }

  async function deleteProject() {
    if (!confirm("Delete this project and all tasks?")) return;
    const res = await apiFetch(`/api/projects/${project.id}`, {
      method: "DELETE",
    });
    if (res.error) {
      setError(res.error);
      return;
    }
    router.push("/projects");
  }

  const statusVariant = (s: string) =>
    s === "DONE" ? "done" : s === "IN_PROGRESS" ? "progress" : "todo";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <Link href="/projects" className="text-sm text-slate-400 hover:text-white">
          ← Projects
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">{project.name}</h1>
          <Badge variant={isAdmin ? "admin" : "default"}>{project.role}</Badge>
        </div>
        {project.description && (
          <p className="mt-2 text-slate-400">{project.description}</p>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-900/30 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="mb-6 flex gap-2 border-b border-slate-800">
        {(
          [
            { id: "tasks" as const, label: "tasks" },
            { id: "team" as const, label: "team" },
            ...(isAdmin ? [{ id: "settings" as const, label: "settings" }] : []),
          ]
        ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm capitalize ${
                tab === t.id
                  ? "border-b-2 border-indigo-500 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
      </div>

      {tab === "tasks" && (
        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 font-semibold text-white">New task</h2>
            <form onSubmit={createTask} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Title</Label>
                <Input
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={2}
                />
              </div>
              <div>
                <Label>Due date</Label>
                <Input
                  type="datetime-local"
                  value={taskDue}
                  onChange={(e) => setTaskDue(e.target.value)}
                />
              </div>
              <div>
                <Label>Assignee</Label>
                <select
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {memberList
                    .filter((m) => isAdmin || m.userId === currentUserId)
                    .map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.user.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <Button type="submit">Add task</Button>
              </div>
            </form>
          </Card>

          <div className="space-y-3">
            {tasks.length === 0 ? (
              <p className="text-slate-400">No tasks yet.</p>
            ) : (
              tasks.map((task) => {
                const overdue =
                  task.dueDate &&
                  new Date(task.dueDate) < new Date() &&
                  task.status !== "DONE";
                return (
                  <Card key={task.id}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="font-medium text-white">{task.title}</h3>
                        {task.description && (
                          <p className="mt-1 text-sm text-slate-400">
                            {task.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                          {task.assignee && (
                            <span>Assigned: {task.assignee.name}</span>
                          )}
                          {task.dueDate && (
                            <span>
                              Due: {new Date(task.dueDate).toLocaleString()}
                            </span>
                          )}
                          {overdue && <Badge variant="overdue">Overdue</Badge>}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusVariant(task.status)}>
                          {task.status}
                        </Badge>
                        <select
                          className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                          value={task.status}
                          onChange={(e) =>
                            updateTaskStatus(task.id, e.target.value)
                          }
                        >
                          <option value="TODO">TODO</option>
                          <option value="IN_PROGRESS">IN_PROGRESS</option>
                          <option value="DONE">DONE</option>
                        </select>
                        {(isAdmin || task.createdById === currentUserId) && (
                          <Button
                            variant="danger"
                            type="button"
                            onClick={() => deleteTask(task.id)}
                            className="!px-2 !py-1 text-xs"
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {tab === "team" && (
        <div className="space-y-6">
          {isAdmin && (
            <Card>
              <h2 className="mb-4 font-semibold text-white">Invite member</h2>
              <form
                onSubmit={inviteMember}
                className="flex flex-wrap items-end gap-4"
              >
                <div className="min-w-[200px] flex-1">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <select
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <Button type="submit">Invite</Button>
              </form>
            </Card>
          )}

          <Card>
            <h2 className="mb-4 font-semibold text-white">Team</h2>
            <ul className="space-y-3">
              {memberList.map((m) => (
                <li
                  key={m.userId}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3 last:border-0"
                >
                  <div>
                    <p className="font-medium text-white">{m.user.name}</p>
                    <p className="text-sm text-slate-400">{m.user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && m.userId !== currentUserId ? (
                      <>
                        <select
                          className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                          value={m.role}
                          onChange={(e) =>
                            changeMemberRole(m.userId, e.target.value)
                          }
                        >
                          <option value="MEMBER">MEMBER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                        <Button
                          variant="danger"
                          type="button"
                          className="!px-2 !py-1 text-xs"
                          onClick={() => removeMember(m.userId)}
                        >
                          Remove
                        </Button>
                      </>
                    ) : (
                      <Badge variant={m.role === "ADMIN" ? "admin" : "default"}>
                        {m.role}
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {tab === "settings" && isAdmin && (
        <Card className="max-w-lg">
          <h2 className="mb-4 font-semibold text-white">Project settings</h2>
          <form onSubmit={saveProject} className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={projName}
                onChange={(e) => setProjName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={projDesc}
                onChange={(e) => setProjDesc(e.target.value)}
                rows={3}
              />
            </div>
            <Button type="submit">Save changes</Button>
          </form>
          <div className="mt-8 border-t border-slate-800 pt-6">
            <Button variant="danger" type="button" onClick={deleteProject}>
              Delete project
            </Button>
          </div>
        </Card>
      )}
    </main>
  );
}
