export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/leads/:path*",
    "/refunds/:path*",
    "/manpower/:path*",
    "/api/leads/:path*",
    "/api/refunds/:path*",
    "/api/agents/:path*",
    "/api/sla/:path*",
  ],
};
