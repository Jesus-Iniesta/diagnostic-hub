# Datos demo

El arranque de producción ejecuta automáticamente:

```text
alembic upgrade head
python -m app.seeds all
```

El seed es idempotente y deja habilitados el registro de alumnos y el contacto.
También crea ingenierías, materias, grupos, permisos, respuestas de diagnóstico y
usuarios de prueba.

## Variables de Railway

En Railway vincula el servicio de PostgreSQL con la aplicación y configura estas
variables en el servicio de la aplicación:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<cadena aleatoria larga>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=https://<dominio-publico-del-frontend>
JWT_COOKIE_SAMESITE=none
JWT_COOKIE_SECURE=true
```

También se aceptan las variables PostgreSQL estándar `PGHOST`, `PGPORT`, `PGUSER`,
`PGPASSWORD` y `PGDATABASE`. `PORT` lo proporciona Railway automáticamente.

El nombre `Postgres` debe coincidir con el nombre del servicio de base de datos en
Railway. Si el servicio tiene otro nombre, usa la referencia que Railway inserte
desde **Add Reference**, no escribas el ejemplo literalmente.

En la configuración del servicio, deja vacío **Start Command** para usar el
`CMD` del Dockerfile, o configúralo exactamente como `sh scripts/start.sh`.
No uses solamente `uvicorn app.main:app`, porque omite las migraciones y los seeds.

## Usuarios de prueba

| Perfil | Usuario | Contraseña |
| --- | --- | --- |
| Administrador | `admin@integrativa.test` | `Admin123!` |
| Profesor | `profesor@integrativa.test` | `Profesor123!` |
| Acreditador | `acreditador@integrativa.test` | `Acreditador123!` |
| Alumno | número de cuenta `1724300` | no requiere contraseña |
| Alumno por correo | `alumno2@integrativa.test` | `Alumno2Pass!` |

Para ejecutar los seeds manualmente en un entorno con la base configurada:

```bash
python -m app.seeds all
```

Las contraseñas son únicamente para demostración. Deben cambiarse antes de usar
el sistema con información real.