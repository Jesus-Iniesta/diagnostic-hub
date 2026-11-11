from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db

router = APIRouter()


@router.get("")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Healthcheck público (Railway lo consulta sin sesión), por eso no da detalles.

    Solo dice si el servicio y su base responden; ni versión ni datos de la base.
    """
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        raise HTTPException(status_code=503, detail="Servicio no disponible")
    return {"status": "ok"}
