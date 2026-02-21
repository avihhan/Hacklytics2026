"use client";

import { useState } from "react";
import { uploadTaxDoc } from "@/lib/api";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const [result, setResult] = useState<any>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setStatus("Uploading...");
    setResult(null);

    try {
      const data = await uploadTaxDoc(file);
      setResult(data);
      setStatus("Upload successful ✅");
      // Later: store doc_id in localStorage and route to /report
    } catch (err: any) {
      setStatus(`Upload failed: ${err?.message ?? "Unknown error"}`);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Upload Tax Document</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full"
        />

        <button
          type="submit"
          disabled={!file}
          className="rounded-lg border px-4 py-2 disabled:opacity-50"
        >
          Upload
        </button>
      </form>

      {status && <p className="text-sm">{status}</p>}

      {result && (
        <pre className="text-xs rounded-lg border p-3 overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}