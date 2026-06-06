from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.pipelines.rag.vector_store import ensure_collection
from app.routers import (
    analytics,
    assignments,
    chat,
    documents,
    ingestion,
    notes,
    search,
    study_tools,
    subjects,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_collection()
    yield


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="StudyOS API",
        version="0.1.0",
        docs_url="/docs" if not settings.is_production else None,
        redoc_url=None,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    prefix = "/api/v1"
    app.include_router(subjects.router, prefix=prefix)
    app.include_router(notes.router, prefix=prefix)
    app.include_router(documents.router, prefix=prefix)
    app.include_router(assignments.router, prefix=prefix)
    app.include_router(chat.router, prefix=prefix)
    app.include_router(search.router, prefix=prefix)
    app.include_router(study_tools.router, prefix=prefix)
    app.include_router(analytics.router, prefix=prefix)
    app.include_router(ingestion.router, prefix=prefix)

    return app


app = create_app()
