from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.alumno import Alumno
from app.models.ingenieria import Ingenieria
from app.models.role import Role
from app.models.user import AuthMethod, User
from app.schemas.registro_alumno import RegistroAlumnoCreate, RegistroAlumnoUpdate
from app.services.alumnos_provisionales import COMPLETAR, destino_fila_padron
from app.services.alumnos_provisionales_service import completar_provisional_con_padron
from app.services.normalizacion import normalizar_correo
from app.services.upload_diagnostico_service import load_all_alumnos

USER_FIELDS = {"nombre", "apellido_paterno", "apellido_materno", "correo_personal", "correo_institucional"}


class RegistroAlumnoRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _existe_numero_cuenta(
        self, numero: str | None, exclude_alumno_id: int | None = None
    ) -> bool:
        if numero is None:
            return False
        stmt = select(Alumno.id).where(Alumno.numero_cuenta == numero)
        if exclude_alumno_id is not None:
            stmt = stmt.where(Alumno.id != exclude_alumno_id)
        return (await self.db.execute(stmt)).scalars().first() is not None

    async def _existe_numero_folio(
        self, folio: str | None, exclude_alumno_id: int | None = None
    ) -> bool:
        if folio is None:
            return False
        stmt = select(Alumno.id).where(Alumno.numero_folio == folio)
        if exclude_alumno_id is not None:
            stmt = stmt.where(Alumno.id != exclude_alumno_id)
        return (await self.db.execute(stmt)).scalars().first() is not None

    async def _existe_correo(
        self, correo: str, exclude_user_id: int | None = None
    ) -> bool:
        # Los correos en BD no están migrados: se normalizan igual que en _load_dup_sets.
        objetivo = normalizar_correo(correo) or correo
        stmt = select(User.correo_personal).where(User.correo_personal.isnot(None))
        if exclude_user_id is not None:
            stmt = stmt.where(User.id != exclude_user_id)
        correos = (await self.db.execute(stmt)).scalars()
        return any(normalizar_correo(c) == objetivo for c in correos)

    async def _get_ingenieria(self, ingenieria_id: int) -> Ingenieria:
        ingenieria = await self.db.get(Ingenieria, ingenieria_id)
        if not ingenieria or not ingenieria.activo:
            raise HTTPException(status_code=422, detail="Ingeniería no encontrada")
        return ingenieria

    async def _get_alumno_role(self) -> Role:
        role = await self.db.scalar(select(Role).where(Role.name == "alumno"))
        if not role:
            raise HTTPException(
                status_code=500, detail="El rol de alumno no está configurado"
            )
        return role

    async def _fetch_with_relations(self, user_id: int) -> Alumno | None:
        result = await self.db.execute(
            select(Alumno)
            .options(
                selectinload(Alumno.usuario)
                .selectinload(User.role)
                .selectinload(Role.permissions),
                selectinload(Alumno.ingenieria),
            )
            .where(Alumno.usuario_id == user_id)
        )
        return result.scalars().first()

    async def _fetch_or_raise(self, user_id: int) -> Alumno:
        alumno = await self._fetch_with_relations(user_id)
        if alumno is None:
            raise HTTPException(
                status_code=500,
                detail="No se pudo recuperar el registro de alumno",
            )
        return alumno

    async def get_by_user_id(self, user_id: int) -> Alumno | None:
        return await self._fetch_with_relations(user_id)

    async def create(self, data: RegistroAlumnoCreate) -> Alumno:
        await self._get_ingenieria(data.ingenieria_id)
        correo_personal = normalizar_correo(data.correo_personal) or data.correo_personal

        # Si ya presentó el cuestionario sin estar registrado, existe como alumno
        # provisional: se completa ese registro en vez de rechazarlo por duplicado.
        completado = await self._completar_provisional(data, correo_personal)
        if completado is not None:
            return completado

        if await self._existe_numero_cuenta(data.numero_cuenta):
            raise HTTPException(
                status_code=409, detail="El número de cuenta ya está registrado"
            )
        if data.numero_folio and await self._existe_numero_folio(data.numero_folio):
            raise HTTPException(
                status_code=409, detail="El número de folio ya está registrado"
            )
        if await self._existe_correo(correo_personal):
            raise HTTPException(
                status_code=409, detail="El correo personal ya está registrado"
            )

        role = await self._get_alumno_role()

        user = User(
            nombre=data.nombre,
            apellido_paterno=data.apellido_paterno,
            apellido_materno=data.apellido_materno,
            correo_personal=correo_personal,
            auth_method=AuthMethod.NUMERO_CUENTA,
            activo=True,
            role_id=role.id,
        )
        self.db.add(user)
        await self.db.flush()

        alumno = Alumno(
            usuario_id=user.id,
            ingenieria_id=data.ingenieria_id,
            numero_cuenta=data.numero_cuenta,
            numero_folio=data.numero_folio,
            periodo_ingreso=data.periodo_ingreso,
            promedio_bachillerato=data.promedio_bachillerato,
            indice_uaem=data.indice_uaem,
            lugar_admision=data.lugar_admision,
            escuela_procedencia=data.escuela_procedencia,
            tiene_internet=data.tiene_internet,
            tiene_computadora=data.tiene_computadora,
            es_foraneo=data.es_foraneo,
            convivencia=data.convivencia,
            vulnerabilidad_economica=data.vulnerabilidad_economica,
        )
        self.db.add(alumno)
        await self.db.commit()

        return await self._fetch_or_raise(user.id)

    async def _completar_provisional(
        self, data: RegistroAlumnoCreate, correo_personal: str
    ) -> Alumno | None:
        email_map, cuenta_map, folio_map, alumno_details = await load_all_alumnos(self.db)
        duenos = {
            mapa.get(valor)
            for mapa, valor in (
                (email_map, correo_personal),
                (cuenta_map, data.numero_cuenta),
                (folio_map, data.numero_folio),
            )
            if valor
        } - {None}
        provisionales = {aid for aid, d in alumno_details.items() if d.get("provisional")}
        destino, alumno_id = destino_fila_padron(duenos, provisionales)
        if destino != COMPLETAR:
            return None

        await completar_provisional_con_padron(
            self.db,
            alumno_id,
            nombre=data.nombre,
            ap_paterno=data.apellido_paterno,
            ap_materno=data.apellido_materno,
            correo=correo_personal,
            correo_inst=None,
            num_cuenta=data.numero_cuenta,
            num_folio=data.numero_folio,
            ingenieria_id=data.ingenieria_id,
            datos_alumno={
                "periodo_ingreso": data.periodo_ingreso,
                "promedio_bachillerato": data.promedio_bachillerato,
                "indice_uaem": data.indice_uaem,
                "lugar_admision": data.lugar_admision,
                "escuela_procedencia": data.escuela_procedencia,
                "tiene_internet": data.tiene_internet,
                "tiene_computadora": data.tiene_computadora,
                "es_foraneo": data.es_foraneo,
                "convivencia": data.convivencia,
                "vulnerabilidad_economica": data.vulnerabilidad_economica,
            },
            email_map=email_map,
            cuenta_map=cuenta_map,
            folio_map=folio_map,
            alumno_details=alumno_details,
        )
        await self.db.commit()
        alumno = await self.db.get(Alumno, alumno_id)
        return await self._fetch_or_raise(alumno.usuario_id)

    async def update(
        self, alumno: Alumno, data: RegistroAlumnoUpdate
    ) -> Alumno:
        payload = data.model_dump(exclude_unset=True)
        for campo in ("correo_personal", "correo_institucional"):
            if payload.get(campo) is not None:
                payload[campo] = normalizar_correo(payload[campo]) or payload[campo]

        if "ingenieria_id" in payload and payload["ingenieria_id"] is not None:
            await self._get_ingenieria(payload["ingenieria_id"])

        if "numero_cuenta" in payload and payload["numero_cuenta"] is not None:
            if await self._existe_numero_cuenta(
                payload["numero_cuenta"], exclude_alumno_id=alumno.id
            ):
                raise HTTPException(
                    status_code=409, detail="El número de cuenta ya está registrado"
                )
        if "numero_folio" in payload and payload["numero_folio"] is not None:
            if await self._existe_numero_folio(
                payload["numero_folio"], exclude_alumno_id=alumno.id
            ):
                raise HTTPException(
                    status_code=409, detail="El número de folio ya está registrado"
                )
        if "correo_personal" in payload and payload["correo_personal"] is not None:
            if await self._existe_correo(
                payload["correo_personal"], exclude_user_id=alumno.usuario_id
            ):
                raise HTTPException(
                    status_code=409, detail="El correo personal ya está registrado"
                )

        for key, value in payload.items():
            if key in USER_FIELDS:
                setattr(alumno.usuario, key, value)
            else:
                setattr(alumno, key, value)

        await self.db.commit()
        return await self._fetch_or_raise(alumno.usuario_id)