"""FastAPI application — NYC Taxi data API."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import events, predictions, stats

app = FastAPI(
    title="NYC Taxi API",
    description="REST API para consulta de eventos, estatísticas e predições do pipeline NYC Taxi.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(events.router, prefix="/api", tags=["events"])
app.include_router(stats.router, prefix="/api", tags=["stats"])
app.include_router(predictions.router, prefix="/api", tags=["predictions"])


@app.get("/health", tags=["infra"])
def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok"}
