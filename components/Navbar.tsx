"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShieldAlert } from "lucide-react";
import { useState } from "react";

type NavItem = {
  href: "/map" | "/alerts" | "/subscribe";
  label: "Map" | "Alerts" | "Subscribe";
};

const NAV_ITEMS: NavItem[] = [
  { href: "/map", label: "Map" },
  { href: "/alerts", label: "Alerts" },
  { href: "/subscribe", label: "Subscribe" },
];

function isActivePath(currentPath: string, href: NavItem["href"]): boolean {
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function Navbar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-[#475569] bg-[#1e293b]">
      <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-white">
          <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          <span className="text-base font-bold tracking-wide">DisasterGuard AI</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-semibold transition-colors ${
                  active ? "text-[#3b82f6]" : "text-slate-200 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setIsMobileOpen((prev) => !prev)}
          aria-label="Toggle navigation"
          aria-expanded={isMobileOpen}
          className="rounded-md p-2 text-slate-100 transition-colors hover:bg-slate-700/60 md:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {isMobileOpen ? (
        <nav className="border-t border-[#475569] bg-[#1e293b] px-4 py-3 md:hidden" aria-label="Mobile">
          <div className="flex flex-col gap-3">
            {NAV_ITEMS.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`text-sm font-semibold transition-colors ${
                    active ? "text-[#3b82f6]" : "text-slate-200 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
