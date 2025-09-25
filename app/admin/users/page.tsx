import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AdminUsersTable from "@/components/admin-users-table";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  // @ts-expect-error custom
  const role: string | undefined = session?.user?.role;
  if (!session) redirect("/login?role=manager");
  if (role !== "ADMIN" && role !== "MANAGER") redirect("/");

  const [requesters, employees] = await Promise.all([
    prisma.user.findMany({
      where: { role: "REQUESTER" },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, username: true, email: true, phone: true, createdAt: true },
    }),
    prisma.user.findMany({
      where: { role: "EMPLOYEE" },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, username: true, email: true, phone: true, createdAt: true },
    }),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-semibold mb-2">Users</h1>
      <p className="text-sm text-muted-foreground mb-6">Approve customers as Representatives (employees) or keep them as customers.</p>
      <AdminUsersTable requesters={requesters} employees={employees} />
    </div>
  );
}
