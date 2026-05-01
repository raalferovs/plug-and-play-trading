"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const allModules = [
  { id: "community", label: "Community", icon: "💬", href: "/chat", proOnly: true },
  { id: "bots", label: "Bots", icon: "🤖", href: "/bots", proOnly: false },
];

export default function ModuleRail() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isPro =
    session?.user.subscriptionStatus === "active" ||
    session?.user.subscriptionStatus === "trialing" ||
    session?.user.role === "admin";

  const modules = allModules.filter((m) => !m.proOnly || isPro);

  return (
    <div className="w-20 bg-black flex flex-col items-center py-4 gap-3 border-r border-midnight-light">
      {modules.map((mod) => {
        const isActive = pathname.startsWith(mod.href);
        return (
          <Link
            key={mod.id}
            href={mod.href}
            className="flex flex-col items-center gap-1 group w-full px-1"
            title={mod.label}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all ${
                isActive
                  ? "bg-accent text-black"
                  : "bg-midnight group-hover:bg-midnight-light text-gray-400"
              }`}
            >
              {mod.icon}
            </div>
            <span
              className={`text-[10px] font-medium text-center leading-tight truncate w-full transition-colors ${
                isActive
                  ? "text-accent"
                  : "text-gray-500 group-hover:text-gray-300"
              }`}
            >
              {mod.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
