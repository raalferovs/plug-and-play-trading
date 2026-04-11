"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export default function Navbar() {
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!session) return null;

  const initials = session.user.name
    ? session.user.name.charAt(0).toUpperCase()
    : "?";

  return (
    <nav className="bg-midnight border-b border-midnight-light px-4 py-3 flex items-center justify-between">
      <Link href="/chat" className="flex items-center gap-2">
        <span className="text-accent font-poppins font-semibold text-xl">
          Plug & Play
        </span>
      </Link>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          {session.user.avatarUrl ? (
            <img
              src={session.user.avatarUrl}
              alt={session.user.name}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-black font-semibold text-sm">
              {initials}
            </div>
          )}
          <span className="text-sm text-gray-300 hidden sm:block">
            {session.user.name}
          </span>
          {session.user.subscriptionStatus === "active" && (
            <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded font-medium hidden sm:block">
              PRO
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${
              dropdownOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-midnight border border-midnight-light rounded-lg shadow-lg py-1 z-50">
            <Link
              href="/profile"
              className="block px-4 py-2 text-sm text-gray-300 hover:bg-midnight-light hover:text-white transition-colors"
              onClick={() => setDropdownOpen(false)}
            >
              Profile
            </Link>
            <Link
              href="/billing"
              className="block px-4 py-2 text-sm text-gray-300 hover:bg-midnight-light hover:text-white transition-colors"
              onClick={() => setDropdownOpen(false)}
            >
              Billing
            </Link>
            {session.user.role === "admin" && (
              <Link
                href="/admin"
                className="block px-4 py-2 text-sm text-gray-300 hover:bg-midnight-light hover:text-white transition-colors"
                onClick={() => setDropdownOpen(false)}
              >
                Admin Panel
              </Link>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-midnight-light hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
