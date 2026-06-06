from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_env: str = "development"
    secret_key: str

    # Database
    database_url: str

    # Supabase
    supabase_url: str
    supabase_service_role_key: str
    supabase_jwt_secret: str = ""

    # Qdrant
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""

    # AI
    gemini_api_key: str
    groq_api_key: str

    # Embeddings
    embedding_model: str = "BAAI/bge-base-en-v1.5"
    embedding_dimension: int = 768
    embedding_batch_size: int = 32          # chunks per embedding batch
    embedding_max_retries: int = 3

    # Ingestion
    ingestion_score_threshold: float = 0.45
    keyword_weight: float = 0.3             # RRF weight for keyword results
    vector_weight: float = 0.7              # RRF weight for vector results
    rrf_k: int = 60                         # RRF constant

    # Storage
    storage_bucket: str = "studyos-documents"

    # CORS
    allowed_origins: str = "http://localhost:3000"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
