from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import DbSession
from app.core.security import hash_password, require_permission
from app.models.grupo import Grupo
from app.models.grupo_alumno import grupo_alumno
from app.models.grupo_profesor import grupo_profesor
from app.models.materia import Materia
from app.models.role import Role
from app.models.user import AuthMethod, User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserListResponse, UserRead

router = APIRouter()

# Personal que se administra desde "Usuarios"; los alumnos están en "Alumnos".
ROLES_PERSONAL = ("administrador", "profesor", "acreditador")
LARGO_MINIMO_PASSWORD = 8


class UsuarioPersonalCreate(BaseModel):
    nombre: str = Field(min_length=1)
    apellido_paterno: str = Field(min_length=1)
    apellido_materno: str = ""
    correo_personal: str = Field(min_length=3)
    rfc: str | None = None
    rol: str
    password: str = Field(min_length=LARGO_MINIMO_PASSWORD)


class UsuarioPersonalUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1)
    apellido_paterno: str | None = Field(default=None, min_length=1)
    apellido_materno: str | None = None
    correo_personal: str | None = Field(default=None, min_length=3)
    rfc: str | None = None
    rol: str | None = None
    activo: bool | None = None
    # Si viene, se cambia la contraseña.
    password: str | None = Field(default=None, min_length=LARGO_MINIMO_PASSWORD)


class GrupoDeProfesor(BaseModel):
    id: int
    nombre: str
    materia: str
    periodo: str
    alumnos: int


class ProfesorRead(UserRead):
    grupos: list[GrupoDeProfesor]


class ProfesorListResponse(BaseModel):
    items: list[ProfesorRead]
    total: int
    limit: int
    offset: int


async def _rol(db, nombre: str) -> Role:
    if nombre not in ROLES_PERSONAL:
        raise HTTPException(status_code=400, detail="Rol no válido para personal")
    role = await db.scalar(select(Role).where(Role.name == nombre))
    if role is None:
        raise HTTPException(status_code=500, detail=f"El rol {nombre} no está configurado")
    return role


async def _validar_unicos(db, correo: str | None, rfc: str | None, excluir_id: int | None = None) -> None:
    def otro(cond):
        q = select(User.id).where(cond)
        return q.where(User.id != excluir_id) if excluir_id else q

    if correo and await db.scalar(
        otro(or_(func.lower(User.correo_personal) == correo, func.lower(User.correo_institucional) == correo))
    ):
        raise HTTPException(status_code=409, detail="Ese correo ya lo tiene otro usuario")
    if rfc and await db.scalar(otro(User.rfc == rfc)):
        raise HTTPException(status_code=409, detail="Ese RFC ya lo tiene otro usuario")


async def _leer(db, user_id: int) -> User:
    user = await db.scalar(
        select(User)
        .options(selectinload(User.role).selectinload(Role.permissions))
        .where(User.id == user_id)
        .execution_options(populate_existing=True)
    )
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@router.get(
    "",
    response_model=UserListResponse,
    summary="Listar usuarios con filtros y paginación",
)
async def list_users(
    db: DbSession,
    role_name: str | None = Query(default=None, description="Filtrar por nombre de rol"),
    busqueda: str | None = Query(default=None, description="Buscar por nombre, apellido o correo"),
    activo: bool | None = Query(default=None, description="Filtrar por estado activo"),
    solo_personal: bool = Query(default=False, description="Solo administrador, profesor y acreditador"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _current_user: User = Depends(require_permission("consultar_usuarios")),
):
    repo = UserRepository(db)
    items, total = await repo.list(
        role_name=role_name,
        busqueda=busqueda,
        activo=activo,
        limit=limit,
        offset=offset,
        roles=ROLES_PERSONAL if solo_personal else None,
    )
    return UserListResponse(
        items=[UserRead.model_validate(u) for u in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/profesores",
    response_model=ProfesorListResponse,
    summary="Listar profesores con sus grupos",
)
async def listar_profesores(
    db: DbSession,
    busqueda: str | None = Query(default=None, description="Buscar por nombre, correo o RFC"),
    activo: bool | None = Query(default=None, description="Filtrar por estado activo"),
    periodo: str | None = Query(default=None, description="Solo los grupos de este periodo"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _current_user: User = Depends(require_permission("consultar_usuarios")),
):
    items, total = await UserRepository(db).list(
        role_name="profesor", busqueda=busqueda, activo=activo, limit=limit, offset=offset
    )
    grupos: dict[int, list[GrupoDeProfesor]] = {u.id: [] for u in items}
    if items:
        query = (
            select(
                grupo_profesor.c.user_id,
                Grupo.id,
                Grupo.nombre,
                func.coalesce(Grupo.materia_nombre, Materia.nombre),
                Grupo.periodo,
                func.count(grupo_alumno.c.alumno_id.distinct()),
            )
            .join(Grupo, Grupo.id == grupo_profesor.c.grupo_id)
            .join(Materia, Materia.id == Grupo.materia_id)
            .outerjoin(grupo_alumno, grupo_alumno.c.grupo_id == Grupo.id)
            .where(grupo_profesor.c.user_id.in_(grupos), Grupo.activo)
            .group_by(grupo_profesor.c.user_id, Grupo.id, Materia.nombre)
            .order_by(Grupo.periodo.desc(), Grupo.nombre)
        )
        if periodo:
            query = query.where(Grupo.periodo == periodo)
        for user_id, gid, nombre, materia, per, alumnos in await db.execute(query):
            grupos[user_id].append(
                GrupoDeProfesor(id=gid, nombre=nombre, materia=materia, periodo=per, alumnos=alumnos)
            )
    return ProfesorListResponse(
        items=[
            ProfesorRead(**UserRead.model_validate(u).model_dump(), grupos=grupos[u.id]) for u in items
        ],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=UserRead, status_code=201, summary="Crear usuario de personal")
async def crear_usuario(
    payload: UsuarioPersonalCreate,
    db: DbSession,
    _current_user: User = Depends(require_permission("administrar_sistema")),
):
    role = await _rol(db, payload.rol)
    correo = payload.correo_personal.strip().lower()
    rfc = (payload.rfc or "").strip().upper() or None
    if role.name == "profesor" and not rfc:
        raise HTTPException(status_code=400, detail="El profesor entra con su RFC: escríbelo.")
    await _validar_unicos(db, correo, rfc)
    user = User(
        nombre=payload.nombre.strip(),
        apellido_paterno=payload.apellido_paterno.strip(),
        apellido_materno=payload.apellido_materno.strip(),
        correo_personal=correo,
        rfc=rfc,
        hashed_password=hash_password(payload.password),
        auth_method=AuthMethod.PASSWORD,
        activo=True,
        role_id=role.id,
    )
    db.add(user)
    await db.commit()
    return UserRead.model_validate(await _leer(db, user.id))


@router.patch("/{user_id}", response_model=UserRead, summary="Editar o activar/desactivar un usuario de personal")
async def editar_usuario(
    user_id: int,
    payload: UsuarioPersonalUpdate,
    db: DbSession,
    current_user: User = Depends(require_permission("administrar_sistema")),
):
    user = await _leer(db, user_id)
    if user.role.name not in ROLES_PERSONAL:
        raise HTTPException(status_code=400, detail="Los alumnos se editan desde Alumnos.")
    datos = payload.model_dump(exclude_unset=True)
    if user.id == current_user.id and (datos.get("activo") is False or (datos.get("rol") not in (None, user.role.name))):
        raise HTTPException(status_code=400, detail="No puedes desactivarte ni quitarte el rol de administrador.")

    correo = datos["correo_personal"].strip().lower() if datos.get("correo_personal") else None
    rfc = (datos["rfc"] or "").strip().upper() or None if "rfc" in datos else user.rfc
    rol = await _rol(db, datos["rol"]) if datos.get("rol") else user.role
    if rol.name == "profesor" and not rfc:
        raise HTTPException(status_code=400, detail="El profesor entra con su RFC: escríbelo.")
    await _validar_unicos(db, correo, rfc if rfc != user.rfc else None, excluir_id=user.id)

    for campo in ("nombre", "apellido_paterno", "apellido_materno"):
        if datos.get(campo) is not None:
            setattr(user, campo, datos[campo].strip())
    if correo:
        user.correo_personal = correo
    user.rfc = rfc
    user.role_id = rol.id
    if datos.get("activo") is not None:
        user.activo = datos["activo"]
    if datos.get("password"):
        user.hashed_password = hash_password(datos["password"])
        user.auth_method = AuthMethod.PASSWORD
    await db.commit()
    return UserRead.model_validate(await _leer(db, user.id))
