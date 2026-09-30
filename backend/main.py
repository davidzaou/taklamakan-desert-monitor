"""Desert Vegetation Change Tracker - Backend API."""

import asyncio
import os
from contextlib import asynccontextmanager
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import structlog

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(
        int(os.environ.get("LOG_LEVEL", "20"))  # default INFO
    ),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from rate_limit import limiter
from middleware import RequestLoggingMiddleware
from database import init_db
from routers.analysis import router as analysis_router
from routers.features import router as features_router
from routers.dashboard_routes import router as dashboard_router
from routers.news import router as news_router
from routers.auth import router as auth_router
from routers.alerts import router as alerts_router
from routers.donations import router as donations_router
from routers.ws import router as ws_router
from routers.satellite import router as satellite_router
from websocket import heartbeat_loop

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app):
    """Initialize database and background tasks on startup."""
    await init_db()
    logger.info("database_initialized")
    heartbeat_task = asyncio.create_task(heartbeat_loop())
    yield
    heartbeat_task.cancel()


app = FastAPI(
    title="Taklimakan Desert Monitor",
    description="Interactive monitoring of vegetation, projects, and desert containment around the Taklimakan Desert",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- CORS: env-driven allowlist, default to localhost dev server ---
_cors_env = os.environ.get("CORS_ORIGINS", "http://localhost:5173")
_cors_origins = [o.strip() for o in _cors_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLoggingMiddleware)


# --- Global exception handlers ---

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        loc = " → ".join(str(l) for l in err.get("loc", []))
        errors.append({"field": loc, "message": err.get("msg", ""), "type": err.get("type", "")})
    return JSONResponse(status_code=422, content={"detail": "Validation error", "errors": errors})


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("unhandled_exception", method=request.method, path=request.url.path, error=str(exc))
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# --- Routers: /api/ (backward compat) + /api/v1/ ---
app.include_router(analysis_router)
app.include_router(features_router)
app.include_router(dashboard_router)
app.include_router(news_router)
app.include_router(auth_router)
app.include_router(alerts_router)
app.include_router(donations_router)
app.include_router(ws_router)
app.include_router(satellite_router)

# Serve built frontend in production
STATIC_DIR = Path(__file__).parent / "static"
if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
else:
    @app.get("/")
    def root():
        return {"name": "Taklimakan Desert Monitor API", "version": "1.0.0", "docs": "/docs"}
