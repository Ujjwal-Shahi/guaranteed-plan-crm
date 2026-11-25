"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/refunds", label: "Refunds" },
  { href: "/manpower", label: "Manpower" },
];

const NO_SIDEBAR = ["/auth/"];

export function NavShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (NO_SIDEBAR.some((p) => pathname.startsWith(p))) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-52 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-200">
          <span className="text-sm font-semibold text-[#3D4FD6]">NoBroker CRM</span>
        </div>
        <nav className="flex-1 py-3 space-y-0.5">
          {NAV.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`block px-4 py-2 text-sm rounded-md mx-2 ${
                  active
                    ? "bg-indigo-50 text-[#3D4FD6] font-medium"
                    : "text-gray-700 hover:bg-gray-50 hover:text-[#3D4FD6]"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
