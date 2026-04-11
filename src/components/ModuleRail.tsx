"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const modules = [
  { id: "community", label: "Community", icon: "💬", href: "/chat" },
  { id: "bots", label: "Bots", icon: "🤖", href: "/bots" },
];

export default function ModuleRail() {
  const pathname = usePathname();

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
