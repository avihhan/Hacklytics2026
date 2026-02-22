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

export async function clearRagVectors() {
  const res = await fetch(`${API}/v1/rag/clear`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
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

export type ReportRecommendation = {
  title: string;
  impact: "High" | "Medium" | "Low";
  confidence: "High" | "Med" | "Low";
  explanation: string;
  required_docs: string[];
  source_docs?: string[];
};

export type ReportRecommendationsResponse = {
  summary?: string;
  recommendations: ReportRecommendation[];
  doc_count: number;
  analyzed_doc_ids: string[];
};

export async function getReportRecommendations(payload?: {
  active_doc_ids?: string[];
}): Promise<ReportRecommendationsResponse> {
  const res = await fetch(`${API}/v1/recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
  return handle(res);
}
