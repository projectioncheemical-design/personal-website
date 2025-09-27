import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Role-based route protection
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Paths requiring authentication and roles
  const adminPaths = ["/admin", "/admin/", "/admin/users", "/admin/users/", "/stock", "/stock/", "/settings", "/settings/"];
  const invoicePaths = ["/invoice", "/invoice/"];

  const requiresAdmin = adminPaths.some((p) => pathname === p || pathname.startsWith(p));
  const requiresInvoice = invoicePaths.some((p) => pathname === p || pathname.startsWith(p));

  if (!requiresAdmin && !requiresInvoice) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = (token as any)?.role as string | undefined;

  // If not logged in
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // Authorization
  if (requiresAdmin) {
    if (role !== "ADMIN" && role !== "MANAGER") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
  if (requiresInvoice) {
    if (role !== "ADMIN" && role !== "MANAGER" && role !== "EMPLOYEE") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/stock",
    "/stock/:path*",
    "/settings",
    "/settings/:path*",
    "/invoice",
  ],
};
