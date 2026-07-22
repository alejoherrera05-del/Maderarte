$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root "index.html"
$routes = @(
  "404.html",
  "catalogo\index.html",
  "colecciones\index.html",
  "proceso\index.html",
  "historia\index.html",
  "contacto\index.html",
  "inicio\index.html"
)

foreach ($route in $routes) {
  $destination = Join-Path $root $route
  $folder = Split-Path -Parent $destination
  if (-not (Test-Path -LiteralPath $folder)) {
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
  }
  Copy-Item -LiteralPath $source -Destination $destination -Force
}

Write-Host "Rutas sincronizadas:" $routes.Count
