#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Falta DATABASE_URL. Cargalo desde .env.local o exportalo antes de ejecutar."
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/regaleria-$STAMP.dump"

mkdir -p "$BACKUP_DIR"
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-acl --file="$FILE"

echo "Backup creado: $FILE"
