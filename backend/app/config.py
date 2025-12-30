from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    # Supabase (opcionales para permitir deploy sin DB)
    supabase_url: str | None = None
    supabase_key: str | None = None
    supabase_service_key: str | None = None

    # JWT
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Entorno
    environment: str = "development"
    debug: bool = True

    # CORS
    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Sin cache para que tome las variables de entorno en cada request
def get_settings() -> Settings:
    return Settings()
