# Datos demo

El arranque de producción ejecuta automáticamente:

```text
alembic upgrade head
python -m app.seeds all
```

El seed es idempotente y deja habilitados el registro de alumnos y el contacto.
También crea ingenierías, materias, grupos, permisos, respuestas de diagnóstico y
usuarios de prueba.

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