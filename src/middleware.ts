export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/chat", "/profile", "/admin/:path*", "/billing", "/copy-trading", "/bots", "/licenses"],
};
