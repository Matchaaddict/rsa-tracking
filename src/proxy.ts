import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Admin routes require admin role
  if (pathname.startsWith("/admin")) {
    if (!session || session.user.role !== "admin") {
      return NextResponse.redirect(new URL("/login?type=admin", req.url));
    }
  }

  // Agency routes require agency role
  if (pathname.startsWith("/agency") && pathname !== "/agency/login" && pathname !== "/agency/first-time") {
    if (!session || session.user.role !== "agency") {
      return NextResponse.redirect(new URL("/agency/login", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/agency/:path*"],
};
