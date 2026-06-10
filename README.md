<div align="center">
  <img src="https://cortex-ai-web.vercel.app/favicon.ico" width="80" height="80" alt="Cortex AI Logo" />
  <h1>Cortex | Engineering OS</h1>
  <p><strong>A Production-Grade, AI-Native Workspace Built Exclusively for Engineering Students</strong></p>
  
  <p>
    <a href="https://cortex-ai-web.vercel.app" target="_blank">View Live Application</a>
    ·
    <a href="https://cortex-ai-api.onrender.com/docs" target="_blank">View API Docs</a>
  </p>
</div>

---

## 🧠 What is Cortex?

Cortex is the ultimate Engineering OS. It brings together rich LaTeX math support, infinite drawing canvases, code blocks, and advanced AI study tools into a single, cohesive interface tailored for CS, Math, and Engineering students.

Rather than juggling multiple apps for flashcards, notes, PDFs, and chatbots, Cortex unifies them. The platform leverages cutting-edge Retrieval-Augmented Generation (RAG) and generative AI to help you learn faster and retain more information.

### ✨ Key Engineering Features

- **Advanced Markdown & Math Editor**: Edit notes using `@uiw/react-md-editor` with built-in KaTeX support. Type `$$` for beautifully rendered Calculus, Physics, or ML formulas and code snippets.
- **Proactive AI Study Guides**: Upload a PDF or lecture slide, and Cortex automatically extracts the text in the background. Within 15 seconds, Gemini 1.5 Flash generates a complete Study Guide and Flashcards, saving them directly to your Notes dashboard.
- **Zero Lock-In Exporters**: Don't trap your data. Export your notes seamlessly to Markdown (`.md`), and export your AI-generated flashcards directly to a CSV that can be natively imported into Anki.
- **Multi-Modal Canvases**: Create infinite canvases (powered by `tldraw`) for handwritten circuit diagrams, architectures, and flowcharts.
- **Library & Document Chat**: Upload PDFs. Cortex vectors them via Qdrant, allowing you to seamlessly "chat" with your textbooks.

---

## 🛠️ Technology Stack

Cortex AI uses a modern, decoupled Monorepo architecture separating the highly interactive frontend from the heavy AI computing backend.

### Frontend (Next.js)
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS & shadcn/ui
- **State Management**: Zustand + TanStack Query (React Query)
- **Canvas / Drawing**: tldraw (v2)
- **Hosting**: Vercel (`https://cortex-ai-web.vercel.app`)

### Backend (FastAPI)
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL (via SQLAlchemy)
- **Vector DB**: Qdrant (for RAG & semantic search)
- **AI Models**: Google Gemini 2.5, Llama 70B (via Groq), BGE embeddings
- **Hosting**: Render (`https://cortex-ai-api.onrender.com`)

### Infrastructure
- **Authentication**: Supabase Auth (JWT validation on Backend)
- **Storage**: Supabase Storage (for document/PDF uploads)

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL 15+
- Qdrant (running locally via Docker or Qdrant Cloud)
- Supabase Project (for Auth and DB)

### 1. Clone the Repository
```bash
git clone https://github.com/Kavya-Jain-coder/Cortex-AI.git
cd Cortex-AI
```

### 2. Setup the Frontend (Web)
```bash
cd apps/web
npm install --legacy-peer-deps

# Create your local env file
cp .env.example .env.local
```

**Required `.env.local` Variables:**
```env
NEXT_PUBLIC_SUPABASE_URL="your-supabase-project-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
NEXT_PUBLIC_API_URL="http://localhost:8000"
```

Start the development server:
```bash
npm run dev
```
The frontend will be available at `http://localhost:3000`.

### 3. Setup the Backend (API)
```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Create your local env file
cp .env.example .env
```

**Required `.env` Variables:**
```env
# Supabase Configuration
SUPABASE_URL="your-supabase-project-url"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
STORAGE_BUCKET="studyos-documents"

# Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/cortex"

# AI & LLM Keys
GEMINI_API_KEY="your-gemini-key"
GROQ_API_KEY="your-groq-key"

# Qdrant Vector DB
QDRANT_URL="http://localhost:6333"
# QDRANT_API_KEY="" # Leave empty if running local docker
```

Start the FastAPI server:
```bash
uvicorn main:app --reload --port 8000
```
The API will be available at `http://localhost:8000`, with interactive docs at `http://localhost:8000/docs`.

---

## 🔐 Authentication & Security setup

Cortex uses a secure authentication flow leveraging Supabase:
1. The **Frontend** authenticates users directly with Supabase via the Next.js Supabase SSR client.
2. The **Backend** receives requests containing the user's JWT Bearer token in the `Authorization` header.
3. The FastAPI middleware calls Supabase to validate the token securely before allowing access to protected routes.

**Crucial Security Notes:**
- Never expose your `SUPABASE_SERVICE_ROLE_KEY` in the frontend code. It should only exist in the `apps/api/.env` file or Render secrets.
- Add `http://localhost:3000/auth/callback` to your Supabase Redirect URLs for local testing. Add your production Vercel URL when deploying.

---

## 📚 Project Structure

```text
Cortex-AI/
├── apps/
│   ├── web/               # Next.js 15 Frontend
│   │   ├── src/app/       # App Router pages and layouts
│   │   ├── src/components/# Reusable UI components & notes canvas
│   │   └── src/lib/       # Hooks, API clients, and utils
│   │
│   └── api/               # FastAPI Backend
│       ├── main.py        # Entry point and routing
│       ├── core/          # Security, Auth, and Config
│       ├── models/        # SQLAlchemy Database models
│       ├── services/      # AI, LLM, and Vector DB logic
│       └── routers/       # API endpoint controllers
│
└── docs/                  # Additional Documentation
```

---

<div align="center">
  <p>Built with ❤️ for learners everywhere.</p>
</div>
