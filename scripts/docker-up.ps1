$ErrorActionPreference = 'Stop'

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error "Docker CLI is not installed. Please install Docker Desktop first."
}

try {
  docker info | Out-Null
} catch {
  Write-Host "Docker daemon is not running." -ForegroundColor Red
  Write-Host "If you see an error mentioning //./pipe/dockerDesktopLinuxEngine," -ForegroundColor Yellow
  Write-Host "start Docker Desktop, wait until it shows 'Engine running', then run this script again." -ForegroundColor Yellow
  exit 1
}

Write-Host "Docker is running. Starting services..." -ForegroundColor Green
docker compose up --build
