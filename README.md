# MetroMind AI – Document Intelligence & Decision Support System (KMRL)

**MetroMind AI** is an enterprise-grade AI knowledge platform custom-engineered for **Kochi Metro Rail Limited (KMRL)**. The platform acts as an organizational brain by ingesting, extracting, classifying, indexing, and conversing with administrative, financial, procurement, and safety documents.

---

## Key Features

1. **Document Management**: Ingest PDF, DOCX, XLSX, PPTX, CSV, TXT, PNG, and JPG.
2. **AI Summarization**: Extracts Executive, Detailed, Bullet Points, Compliance, and Action Items.
3. **OCR Processing**: Scans files and images using Tesseract OCR/EasyOCR with Malayalam and Hindi support.
4. **Hybrid Semantic Search**: Combines SQL keyword queries with ChromaDB vector search relevance scoring.
5. **RAG Chat Agent**: Chatbot with citation card links back to original document records.
6. **Interactive Knowledge Graph**: Visually traces nodes (departments, documents, organizations, people) and edges.
7. **Compliance & Auditing**: Traces user sessions (logins, uploads, deletes) and prints safety alerts.
8. **Speech Intelligence**: Synthesizes responses (TTS) and parses microphone voice queries (STT).

---

## Directory Structure

```
MetroMind-Document Summarization/
├── backend/
│   ├── app/
│   │   ├── config.py         # OS Env configs & mock toggles
│   │   ├── database.py       # SQLAlchemy engine & session pool
│   │   ├── models.py         # 18 relational SQL tables
│   │   ├── schemas.py        # Pydantic input/output serializers
│   │   ├── auth.py           # JWT generation & Role Checker dependencies
│   │   ├── main.py           # FastAPI setup, CORS, WebSockets, DB auto-seeding
│   │   ├── routers/          # Modular API endpoints (Auth, Docs, Chat, Analytics)
│   │   └── services/         # Pipeline services (OCR, Speech, Summaries, Vectors)
│   ├── requirements.txt      # Python dependencies
│   └── Dockerfile            # Python base + Tesseract binaries
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js App Router (Landing, Login, Dashboard)
│   │   ├── lib/
│   │   │   └── api.ts        # Fetch client + client-side browser simulator fallback
│   │   └── components/       # Custom glassmorphic interfaces
│   ├── package.json          # Node scripts & dependencies
│   └── Dockerfile            # Node package runner
├── docker-compose.yml        # Multi-container builder config
├── .env                      # Environment config variables
└── README.md                 # User guide (This file)
```

---

## Database Schema (18 Tables)

The SQLite/MySQL database contains normalized tables mapping operations:
- `users`, `roles`, `departments`: Authorization hierarchies and organizational units.
- `documents`, `document_versions`, `categories`, `tags`, `document_tags`: Inventory indexes.
- `ocr_results`, `summaries`, `entities`, `embeddings`: Extracted document data.
- `knowledge_graph_nodes`, `knowledge_graph_edges`: Visual relation structures.
- `audit_logs`, `notifications`, `reports`: Compliance tracking logs.
- `conversations`, `messages`: RAG chatbot history logs.

---

## Setup & Execution

### Option A: Running with Docker Compose (Recommended)
This launches both backend and frontend services inside isolated containers.

1. Ensure Docker Desktop is installed.
2. Build and run containers from the root directory:
   ```bash
   docker-compose up --build
   ```
3. Open `http://localhost:3000` in your web browser. (FastAPI docs available at `http://localhost:8000/docs`).

---

### Option B: Running Locally

#### 1. Backend Server Setup
1. Open a terminal inside the `/backend` directory.
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the server (FastAPI automatically runs startup seeds to create database and default logins):
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```

#### 2. Frontend Next.js Setup
1. Open a terminal inside the `/frontend` directory.
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Access the portal at `http://localhost:3000`.

---

## Prefilled Testing Accounts

During startup, the system seeds two default operational accounts to make evaluations immediate:

### 1. Super Administrator Portal Access
- **Email**: `admin@kmrl.co.in`
- **Password**: `adminpassword`
- **Access**: Global settings, department lists, CSV reporting, audit logs, and user directory deactivations.

### 2. Operations Officer Portal Access
- **Email**: `employee@kmrl.co.in`
- **Password**: `employeepassword`
- **Access**: Document uploads, semantic search queries, and AI chatbot conversational topics restricted to Operations.

---

## API Documentation

Key routes exposed on FastAPI backend (port `8000`):
- `POST /api/v1/auth/register`: Create user
- `POST /api/v1/auth/login`: Exchange credentials for JWT
- `POST /api/v1/documents/upload`: Multipart upload document (Triggers background task pipeline)
- `GET /api/v1/documents`: List files
- `GET /api/v1/search?q=...`: Perform hybrid query
- `POST /api/v1/chat/conversations`: Initiate dialogue thread
- `POST /api/v1/chat/conversations/{id}/messages`: Submit query to RAG pipeline
- `GET /api/v1/analytics/metrics`: Gather KPI counts
- `GET /api/v1/compliance/risk-alerts`: Fetch safety flags
- `WS /ws/notifications`: WebSocket notification stream
