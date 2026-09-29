#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ] && [ -z "${POSTGRES_URL:-}" ] && [ -z "${POSTGRESQL_URL:-}" ] && [ -z "${DATABASE_PUBLIC_URL:-}" ]; then
	if [ -z "${PGHOST:-}" ] || [ -z "${PGUSER:-}" ] || [ -z "${PGPASSWORD:-}" ] || [ -z "${PGDATABASE:-}" ]; then
		echo "ERROR: configura DATABASE_URL en Railway o enlaza las variables PGHOST, PGPORT, PGUSER, PGPASSWORD y PGDATABASE." >&2
		exit 1
	fi
fi

if [ -z "${JWT_SECRET:-}" ]; then
	echo "ERROR: configura JWT_SECRET en las variables del servicio de Railway." >&2
	exit 1
fi

alembic upgrade head
python -m app.seeds all

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"