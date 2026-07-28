#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Falta DATABASE_URL. Cargalo desde .env.local o exportalo antes de ejecutar."
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/regaleria-$STAMP.dump"
SERVER_MAJOR="$(psql "$DATABASE_URL" --tuples-only --no-align --command='show server_version_num' | cut -c1-2 | sed 's/^0//')"

mkdir -p "$BACKUP_DIR"

if [[ -n "${PG_DUMP_BIN:-}" ]]; then
  DUMP_BIN="$PG_DUMP_BIN"
else
  DUMP_BIN="$(command -v pg_dump || true)"
  for candidate in /opt/homebrew/opt/libpq/bin/pg_dump /opt/homebrew/Cellar/libpq/*/bin/pg_dump; do
    [[ -x "$candidate" ]] || continue
    if [[ -z "$DUMP_BIN" ]] || [[ "$("$candidate" --version | awk '{print $3}')" > "$("$DUMP_BIN" --version | awk '{print $3}')" ]]; then
      DUMP_BIN="$candidate"
    fi
  done
fi

if [[ -z "$DUMP_BIN" || ! -x "$DUMP_BIN" ]]; then
  echo "No se encontro un pg_dump ejecutable."
  exit 1
fi

CLIENT_MAJOR="$("$DUMP_BIN" --version | awk '{print $3}' | cut -d. -f1)"
if (( CLIENT_MAJOR < SERVER_MAJOR )); then
  echo "pg_dump $CLIENT_MAJOR no es compatible con PostgreSQL $SERVER_MAJOR. Defini PG_DUMP_BIN con un cliente actualizado."
  exit 1
fi

"$DUMP_BIN" "$DATABASE_URL" --format=custom --no-owner --no-acl --file="$FILE"

echo "Backup creado: $FILE"
