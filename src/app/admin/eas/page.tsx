"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface EaListItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  isPublished: boolean;
  _count: { versions: number };
  versions: { version: string; releasedAt: string }[];
}

export default function AdminEasPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [eas, setEas] = useState<EaListItem[] | null>(null);

  useEffect(() => {
    if (session && session.user.role !== "admin") {
      router.replace("/");
      return;
    }
    if (session) {
      fetch("/api/admin/eas")
        .then((r) => r.json())
        .then((data) => setEas(Array.isArray(data) ? data : []));
    }
  }, [session, router]);

  if (!session || session.user.role !== "admin") return null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Expert Advisors</h1>
          <p className="text-sm text-gray-400 mt-1">
            EAs verwalten und neue Versionen hochladen.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-gray-500 hover:text-accent transition-colors"
        >
          &larr; Admin
        </Link>
      </div>

      {eas === null && <p className="text-gray-500">Loading...</p>}
      {eas !== null && eas.length === 0 && (
        <p className="text-gray-500">Keine EAs vorhanden.</p>
      )}

      <div className="space-y-3">
        {eas?.map((ea) => {
          const latest = ea.versions[0];
          return (
            <Link
              key={ea.id}
              href={`/admin/eas/${ea.slug}`}
              className="block bg-midnight border border-midnight-light rounded-xl p-5 hover:border-accent/40 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-midnight-light flex items-center justify-center text-2xl">
                  {ea.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-white">
                      {ea.name}
                    </h2>
                    {!ea.isPublished && (
                      <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded font-medium uppercase">
                        Unpublished
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {ea._count.versions} Versionen
                    {latest && (
                      <>
                        {" · "}
                        Latest: {latest.version} (
                        {new Date(latest.releasedAt).toLocaleDateString()})
                      </>
                    )}
                  </p>
                </div>
                <span className="text-gray-500">→</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
