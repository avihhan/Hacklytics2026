const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function handle(res: Response) {
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function uploadTaxDoc(file: File) {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${API}/v1/upload`, {
    method: "POST",
    body: fd,
  });

  return handle(res);
}

export async function listDocs(): Promise<unknown[]> {
  const res = await fetch(`${API}/v1/uploads`);
  return handle(res);
}

export async function deleteDoc(docId: string) {
  const res = await fetch(`${API}/v1/upload/${docId}`, {
    method: "DELETE",
  });
  return handle(res);
}

export async function getDashboardSummary() {
  const res = await fetch(`${API}/v1/dashboard`);
  return handle(res);
}

export async function generateReport(payload: unknown) {
  const res = await fetch(`${API}/v1/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return handle(res);
}

export async function chatAsk(payload: unknown) {
  const res = await fetch(`${API}/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return handle(res);
}
