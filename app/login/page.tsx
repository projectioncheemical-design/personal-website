import { redirect } from "next/navigation";

export default function LoginRedirect({ searchParams }: { searchParams?: { role?: string } }) {
  const role = searchParams?.role;
  const callbackUrl = role === "manager" ? "/admin" : role === "representative" ? "/invoice" : "/";
  redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
}
