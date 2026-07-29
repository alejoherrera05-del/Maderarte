$ErrorActionPreference = "Stop"

$generator = Join-Path $PSScriptRoot "build-seo-pages.mjs"
if (-not (Test-Path -LiteralPath $generator)) {
  throw "No se encontro el generador SEO: $generator"
}

node $generator
if ($LASTEXITCODE -ne 0) {
  throw "No fue posible generar las rutas SEO."
}

Write-Host "Rutas, metadatos y sitemap sincronizados."
