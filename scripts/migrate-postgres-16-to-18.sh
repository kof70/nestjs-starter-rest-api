#!/usr/bin/env bash
set -euo pipefail

#
# Offline migration PostgreSQL 16 -> 18 using pg_upgrade.
# - Designed for Linux distros (Fedora/PGDG and Debian/Ubuntu layouts)
# - Requires BOTH major versions installed (16 and 18) + matching binaries
# - Must be run on the host (no Docker).
#
# Usage:
#   ./scripts/migrate-postgres-16-to-18.sh check
#   sudo ./scripts/migrate-postgres-16-to-18.sh run
#
# Override autodetection if needed:
#   sudo OLD_BINDIR=/usr/pgsql-16/bin NEW_BINDIR=/usr/pgsql-18/bin \
#        OLD_DATADIR=/var/lib/pgsql/16/data NEW_DATADIR=/var/lib/pgsql/18/data \
#        ./scripts/migrate-postgres-16-to-18.sh run
#

MODE="${1:-}"
if [[ "$MODE" != "check" && "$MODE" != "run" ]]; then
  echo "Usage: $0 {check|run}" >&2
  exit 2
fi

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing command: $1" >&2; exit 1; }
}

need_cmd sudo

if [[ "$(id -u)" -ne 0 && "$MODE" == "run" ]]; then
  echo "For 'run' mode, execute with sudo (root)." >&2
  exit 1
fi

as_postgres() {
  sudo -u postgres "$@"
}

pick_first_existing_dir() {
  for d in "$@"; do
    if [[ -n "${d}" && -d "${d}" ]]; then
      echo "${d}"
      return 0
    fi
  done
  return 1
}

pick_first_existing_file() {
  for f in "$@"; do
    if [[ -n "${f}" && -x "${f}" ]]; then
      echo "${f}"
      return 0
    fi
  done
  return 1
}

detect_bindir() {
  local major="$1"
  local candidates=(
    "/usr/pgsql-${major}/bin"
    "/usr/lib/postgresql/${major}/bin"
    "/usr/local/pgsql-${major}/bin"
  )
  pick_first_existing_dir "${candidates[@]}" || true
}

detect_datadir() {
  local major="$1"
  local candidates=(
    "/var/lib/pgsql/${major}/data"
    "/var/lib/postgresql/${major}/main"
    "/var/lib/postgresql/${major}/data"
  )
  pick_first_existing_dir "${candidates[@]}" || true
}

OLD_BINDIR="${OLD_BINDIR:-$(detect_bindir 16)}"
NEW_BINDIR="${NEW_BINDIR:-$(detect_bindir 18)}"
OLD_DATADIR="${OLD_DATADIR:-$(detect_datadir 16)}"
NEW_DATADIR="${NEW_DATADIR:-$(detect_datadir 18)}"

PG_UPGRADE_BIN="${PG_UPGRADE_BIN:-}"
if [[ -z "${PG_UPGRADE_BIN}" ]]; then
  PG_UPGRADE_BIN="$(pick_first_existing_file \
    "${NEW_BINDIR}/pg_upgrade" \
    "/usr/bin/pg_upgrade" \
    "/usr/local/bin/pg_upgrade" \
    || true)"
fi

INITDB_BIN="${INITDB_BIN:-}"
if [[ -z "${INITDB_BIN}" ]]; then
  INITDB_BIN="$(pick_first_existing_file \
    "${NEW_BINDIR}/initdb" \
    "/usr/bin/initdb" \
    "/usr/local/bin/initdb" \
    || true)"
fi

POSTGRES_OLD_BIN="${POSTGRES_OLD_BIN:-}"
if [[ -z "${POSTGRES_OLD_BIN}" ]]; then
  POSTGRES_OLD_BIN="$(pick_first_existing_file \
    "${OLD_BINDIR}/postgres" \
    || true)"
fi

POSTGRES_NEW_BIN="${POSTGRES_NEW_BIN:-}"
if [[ -z "${POSTGRES_NEW_BIN}" ]]; then
  POSTGRES_NEW_BIN="$(pick_first_existing_file \
    "${NEW_BINDIR}/postgres" \
    || true)"
fi

echo "Detected/Configured paths:"
echo "  OLD_BINDIR=${OLD_BINDIR:-<unset>}"
echo "  NEW_BINDIR=${NEW_BINDIR:-<unset>}"
echo "  OLD_DATADIR=${OLD_DATADIR:-<unset>}"
echo "  NEW_DATADIR=${NEW_DATADIR:-<unset>}"
echo "  PG_UPGRADE_BIN=${PG_UPGRADE_BIN:-<unset>}"
echo "  INITDB_BIN=${INITDB_BIN:-<unset>}"
echo

fail_if_empty_or_missing() {
  local name="$1"
  local val="$2"
  local kind="$3" # dir|exe
  if [[ -z "${val}" ]]; then
    echo "ERROR: ${name} is not set (autodetection failed). Set it explicitly." >&2
    exit 1
  fi
  if [[ "${kind}" == "dir" && ! -d "${val}" ]]; then
    echo "ERROR: ${name} points to missing directory: ${val}" >&2
    exit 1
  fi
  if [[ "${kind}" == "exe" && ! -x "${val}" ]]; then
    echo "ERROR: ${name} points to missing executable: ${val}" >&2
    exit 1
  fi
}

fail_if_empty_or_missing "OLD_BINDIR" "${OLD_BINDIR}" "dir"
fail_if_empty_or_missing "NEW_BINDIR" "${NEW_BINDIR}" "dir"
fail_if_empty_or_missing "OLD_DATADIR" "${OLD_DATADIR}" "dir"
fail_if_empty_or_missing "PG_UPGRADE_BIN" "${PG_UPGRADE_BIN}" "exe"
fail_if_empty_or_missing "INITDB_BIN" "${INITDB_BIN}" "exe"
fail_if_empty_or_missing "POSTGRES_OLD_BIN" "${POSTGRES_OLD_BIN}" "exe"
fail_if_empty_or_missing "POSTGRES_NEW_BIN" "${POSTGRES_NEW_BIN}" "exe"

if [[ "${OLD_DATADIR}" == "${NEW_DATADIR}" ]]; then
  echo "ERROR: OLD_DATADIR and NEW_DATADIR are the same. Refusing." >&2
  exit 1
fi

echo "Verifying versions:"
echo -n "  old postgres: " ; "${POSTGRES_OLD_BIN}" --version
echo -n "  new postgres: " ; "${POSTGRES_NEW_BIN}" --version
echo -n "  pg_upgrade : " ; "${PG_UPGRADE_BIN}" --version || true
echo

echo "Stopping PostgreSQL service (best effort)..."
sudo systemctl stop postgresql 2>/dev/null || true

if [[ "$MODE" == "check" ]]; then
  echo "Running pg_upgrade --check (does not modify data)..."
  as_postgres "${PG_UPGRADE_BIN}" \
    --old-bindir="${OLD_BINDIR}" \
    --new-bindir="${NEW_BINDIR}" \
    --old-datadir="${OLD_DATADIR}" \
    --new-datadir="${NEW_DATADIR}" \
    --check
  echo
  echo "OK: check completed. If you see no errors, rerun with: sudo $0 run"
  exit 0
fi

echo "Preparing NEW_DATADIR..."
if [[ -z "${NEW_DATADIR}" ]]; then
  echo "ERROR: NEW_DATADIR is empty." >&2
  exit 1
fi

if [[ -e "${NEW_DATADIR}" && -n "$(ls -A "${NEW_DATADIR}" 2>/dev/null || true)" ]]; then
  echo "ERROR: NEW_DATADIR exists and is not empty: ${NEW_DATADIR}" >&2
  echo "       Choose an empty directory or remove it if you are sure." >&2
  exit 1
fi

mkdir -p "${NEW_DATADIR}"
chown -R postgres:postgres "${NEW_DATADIR}"
chmod 700 "${NEW_DATADIR}"

echo "Initializing new PostgreSQL 18 cluster (initdb)..."
as_postgres "${INITDB_BIN}" -D "${NEW_DATADIR}"

echo "Running pg_upgrade (this migrates data in-place)..."
as_postgres "${PG_UPGRADE_BIN}" \
  --old-bindir="${OLD_BINDIR}" \
  --new-bindir="${NEW_BINDIR}" \
  --old-datadir="${OLD_DATADIR}" \
  --new-datadir="${NEW_DATADIR}"

echo
echo "Starting PostgreSQL service..."
sudo systemctl start postgresql

echo "Post-migration analyze (recommended)..."
if [[ -x "${NEW_BINDIR}/vacuumdb" ]]; then
  as_postgres "${NEW_BINDIR}/vacuumdb" --all --analyze-in-stages
else
  echo "Note: vacuumdb not found at ${NEW_BINDIR}/vacuumdb; you can run it manually later."
fi

echo
echo "Migration completed."
echo "Next: verify with: sudo -u postgres psql -c \"\\\\l\""
