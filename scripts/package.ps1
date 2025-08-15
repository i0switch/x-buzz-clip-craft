Param(
  [string]$Target = 'win' # 'win' | 'portable' | 'msi'
)

$ErrorActionPreference = 'Stop'
Write-Host "[Package] Building renderer and main..."
npm.cmd run build | Out-Host
npm.cmd run build:electron | Out-Host

switch ($Target) {
  'portable' { npm.cmd run package:portable | Out-Host }
  'msi' { npm.cmd run package:msi | Out-Host }
  default { npm.cmd run package:win | Out-Host }
}

Write-Host "[Package] Done. See 'release/' folder."

