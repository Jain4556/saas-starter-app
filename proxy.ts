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

  // Protect private routes
  if (!userId && !isPublicRoute(req)) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if (userId) {
    const client = await clerkClient(); // 
    const user = await client.users.getUser(userId);

    const role = user.publicMetadata.role as string | undefined;

    // admin role redirection
    if (role === "admin" && req.nextUrl.pathname === "/") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }


    // prevent non admin user to access the admin routes
    if(role !== "admin" && req.nextUrl.pathname.startsWith("/admin")){
      return NextResponse.redirect(new URL("/dashboard", req.url ))
    }

    //  redirect auth user trying to access pulbic routes
    if(isPublicRoute.includes(req.nextUrl.pathname))
      return NextResponse.redirect(
      new URL(
        role === "admin" ? "/admin/dashboard" : "/dashboard",
        req.url
      )
    )
  }
  



  return NextResponse.next();
});



export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}