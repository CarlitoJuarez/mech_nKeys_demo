#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/after_mech"

PYTHON_BIN="${PYTHON_BIN:-python3}"
VENV_DIR="${VENV_DIR:-$ROOT_DIR/.venv}"

echo "[1/5] Create venv (if missing)"
if [ ! -d "$VENV_DIR" ]; then
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

echo "[2/5] Install backend deps"
python -m pip install --upgrade pip
pip install -r "$APP_DIR/requirements.txt"

echo "[3/5] Setup env"
# reviewers should copy .env.example -> .env, but don't hard-fail if they didn't
if [ -f "$APP_DIR/.env" ]; then
  echo "Using after_mech/.env"
else
  echo "No after_mech/.env found; using defaults from settings (and/or .env.example if you load it)."
fi

echo "[4/5] Migrate + seed"
cd "$APP_DIR"
python manage.py migrate --noinput
python manage.py seed

echo "[5/5] Start ASGI (Daphne)"
# You can choose a port; default 8000
PORT="${PORT:-8000}"
exec daphne -b 0.0.0.0 -p "$PORT" after_mech.asgi:application
