"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function Navbar({ userName }: { userName: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/dashboard" className="text-lg font-semibold text-white">
          Team Task Manager
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/dashboard" className="text-slate-300 hover:text-white">
            Dashboard
          </Link>
          <Link href="/projects" className="text-slate-300 hover:text-white">
            Projects
          </Link>
          <span className="text-slate-400">{userName}</span>
          <button
            onClick={logout}
            className="text-slate-400 hover:text-white"
            type="button"
          >
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}
