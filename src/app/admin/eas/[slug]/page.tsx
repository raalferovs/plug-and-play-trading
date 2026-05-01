"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EaUploadForm from "@/components/admin/EaUploadForm";

interface EaVersion {
  id: string;
  version: string;
  fileName: string;
  fileSize: number;
  releaseNotes: string;
  isLatest: boolean;
  releasedAt: string;
}

interface EaDetail {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  isPublished: boolean;
  versions: EaVersion[];
}

export default function AdminEaDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [ea, setEa] = useState<EaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/eas/${params.slug}`);
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setEa(data);
    setLoading(false);
  }, [params.slug]);

  useEffect(() => {
    if (session && session.user.role !== "admin") {
      router.replace("/");
      return;
    }
    if (session) load();
  }, [session, router, load]);

  const togglePublished = async () => {
    if (!ea) return;
    const res = await fetch(`/api/admin/eas/${ea.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !ea.isPublished }),
    });
    if (res.ok) load();
  };

  const setLatest = async (versionId: string) => {
    const res = await fetch(
      `/api/admin/eas/${params.slug}/versions/${versionId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setLatest: true }),
      }
    );
    if (res.ok) load();
    else setError("Konnte Latest nicht setzen");
  };

  const deleteVersion = async (versionId: string, version: string) => {
    if (!confirm(`Version ${version} wirklich löschen?`)) return;
    const res = await fetch(
      `/api/admin/eas/${params.slug}/versions/${versionId}`,
      { method: "DELETE" }
    );
    if (res.ok) load();
    else setError("Konnte Version nicht löschen");
  };

  if (!session || session.user.role !== "admin") return null;
  if (loading) return <p className="p-6 text-gray-500">Loading...</p>;
  if (!ea) return <p className="p-6 text-gray-500">EA nicht gefunden.</p>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/eas"
          className="text-sm text-gray-500 hover:text-accent transition-colors"
        >
          &larr; Alle EAs
        </Link>
      </div>

      {/* Header */}
      <div className="bg-midnight border border-midnight-light rounded-xl p-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-midnight-light flex items-center justify-center text-3xl">
          {ea.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-white">{ea.name}</h1>
            {ea.isPublished ? (
              <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded font-medium uppercase">
                Published
              </span>
            ) : (
              <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded font-medium uppercase">
                Unpublished
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-1">{ea.description}</p>
          <p className="text-xs text-gray-500 mt-2">
            slug: <span className="font-mono">{ea.slug}</span>
          </p>
        </div>
        <button
          onClick={togglePublished}
          className="bg-midnight-light text-gray-300 px-4 py-2 rounded-lg hover:bg-midnight-50 transition-colors text-sm"
        >
          {ea.isPublished ? "Unpublish" : "Publish"}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Upload form */}
      <EaUploadForm slug={params.slug} onUploaded={load} />

      {/* Versions table */}
      <div className="bg-midnight border border-midnight-light rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Versionen ({ea.versions.length})
        </h2>

        {ea.versions.length === 0 ? (
          <p className="text-sm text-gray-500">
            Noch keine Versionen. Lade die erste hoch.
          </p>
        ) : (
          <div className="space-y-3">
            {ea.versions.map((v) => (
              <div
                key={v.id}
                className="border border-midnight-light rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-white font-semibold">
                        v{v.version}
                      </span>
                      {v.isLatest && (
                        <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded font-medium uppercase">
                          Latest
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {v.fileName} · {(v.fileSize / 1024).toFixed(1)} KB ·{" "}
                      Released{" "}
                      {new Date(v.releasedAt).toLocaleDateString([], {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    {v.releaseNotes && (
                      <p className="text-sm text-gray-300 mt-2 whitespace-pre-wrap">
                        {v.releaseNotes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!v.isLatest && (
                      <button
                        onClick={() => setLatest(v.id)}
                        className="bg-midnight-light text-gray-300 px-3 py-1.5 rounded-lg hover:bg-midnight-50 transition-colors text-xs"
                      >
                        Set Latest
                      </button>
                    )}
                    <button
                      onClick={() => deleteVersion(v.id, v.version)}
                      className="bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors text-xs"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
