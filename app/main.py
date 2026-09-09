from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.database import engine

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.seeds.service import run_seed_respuestas_diagnostico
    import datetime
    now = datetime.datetime.now()
    current_periodo = f"{now.year}{'A' if now.month <= 6 else 'B'}"
    try:
        n = await run_seed_respuestas_diagnostico(current_periodo)
        if n > 0:
            logger.info("Respuestas de diagnóstico por defecto insertadas: %d (periodo %s)", n, current_periodo)
    except Exception as e:
        logger.warning("No se pudieron insertar respuestas por defecto: %s", e)
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    openapi_url="/api/v1/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
    swagger_ui_parameters={"persistAuthorization": True} # solo dev
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")