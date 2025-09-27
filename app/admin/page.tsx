import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  // @ts-expect-error custom role on session
  const role: string | undefined = session?.user?.role;

  if (!session) {
    redirect("/login");
  }
  if (role !== "ADMIN" && role !== "MANAGER") {
    redirect("/");
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-semibold mb-2">Admin Dashboard</h1>
      <p className="text-sm text-muted-foreground mb-8">Full permissions for the main Projection account.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <a href="/admin/users" className="rounded-xl border border-black/10 dark:border-white/10 p-6 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-shadow">
          <h2 className="font-medium mb-1">Users</h2>
          <p className="text-sm text-muted-foreground">Approve and manage users and roles.</p>
        </a>
        <a href="/stock" className="rounded-xl border border-black/10 dark:border-white/10 p-6 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-shadow">
          <h2 className="font-medium mb-1">Products</h2>
          <p className="text-sm text-muted-foreground">Add, edit, delete products and images.</p>
        </a>
        <a href="/settings" className="rounded-xl border border-black/10 dark:border-white/10 p-6 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-shadow">
          <h2 className="font-medium mb-1">Media & Branding</h2>
          <p className="text-sm text-muted-foreground">Change logo, background, and gallery images.</p>
        </a>
        <a href="/journal" className="rounded-xl border border-black/10 dark:border-white/10 p-6 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-shadow">
          <h2 className="font-medium mb-1">Journal</h2>
          <p className="text-sm text-muted-foreground">View daily entries and invoice records.</p>
        </a>
        <a href="/invoice" className="rounded-xl border border-black/10 dark:border-white/10 p-6 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-shadow">
          <h2 className="font-medium mb-1">Invoices</h2>
          <p className="text-sm text-muted-foreground">Access invoice entry page for managers/employees.</p>
        </a>
        <a href="/settings" className="rounded-xl border border-black/10 dark:border-white/10 p-6 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-shadow">
          <h2 className="font-medium mb-1">Settings</h2>
          <p className="text-sm text-muted-foreground">Email settings, currency, taxes, and more.</p>
        </a>
      </div>
    </div>
  );
}
