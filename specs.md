# TutoNet — Especificaciones del proyecto

> Backend del sistema de análisis de exámenes diagnósticos y nivelación matemática.
> Este documento es la referencia rápida para futuras sesiones de desarrollo.

---

## 1. Contexto y objetivo

La Coordinación de Tutoría recibe información de alumnos de nuevo ingreso en varios
archivos Excel (datos de contacto, examen diagnóstico en 2 partes, WebAssign, examen
final, listas de Control Escolar). El proceso manual de relacionar alumnos, calcular su
nivel de matemáticas y generar retroalimentación consume tiempo y produce errores.

El sistema automatiza:

`Excel → procesamiento → análisis → nivel matemático → retroalimentación → consulta/reportes`

Usuarios del sistema (roles):

| Rol | Acceso |
|---|---|
| `administrador` | Carga Excel, valida, define rangos/feedback, genera PDFs, descarga final. |
| `profesor` | Consulta solo los alumnos de su grupo (entra con **RFC** + contraseña). |
| `acreditador` | Solo lectura: resultados, estadísticas por licenciatura y semestre. |
| `alumno` | Consulta sus resultados (número de cuenta o correo). |

**Requirementos pendientes de confirmar con el coordinador:** pesos de evaluaciones,
rangos de nivel, retroalimentaciones por rango, identificador común entre Excel.

---

## 2. Stack técnico

- **Backend:** Python 3.13, FastAPI 0.136, SQLAlchemy 2.0 (async) + psycopg3, Pydantic v2 + pydantic-settings.
- **Base de datos:** PostgreSQL 16 (local o Docker).
- **Migraciones:** Alembic (async).
- **Autenticación:** PyJWT (HS256) + OAuth2 password; hashing Argon2 via `pwdlib`.
- **Seeds CLI:** Typer (comandos `app.seeds`).
- **Frontend:** Vite + React + TypeScript, componentes **Mantine**, gestor **pnpm** (por seguridad). *En construcción por otro colaborador: inicialmente solo scaffold, sin UI.*
- **Docker:** `docker-compose.yml` con servicios `db`, `app`, `frontend`.

---

## 3. Estructura del repositorio

```
Integrativa/
├── app/
│   ├── api/            # Routers: v1/{health,auth}.py, deps.py, router.py
│   ├── core/           # config.py (Settings), database.py (async), security.py (JWT), base.py
│   ├── models/         # ORM: user, role, permission, role_permission, alumno, ingenieria,
│   │                   # examen, modulo, pregunta, asignacion_examen, asignacion_modulo,
│   │                   # intento_presentacion, feedback_resultado
│   ├── repositories/   # user_repository.py (async)
│   ├── schemas/        # Pydantic: *Base/*Create/*Update/*Read por modelo + auth.py
│   ├── seeds/          # CLI Typer + data/ (permissions, roles, users, ingenierias, alumnos)
│   ├── services/       # (vacío por ahora)
│   └── main.py         # FastAPI app, CORS, lifespan
├── alembic/            # Migraciones (env.py importa app.models)
├── frontend/           # Vite + React + TS + Mantine (scaffold, pnpm)
├── Dockerfile          # Backend
├── docker-compose.yml
├── requirements.txt
└── specs.md            # Este documento
```

---

## 4. Configuración y variables de entorno

`Settings` en `app/core/config.py` (pydantic-settings, `case_sensitive=False`,
`extra="ignore"`, lee `.env` en la raíz del proyecto).

| Variable | Default | Descripción |
|---|---|---|
| `APP_NAME` | `TutoNet` | Nombre de la app (título de la API). |
| `APP_VERSION` | `1.0.0` | Versión. |
| `DEBUG` | `false` | `echo` SQL del engine + flags de desarrollo. |
| `DATABASE_URL` | *(requerido)* | URL async `postgresql+psycopg://user:pass@host:port/db`. |
| `JWT_SECRET` | *(requerido)* | Clave de firma de tokens. |
| `JWT_ALGORITHM` | `HS256` | Algoritmo JWT. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Expiración del token. |
| `CORS_ORIGINS` | localhost:5173 | Orígenes CORS, separados por comas. |
| `POSTGRES_USER/PASSWORD/HOST/PORT/DB` | — | Usados por el servicio `db` de Docker (compose los consume). |

**Frontend (`frontend/.env`):**

| Variable | Default | Descripción |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000/api/v1` | Base URL de la API del backend. |

> ⚠️ `.env` está en `.gitignore`. Copiar `.env.example` → `.env`. Nunca versionar credenciales.

---

## 5. Modelos y relaciones

Todos heredan `Base` (`app/core/base.py`). Patrón: `Mapped[...] = mapped_column(...)`,
relaciones por string con `back_populates` pareados. `app/models/__init__.py` re-exporta todo.

```
Role 1─* User 1─* Alumno *─1 Ingenieria
User 1─* Examen 1─* Modulo 1─* Pregunta
Alumno *─1 AsignacionExamen *─1 Examen        (Usuario asignador: asignado_por → User)
AsignacionExamen 1─* IntentoPresentacion 1─* AsignacionModulo *─1 Modulo
IntentoPresentacion 1─1 FeedbackResultado
Role *─* Permission  (secundaria: role_permissions)
```

Notas:
- `User.auth_method`: `PASSWORD` o `NUMERO_CUENTA` (enum `AuthMethod`).
- `Alumno.numero_cuenta` (único, nullable) ≠ `Alumno.numero_folio` (único, nullable).
- `User.rfc` (único, nullable) = identificador de login del `profesor` (RFC de 10 chars sin homoclave).
- Puntajes/niveles: `IntentoPresentacion.puntaje_{total,algebra,trigonometria,geometria,calculo}`;
  `FeedbackResultado.nivel_desempeno` (int), `recomendacion`, `pdf_url`, feedback por área.

---

## 6. Autenticación

`app/core/security.py` (async): `oauth2_scheme`, `create_access_token(sub)` /
`decode_token`, `get_current_user` (carga `role.permissions` con `selectinload`),
`hash_password`/`verify_password` (Argon2), `require_role` / `require_permission`.

Reglas de login (`app/repositories/user_repository.py`):

| Rol | Identificador | Password |
|---|---|---|
| admin / acreditador | correo_personal **o** correo_institucional | sí |
| profesor | **RFC** | sí |
| alumno (auth_method `password`) | correo | sí |
| alumno (auth_method `numero_cuenta`) | número de cuenta (fallback: folio) | **no** |

Endpoints (`/api/v1/auth`):

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/token` | OAuth2 form: email/RFC + password → `Token`. Rechaza `auth_method=numero_cuenta`. |
| POST | `/numero-cuenta` | `{numero_cuenta}` → `Token`. Busca por `numero_cuenta`, ex. `numero_folio`. |
| GET | `/me` | Usuario autenticado (`UserRead`). |

Otros: `GET /api/v1/health`.

---

## 7. Schemas Pydantic

En `app/schemas/`: por modelo `*Base`, `*Create`, `*Update` (campos opcionales),
`*Read` (con `model_config = ConfigDict(from_attributes=True)`). Los `Read` anidan
objetos relacionados en un solo sentido (evita ciclos de serialización).

---

## 8. Migraciones (Alembic)

```bash
alembic revision --autogenerate -m "descripcion"   # genera revisión
alembic upgrade head                                # aplica
alembic downgrade -1                                # deshace
```

- `alembic/env.py` importa `app.models` para poblar `Base.metadata`.
- `alembic.ini` define `sqlalchemy.url` de respaldo; en runtime lo sobrescribe `settings.database_url`.

Revisiones existentes:
1. `eeeca86a00aa` — `initial_schema`
2. `39318a879b1d` — `add_rfc_numero_cuenta`

---

## 9. Seeds (Typer)

```bash
python -m app.seeds all          # permissions + roles + ingenierias + users + alumnos
python -m app.seeds permissions  # (o roles | ingenierias | users | alumnos)
```

Idempotentes (no duplican). Datos en `app/seeds/data/`.
Contenido inicial:
- 8 permisos: `administrar_sistema`, `cargar_excel`, `definir_rangos`, `generar_reporte`,
  `descargar_archivo_final`, `consultar_estadisticas`, `consultar_resultados_grupo`,
  `consultar_mis_resultados`.
- 4 roles con sus permisos.
- 5 usuarios demo (admin, profesor con RFC `PROF880101`, acreditador, alumno `numero_cuenta`,
  alumno con `password`), 1 ingeniería (`ICO`), 1 alumno (`numero_cuenta=1724300`, `folio=202500001`).

> ⚠️ Passwords demo (`user.db`/seeds) — cambiar en producción.

---

## 10. Docker

```bash
docker compose up -d --build          # db + app (8000) + frontend (5173)
python -m app.seeds all               # aplicar seeds (backend local o dentro del app container)
```

- `db`: PostgreSQL 16 alpine; credenciales desde `.env` (sin defaults/hardcode).
- `app`: FastAPI dev (`fastapi dev app/main.py --host 0.0.0.0 --port 8000`), bind-mount `.:/app`.
- `frontend`: Vite dev server (host `0.0.0.0:5173`), bind-mount, **pnpm** (`corepack enable`).
- Si el servicio `db` choca con un Postgres local en `:5432`, usar otro `POSTGRES_PORT` en `.env`.

---

## 11. Convenciones y comandos útiles

```bash
./venv/bin/ruff check app alembic     # lint
./venv/bin/python -m app.seeds all    # seeds
./venv/bin/alembic upgrade head       # migraciones
cd frontend && pnpm install && pnpm run build   # frontend (typecheck + build)
cd frontend && pnpm run dev           # dev server
```

- Convención de nombres: español (modelos, schemas, endpoints).
- CRUD de endpoints aún no implementado (solo health + auth).
- El frontend lo desarrolla otro colaborador; NO construir UI por ahora.