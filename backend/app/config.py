import os
from dataclasses import dataclass


@dataclass
class Settings:
    # Supabase
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


def get_settings() -> Settings:
    """Lee las variables de entorno directamente"""
    return Settings(
        supabase_url=os.environ.get("SUPABASE_URL"),
        supabase_key=os.environ.get("SUPABASE_KEY"),
        supabase_service_key=os.environ.get("SUPABASE_SERVICE_KEY"),
        secret_key=os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production"),
        environment=os.environ.get("ENVIRONMENT", "development"),
        debug=os.environ.get("DEBUG", "true").lower() == "true",
        frontend_url=os.environ.get("FRONTEND_URL", "http://localhost:3000"),
    )
