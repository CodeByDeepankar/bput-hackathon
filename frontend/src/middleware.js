import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
const isPlaceholderKey =
  !publishableKey ||
  publishableKey.includes("ZXhhbXBsZS") ||
  publishableKey.includes("example") ||
  !publishableKey.startsWith("pk_");

export default isPlaceholderKey
  ? function middleware() {
      return NextResponse.next();
    }
  : clerkMiddleware({
      publicRoutes: [
        "/",
        "/sign-in(.*)",
        "/sign-up(.*)",
        "/sso-callback(.*)",
      ],
    });

export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
