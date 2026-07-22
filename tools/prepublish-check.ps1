$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

& (Join-Path $PSScriptRoot "sync-routes.ps1")

$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
  & $node.Source (Join-Path $PSScriptRoot "guardrails.js")
  exit $LASTEXITCODE
}

$bundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if (Test-Path -LiteralPath $bundledNode) {
  & $bundledNode (Join-Path $PSScriptRoot "guardrails.js")
  exit $LASTEXITCODE
}

Write-Error "No encontre Node.js. Instala Node o ejecuta este chequeo desde Codex."
