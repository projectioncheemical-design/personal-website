"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";

export default function AuthBar() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="text-sm text-muted-foreground">Loading…</div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <a
          href="/login?role=representative"
          className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10"
          title="Log in"
        >
          Log in
        </a>
      </div>
    );
  }

  const name = session.user?.name || session.user?.email || "User";
  // @ts-expect-error - custom role added in session callback
  const role = session.user?.role as string | undefined;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground hidden sm:inline">{name}{role ? ` • ${role}` : ""}</span>
      {(role === "ADMIN" || role === "MANAGER") && (
        <Link href="/admin" className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10">
          Dashboard
        </Link>
      )}
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="rounded-lg bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 text-sm hover:opacity-90"
      >
        Logout
      </button>
    </div>
  );
}
