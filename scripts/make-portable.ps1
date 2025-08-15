# Build a portable zip (no installer) for Windows
Write-Host "[Portable] Preparing portable package..."

$ErrorActionPreference = 'Stop'

# 1) Build web assets
Write-Host "[Portable] Building renderer (Vite)..."
npm.cmd run build | Out-Host

# 2) Prepare portable folder
$portableDir = Join-Path $PSScriptRoot "..\dist-win-portable"
if (Test-Path $portableDir) { Remove-Item -Recurse -Force $portableDir }
New-Item -ItemType Directory -Path $portableDir | Out-Null

# Copy assets
Copy-Item -Recurse -Force (Join-Path $PSScriptRoot "..\dist") (Join-Path $portableDir "dist")
Copy-Item -Recurse -Force (Join-Path $PSScriptRoot "..\assets") (Join-Path $portableDir "assets")
Copy-Item -Recurse -Force (Join-Path $PSScriptRoot "..\dist-electron") (Join-Path $portableDir "dist-electron") -ErrorAction SilentlyContinue

# Launcher scripts
$runBat = @'
@echo off
setlocal
echo Running x-buzz-clip-craft (portable)...
if exist node_modules\\.bin\\electron.cmd (
  set ELECTRON=node_modules\\.bin\\electron.cmd
) else (
  where electron 1>nul 2>nul && set ELECTRON=electron
)
if not defined ELECTRON (
  echo Electron is not installed. Please run: npm i -D electron
  echo Then re-run this script.
  pause
  exit /b 1
)
"%ELECTRON%" dist-electron/main.js
endlocal
'@
Set-Content -LiteralPath (Join-Path $portableDir 'run-portable.bat') -Value $runBat -Encoding ASCII

# Zip
$zipPath = (Join-Path $PSScriptRoot "..\dist-win-portable.zip")
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
Compress-Archive -Path (Join-Path $portableDir '*') -DestinationPath $zipPath

Write-Host "[Portable] Done: $zipPath"
