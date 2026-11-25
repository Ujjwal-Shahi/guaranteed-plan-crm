import type { Metadata } from "next";
import "./globals.css";
import { NavShell } from "@/components/nav/NavShell";

export const metadata: Metadata = {
  title: "NoBroker Monetisation CRM",
  description: "Internal servicing CRM — leads, SLA, refunds, manpower",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
      </head>
      <body>
        <NavShell>{children}</NavShell>
      </body>
    </html>
  );
}
