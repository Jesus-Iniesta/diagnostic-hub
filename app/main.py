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
    from sqlalchemy import text
    import datetime

    now = datetime.datetime.now()
    current_periodo = f"{now.year}{'A' if now.month <= 6 else 'B'}"
    try:
        n = await run_seed_respuestas_diagnostico(current_periodo)
        if n > 0:
            logger.info("Respuestas de diagnóstico por defecto insertadas: %d (periodo %s)", n, current_periodo)
    except Exception as e:
        logger.warning("No se pudieron insertar respuestas por defecto: %s", e)

    # Migración: pasar puntajes de escala 0-40 a 0-10
    try:
        from app.core.database import async_session
        async with async_session() as db:
            has_old = (await db.execute(
                text("SELECT 1 FROM resultado_diagnostico WHERE puntaje_algebra > 10 LIMIT 1")
            )).scalar()
            if has_old:
                await db.execute(text("""
                    UPDATE resultado_diagnostico SET
                        puntaje_algebra = CASE WHEN puntaje_algebra IS NOT NULL THEN round((puntaje_algebra / 4)::numeric, 2) ELSE NULL END,
                        puntaje_trigonometria = CASE WHEN puntaje_trigonometria IS NOT NULL THEN round((puntaje_trigonometria / 4)::numeric, 2) ELSE NULL END,
                        puntaje_geometria = CASE WHEN puntaje_geometria IS NOT NULL THEN round((puntaje_geometria / 4)::numeric, 2) ELSE NULL END,
                        puntaje_calculo = CASE WHEN puntaje_calculo IS NOT NULL THEN round((puntaje_calculo / 4)::numeric, 2) ELSE NULL END,
                        promedio_diagnostico = CASE WHEN promedio_diagnostico IS NOT NULL THEN round((promedio_diagnostico / 4)::numeric, 2) ELSE NULL END
                """))
                await db.commit()
                logger.info("Migración de puntajes de escala 0-40 a 0-10 completada")
    except Exception as e:
        logger.warning("Migración de puntajes no ejecutada: %s", e)

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