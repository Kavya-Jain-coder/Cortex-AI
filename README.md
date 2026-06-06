# StudyOS

Production-grade AI-native education platform.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 App Router, TypeScript, Tailwind, shadcn/ui |
| State | Zustand + TanStack Query |
| Canvas | tldraw |
| Backend | FastAPI, PostgreSQL, SQLAlchemy |
| Auth | Supabase Auth |
| Vector DB | Qdrant |
| AI | Gemini 2.5, Llama 70B (Groq), BGE embeddings |

## Structure

```
studyos/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # FastAPI backend
├── packages/
│   └── shared/       # Shared TypeScript types
└── docs/
```

## Getting Started

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL 15+
- Qdrant running locally or via cloud

### Frontend
```bash
cd apps/web
npm install
cp .env.example .env.local
npm run dev
```

### Backend
```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

## Authentication Setup

Cortex uses Supabase Auth in the Next.js app and validates Supabase JWTs in FastAPI.

Required Supabase values:
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `apps/web/.env.local`
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `apps/api/.env`

`SUPABASE_JWT_SECRET` is optional in this codebase. The API validates browser access tokens by calling Supabase Auth with the bearer token.

Supabase dashboard settings:
- Enable the Email provider under Authentication.
- Add `http://localhost:3000/auth/callback` and your production `/auth/callback` URL to redirect URLs.
- Add `http://localhost:3000/auth/update-password` and your production `/auth/update-password` URL to redirect URLs.
- Create the `studyos-documents` storage bucket or set `STORAGE_BUCKET` to your bucket name.

Security notes:
- Never commit `.env` or `.env.local`.
- Rotate any service-role, JWT secret, Groq, or Gemini keys that were shared publicly or committed by mistake.
- The service-role key belongs only in the API environment, never in the browser.
