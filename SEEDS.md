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
```

También se aceptan las variables PostgreSQL estándar `PGHOST`, `PGPORT`, `PGUSER`,
`PGPASSWORD` y `PGDATABASE`. `PORT` lo proporciona Railway automáticamente.

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