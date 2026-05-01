"use client";

import { useState } from "react";

interface Props {
  slug: string;
  onUploaded: () => void;
}

export default function EaUploadForm({ slug, onUploaded }: Props) {
  const [version, setVersion] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!version.trim() || !file) {
      setError("Version und Datei sind erforderlich.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("version", version.trim());
      formData.append("releaseNotes", releaseNotes);
      formData.append("file", file);

      const res = await fetch(`/api/admin/eas/${slug}/versions`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload fehlgeschlagen");
        setUploading(false);
        return;
      }

      // Reset
      setVersion("");
      setReleaseNotes("");
      setFile(null);
      const fileInput = document.querySelector<HTMLInputElement>(
        'input[type="file"][name="ea-file"]'
      );
      if (fileInput) fileInput.value = "";
      setUploading(false);
      onUploaded();
    } catch {
      setError("Netzwerkfehler beim Upload");
      setUploading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-midnight border border-midnight-light rounded-xl p-6 space-y-4"
    >
      <h3 className="text-lg font-semibold text-white">Neue Version hochladen</h3>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Version (z.B. 1.0.0)
        </label>
        <input
          type="text"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="1.0.0"
          className="w-full bg-midnight-dark border border-midnight-light rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-accent transition-colors"
          required
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Release Notes (optional)
        </label>
        <textarea
          value={releaseNotes}
          onChange={(e) => setReleaseNotes(e.target.value)}
          rows={3}
          placeholder="Was hat sich geändert?"
          className="w-full bg-midnight-dark border border-midnight-light rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-accent transition-colors resize-none"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Datei (.ex5)
        </label>
        <input
          type="file"
          name="ea-file"
          accept=".ex5,application/octet-stream"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-gray-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-midnight-light file:text-gray-300 hover:file:bg-midnight-50"
          required
        />
        {file && (
          <p className="text-xs text-gray-500 mt-1">
            {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={uploading}
        className="w-full bg-accent text-black font-semibold py-2.5 rounded-lg hover:bg-accent-dim transition-colors disabled:opacity-50"
      >
        {uploading ? "Lädt hoch..." : "Hochladen"}
      </button>
      <p className="text-xs text-gray-500">
        Diese Version wird automatisch als &quot;Latest&quot; markiert.
      </p>
    </form>
  );
}
