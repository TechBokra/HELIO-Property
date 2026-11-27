#!/bin/bash
# usage: rehearse.sh [stop_before_file_substring]
cd "$(git rev-parse --show-toplevel)"
P="psql -q ${PGARGS}"
$P -c "drop database if exists rh" -c "create database rh template prodbase" >/dev/null 2>&1
$P -c "alter database rh set search_path = public, extensions" >/dev/null
for f in supabase/migrations/*.sql; do
  [ -n "$1" ] && [[ "$f" == *"$1"* ]] && break
  out=$($P -d rh -v ON_ERROR_STOP=1 -f "$f" 2>&1 | grep -v "NOTICE\|^DETAIL\|^HINT\|^CONTEXT\|^PL/pgSQL\|^SQL statement" )
  if echo "$out" | grep -q ERROR; then echo "FAILED: $f"; echo "$out" | grep -A3 ERROR | head -8; exit 1; fi
  echo "ok: $(basename $f)"
done
