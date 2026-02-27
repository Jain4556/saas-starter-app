import { clerkMiddleware, createRouteMatcher, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhook/register",
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  if (!userId && !isPublicRoute(req)) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if (userId) {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = user.publicMetadata.role as string | undefined;

    // Admin redirect from home
    if (role === "admin" && req.nextUrl.pathname === "/") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    // Prevent non-admin from accessing admin routes
    if (role !== "admin" && req.nextUrl.pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/", req.url)); // changed
    }

    // Redirect logged-in users away from public auth pages only
    if (
      req.nextUrl.pathname.startsWith("/sign-in") ||
      req.nextUrl.pathname.startsWith("/sign-up")
    ) {
      return NextResponse.redirect(
        new URL(role === "admin" ? "/admin" : "/", req.url)
      );
    }
  }

  return NextResponse.next();
});