# Despliegue en Railway

El backend y el frontend se despliegan como dos servicios separados dentro del
mismo proyecto Railway.

## Backend

Usa la raíz del repositorio y el `Dockerfile` principal. Enlaza PostgreSQL y
configura `DATABASE_URL` y `JWT_SECRET`. El arranque ejecuta migraciones, seeds y
después Uvicorn.

## Frontend

1. Crea otro servicio desde el mismo repositorio.
2. Configura **Root Directory** como `/frontend`.
3. Selecciona el `Dockerfile` ubicado en `/frontend/Dockerfile`.
4. Configura esta variable:

```text
VITE_API_URL=https://<dominio-publico-del-backend>/api/v1
```

5. Deja vacío **Start Command** para usar el comando del Dockerfile.
6. Genera un dominio público para este servicio. Ese será el sitio que abrirás
   en el navegador.

El Dockerfile compila Vite al iniciar el contenedor y sirve `dist` con el puerto
que Railway proporciona mediante `PORT`.

## CORS del backend

En el servicio backend configura `CORS_ORIGINS` con el dominio público del
frontend:

```text
CORS_ORIGINS=https://<dominio-publico-del-frontend>
```