import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsForm from "@/components/settings-form";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?role=manager");
  // @ts-expect-error role on session
  const role: string | undefined = session?.user?.role;
  if (role !== "ADMIN" && role !== "MANAGER") redirect("/");
  return <SettingsForm />;
}
