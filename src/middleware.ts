import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session?.user;
  const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin;

  const publicPaths = ["/summary", "/login", "/api/auth"];
  const isPublic = publicPaths.some((p) => nextUrl.pathname.startsWith(p));

  if (isPublic) return NextResponse.next();

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (nextUrl.pathname.startsWith("/admin") && !isAdmin) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if (nextUrl.pathname === "/dashboard" && isAdmin) {
    return NextResponse.redirect(new URL("/admin", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
