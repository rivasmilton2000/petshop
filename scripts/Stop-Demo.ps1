$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$statePath = Join-Path $projectRoot 'artifacts/demo/state.json'
. (Join-Path $PSScriptRoot 'Demo-Processes.ps1')
if (-not (Test-Path -LiteralPath $statePath)) { Write-Output 'No hay una demo registrada por Start-Demo.ps1.'; exit 0 }
$state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
if ($state.root -ne $projectRoot) { throw 'El registro no corresponde a este proyecto. No se detuvieron procesos.' }

foreach ($name in @('tunnel', 'server')) {
    $record = $state.$name
    if (-not $record) { continue }
    Stop-DemoRecord $record $name $projectRoot $state.port
}
Remove-Item -LiteralPath $statePath
Write-Output 'Demo apagada. PostgreSQL y Apache no se modificaron. El enlace temporal deja de funcionar.'
