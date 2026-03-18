#!/usr/bin/env bash
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker CLI is not installed. Please install Docker Desktop or Docker Engine first."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  cat <<'MSG'
Docker daemon is not running.

If you are on Windows and see an error mentioning:
  //./pipe/dockerDesktopLinuxEngine
then start Docker Desktop, wait until it shows "Engine running",
and run this script again.
MSG
  exit 1
fi

echo "Docker is running. Starting services..."
docker compose up --build
