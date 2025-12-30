from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.routers import auditoria, health


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"🚀 Iniciando Auditoria Pro API en modo {settings.environment}")
    yield
    # Shutdown
    print("👋 Cerrando Auditoria Pro API")


app = FastAPI(
    title="Auditoria Pro API",
    description="API para herramientas de auditoría contable",
    version="1.0.0",
    lifespan=lifespan
)

# Configurar CORS
origins = [
    settings.frontend_url,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

if settings.debug:
    origins.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar routers
app.include_router(health.router, tags=["Health"])
app.include_router(auditoria.router, prefix="/api/auditoria", tags=["Auditoría"])


@app.get("/")
async def root():
    return {
        "app": "Auditoria Pro API",
        "version": "1.0.0",
        "status": "running"
    }
