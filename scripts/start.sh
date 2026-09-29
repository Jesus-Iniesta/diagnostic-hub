#!/bin/sh
set -eu

alembic upgrade head
python -m app.seeds all

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"