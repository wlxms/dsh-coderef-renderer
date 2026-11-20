# Build the fork client bundle from the local DSH harness dependency store.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/build.ps1 [-HarnessNodeModules <path>]
param(
  [string]$HarnessNodeModules = 'D:\dsh-mydsh\deepseek-harness\node_modules'
)

$ErrorActionPreference = 'Stop'
$pluginRoot = Split-Path -Parent $PSScriptRoot
Push-Location $pluginRoot
try {
  $pn = Join-Path $HarnessNodeModules '.pnpm'
  $esbuild = Get-ChildItem $pn -Directory -Filter '@esbuild+win32-x64@*' |
    Sort-Object Name -Descending |
    ForEach-Object { Join-Path $_.FullName 'node_modules\@esbuild\win32-x64\esbuild.exe' } |
    Where-Object { Test-Path $_ } |
    Select-Object -First 1
  if (-not $esbuild) { throw "esbuild.exe not found under $pn (install DSH dev dependencies first)" }

  $hoisted = Join-Path $pn 'node_modules'
  $env:NODE_PATH = "$HarnessNodeModules;$hoisted"

  & $esbuild 'src/entry.tsx' `
    --bundle `
    --format=cjs `
    --platform=browser `
    --target=es2020 `
    --jsx=automatic `
    '--external:react' `
    '--external:react/jsx-runtime' `
    '--external:@deepseek-ai/dsh-client-ui-primitives' `
    '--outfile=lib/impl.js' `
    '--loader:.tsx=tsx' `
    '--loader:.ts=ts' `
    --log-level=warning
  if ($LASTEXITCODE -ne 0) { throw "esbuild failed with exit code $LASTEXITCODE" }

  & 'C:\Program Files\nodejs\node.exe' 'scripts\wrap.mjs'
  if ($LASTEXITCODE -ne 0) { throw "wrap failed with exit code $LASTEXITCODE" }

  Remove-Item 'lib\impl.js' -Force -ErrorAction SilentlyContinue
  Write-Output 'build: OK (lib/client.js)'
}
finally {
  Pop-Location
}
