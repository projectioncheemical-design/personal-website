import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import InvoiceForm from "@/components/invoice-form";
import PrintButton from "@/components/print-button";

export default async function InvoicePage() {
  const session = await getServerSession(authOptions);
  // @ts-expect-error custom role on session
  const role: string | undefined = session?.user?.role;

  if (!session) redirect("/login?role=representative");
  if (role !== "EMPLOYEE" && role !== "MANAGER" && role !== "ADMIN") redirect("/");

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-semibold mb-1">Invoice Entry</h1>
          <p className="text-sm text-muted-foreground">Select a customer, add products, and save the invoice. Totals auto-calculate.</p>
        </div>
        <nav className="flex gap-2 text-sm items-center">
          <a href="/stock" className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10">Stock</a>
          <a href="/journal" className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10">Journal</a>
          <a href="/customers" className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10">Customers</a>
          <a href="/reports" className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10">Reports</a>
          <PrintButton className="rounded-lg bg-emerald-600 text-white px-3 py-1.5" />
        </nav>
      </div>
      <div className="rounded-xl border border-black/10 dark:border-white/10 p-6 bg-white dark:bg-zinc-900">
        <InvoiceForm />
      </div>
    </div>
  );
}
