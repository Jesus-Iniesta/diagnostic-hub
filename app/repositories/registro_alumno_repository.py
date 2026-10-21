from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.alumno import Alumno
from app.models.identificador_alumno import IdentificadorAlumno
from app.models.ingenieria import Ingenieria
from app.models.resultado_webassign import ResultadoWebAssign
from app.models.role import Role
from app.models.user import AuthMethod, User
from app.schemas.registro_alumno import RegistroAlumnoCreate, RegistroAlumnoUpdate
from app.models.posible_duplicado import PosibleDuplicado
from app.services.alumnos_provisionales import (
    COMPLETAR,
    YA_REGISTRADO,
    destino_registro,
)
from app.services.alumnos_provisionales_service import completar_provisional_con_padron
from app.services.normalizacion import normalizar_correo, normalizar_nombre
from app.services.unir_alumnos_service import UnionError, unir_alumnos
from app.services.upload_diagnostico_service import load_all_alumnos

USER_FIELDS = {"nombre", "apellido_paterno", "apellido_materno", "correo_personal", "correo_institucional"}

MENSAJE_YA_REGISTRADO = "Ya estás registrado. Entra con tu número de cuenta."

# Datos que un alumno provisional (creado desde los exámenes) debe tener para
# dejar de serlo cuando los completa desde su perfil.
CAMPOS_REQUERIDOS_USUARIO = ("nombre", "apellido_paterno", "apellido_materno", "correo_personal")
CAMPOS_REQUERIDOS_ALUMNO = (
    "ingenieria_id",
    "numero_cuenta",
    "periodo_ingreso",
    "tiene_internet",
    "tiene_computadora",
    "es_foraneo",
    "vulnerabilidad_economica",
)


def datos_completos(alumno: Alumno) -> bool:
    usuario = alumno.usuario
    requeridos = [
        c for c in CAMPOS_REQUERIDOS_USUARIO
        if not (c == "apellido_materno" and alumno.sin_apellido_materno)
    ]
    return all(
        (getattr(usuario, c) or "").strip() for c in requeridos
    ) and all(getattr(alumno, c) not in (None, "") for c in CAMPOS_REQUERIDOS_ALUMNO)


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

    async def datos_sugeridos(self, alumno: Alumno) -> dict:
        """Correo, cuenta, folio e ingeniería que el sistema ya conoce del alumno.

        Al alumno creado desde los exámenes la cuenta, el folio y los correos se le
        guardan como identificadores aprendidos (no en su perfil), y la ingeniería
        puede salir de WebAssign. Sirven para llenar de inicio su formulario.
        """
        rows = await self.db.execute(
            select(IdentificadorAlumno.tipo, IdentificadorAlumno.valor)
            .where(IdentificadorAlumno.alumno_id == alumno.id)
            .order_by(IdentificadorAlumno.created_at, IdentificadorAlumno.id)
        )
        por_tipo: dict[str, list[str]] = {}
        for tipo, valor in rows.all():
            por_tipo.setdefault(tipo, []).append(valor)

        correo = alumno.usuario.correo_personal
        if not correo:
            correos = [
                c for c in por_tipo.get("correo", [])
                if c != alumno.usuario.correo_institucional
            ]
            # El personal (el de WebAssign) no es el institucional de la UAEMex.
            personales = [c for c in correos if not c.endswith("uaemex.mx")]
            correo = (personales or correos or [None])[0]

        ingenieria_id = alumno.ingenieria_id
        if ingenieria_id is None:
            ingenieria_id = await self.db.scalar(
                select(Ingenieria.id)
                .join(ResultadoWebAssign, ResultadoWebAssign.carrera == Ingenieria.clave)
                .where(ResultadoWebAssign.alumno_id == alumno.id, Ingenieria.activo.is_(True))
                .order_by(ResultadoWebAssign.created_at.desc())
                .limit(1)
            )

        return {
            "correo_personal": correo,
            "numero_cuenta": alumno.numero_cuenta or next(iter(por_tipo.get("cuenta", [])), None),
            "numero_folio": alumno.numero_folio or next(iter(por_tipo.get("folio", [])), None),
            "ingenieria_id": ingenieria_id,
        }

    async def create(self, data: RegistroAlumnoCreate) -> Alumno:
        await self._get_ingenieria(data.ingenieria_id)
        correo_personal = normalizar_correo(data.correo_personal) or data.correo_personal
        correo_inst = (
            normalizar_correo(data.correo_institucional) or data.correo_institucional
            if data.correo_institucional
            else None
        )

        email_map, cuenta_map, folio_map, alumno_details = await load_all_alumnos(self.db)
        provisionales = {aid for aid, d in alumno_details.items() if d.get("provisional")}
        destino, alumno_id, otros = destino_registro(
            {
                "cuenta": cuenta_map.get(data.numero_cuenta) if data.numero_cuenta else None,
                "folio": folio_map.get(data.numero_folio) if data.numero_folio else None,
                "correo": email_map.get(correo_personal),
                "correo_institucional": email_map.get(correo_inst) if correo_inst else None,
            },
            provisionales,
        )

        if destino == YA_REGISTRADO:
            raise HTTPException(status_code=409, detail=MENSAJE_YA_REGISTRADO)

        if destino == COMPLETAR:
            # Ya presentó exámenes sin estar registrado: existe como alumno
            # provisional y se completa ese mismo registro (conserva sus
            # calificaciones). Si sus datos apuntan a varios provisionales, son
            # la misma persona registrada desde distintos exámenes: se juntan
            # todos en uno (pasan resultados e identificadores).
            for otro in otros:
                try:
                    await unir_alumnos(self.db, alumno_id, otro)
                except UnionError:
                    # No se pueden juntar solos: que lo revise el administrador.
                    self._posible_duplicado(
                        alumno_id, otro, "Sus datos de registro coinciden con los dos"
                    )
                    continue
                for mapa in (email_map, cuenta_map, folio_map):
                    for k, v in mapa.items():
                        if v == otro:
                            mapa[k] = alumno_id
            await self._completar_provisional(
                data, correo_personal, correo_inst, alumno_id,
                email_map, cuenta_map, folio_map, alumno_details,
            )
            await self.db.commit()
            alumno = await self.db.get(Alumno, alumno_id)
            return await self._fetch_or_raise(alumno.usuario_id)

        # Cuenta o folio guardados fuera de los mapas, o correo de otro usuario
        # (p. ej. un profesor).
        if await self._existe_numero_cuenta(data.numero_cuenta) or (
            data.numero_folio and await self._existe_numero_folio(data.numero_folio)
        ):
            raise HTTPException(status_code=409, detail=MENSAJE_YA_REGISTRADO)
        if await self._existe_correo(correo_personal):
            raise HTTPException(
                status_code=409, detail="El correo personal ya está registrado"
            )
        if correo_inst and await self._existe_correo(correo_inst):
            raise HTTPException(
                status_code=409, detail="El correo institucional ya está registrado"
            )

        role = await self._get_alumno_role()

        user = User(
            nombre=data.nombre,
            apellido_paterno=data.apellido_paterno,
            apellido_materno=data.apellido_materno,
            correo_personal=correo_personal,
            correo_institucional=correo_inst,
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
            sin_apellido_materno=data.sin_apellido_materno,
        )
        self.db.add(alumno)
        await self.db.flush()

        # Ningún dato coincidió, pero si el nombre es igual al de un provisional
        # puede ser la misma persona: se marca para que lo revise el
        # administrador (al alumno no se le dice nada).
        nombre = normalizar_nombre(
            " ".join(p for p in (data.nombre, data.apellido_paterno, data.apellido_materno) if p)
        )
        if nombre:
            for aid in provisionales:
                if normalizar_nombre(alumno_details[aid].get("nombre")) == nombre:
                    self._posible_duplicado(
                        alumno.id, aid, "Mismo nombre que un alumno provisional"
                    )

        await self.db.commit()

        return await self._fetch_or_raise(user.id)

    def _posible_duplicado(self, alumno_id: int, otro_id: int, motivo: str) -> None:
        self.db.add(PosibleDuplicado(alumno_id=alumno_id, otro_id=otro_id, motivo=motivo))

    async def _completar_provisional(
        self,
        data: RegistroAlumnoCreate,
        correo_personal: str,
        correo_inst: str | None,
        alumno_id: int,
        email_map: dict[str, int],
        cuenta_map: dict[str, int],
        folio_map: dict[str, int],
        alumno_details: dict[int, dict],
    ) -> None:
        """Llena el provisional con el formulario; lo del formulario manda."""
        await completar_provisional_con_padron(
            self.db,
            alumno_id,
            nombre=data.nombre,
            ap_paterno=data.apellido_paterno,
            ap_materno=data.apellido_materno,
            correo=correo_personal,
            correo_inst=correo_inst,
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
                "sin_apellido_materno": data.sin_apellido_materno,
            },
            email_map=email_map,
            cuenta_map=cuenta_map,
            folio_map=folio_map,
            alumno_details=alumno_details,
        )

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

        # Un alumno creado desde los exámenes deja de ser provisional cuando
        # completa sus datos desde su perfil.
        if alumno.es_provisional and datos_completos(alumno):
            alumno.es_provisional = False

        await self.db.commit()
        return await self._fetch_or_raise(alumno.usuario_id)