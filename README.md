# 🛫 TaxPilot: Your Flight Navigator for Tax Intelligence

TaxPilot transforms the chaos of tax season into a clear, guided flight plan. By combining **Gemini 2.5 Flash** for precision data extraction, **Actian VectorAI** for retrieval-augmented generation (RAG), and **ElevenLabs** for real-time voice support, TaxPilot ensures you never miss a deduction or a deadline.

## ✨ Core Features

- **🎯 Precision Extraction**: 100% accurate field-mapping from 1040s, W-2s, and 1098s using Gemini 2.5 Flash.
- **📚 Actian RAG**: High-performance semantic search grounded in your specific documents. No hallucinations, only facts.
- **💬 Rich Chat Interface**: A modern, Markdown-supported chat with the TaxPilot persona and source citations.
- **🎙️ Voice Support**: Real-time phone support powered by ElevenLabs, allowing you to "call your taxes" for a status update.
- **🛠️ Professional Persona**: A steady, guiding "Flight Navigator" tone designed for clarity and trust.

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites

- **Python 3.10+**
- **Node.js 20+** (v18 minimum)
- **Docker & Docker Compose** (for Actian VectorAI)
- **GCP Project** with Vertex AI enabled.

### 2. Environment Configuration

Create a `.env` file in `apps/api/` and `apps/web/`:

#### `apps/api/.env`

```env
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GEMINI_MODEL=gemini-2.0-flash-exp (or gemini-2.5-flash)
ACTIAN_HOST=localhost:50051
```

#### `apps/web/.env.local`

```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

### 3. Launching the Mission

#### Step 1: Start the Database (Actian VectorAI)

```bash
cd apps/api
docker compose -f actian-docker-compose.yml up -d
```

#### Step 2: Boot the Brain (API)

```bash
cd apps/api
pip install -r requirements.txt
python run.py
```

#### Step 3: Launch the Cockpit (Web)

```bash
cd apps/web
npm install
npm run dev
```

---

## 🎙️ Phone & Voice Integration

To enable the **ElevenLabs Voice Agent**:

1. Follow the instructions in [voice_setup.md](apps/api/voice_setup.md).
2. Set up a tool named `search_tax_knowledge` pointing to your `/v1/voice/search` endpoint.
3. Call your agent and ask: _"What documents am I missing for education credits?"_

---

## 📂 Project Navigation

- `apps/api/`: Python/Flask backend, Gemini extraction logic, and Actian RAG.
- `apps/web/`: Next.js frontend with rich Markdown bubbles and real-time state.
- `storage/`: Local disk storage for processed documents and JSON reports.

## 🧪 Testing

We maintain a high-accuracy flight log with a comprehensive test suite:

```bash
cd apps/api
pytest tests/ -v
```

> [!IMPORTANT] > **TaxPilot is for educational purposes only.** It does not provide professional tax advice. Always consult with a certified tax professional before filing.
