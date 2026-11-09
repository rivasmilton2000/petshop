$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$statePath = Join-Path $projectRoot 'artifacts/demo/state.json'
if (-not (Test-Path -LiteralPath $statePath)) { Write-Output 'No hay una demo registrada por Start-Demo.ps1.'; exit 0 }
$state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
if ($state.root -ne $projectRoot) { throw 'El registro no corresponde a este proyecto. No se detuvieron procesos.' }

foreach ($name in @('tunnel', 'server')) {
    $record = $state.$name
    if (-not $record) { continue }
    $process = Get-Process -Id $record.pid -ErrorAction SilentlyContinue
    if (-not $process) { continue }
    if ($process.StartTime.ToUniversalTime().ToString('o') -ne $record.startedUtc) { throw "El PID $($record.pid) fue reutilizado; no se detuvo." }
    $details = Get-CimInstance Win32_Process -Filter "ProcessId=$($record.pid)"
    $expected = if ($name -eq 'tunnel') { 'cloudflared' } else { "npm.cmd run start -- --hostname 127.0.0.1 --port $($state.port)" }
    if (-not $details.CommandLine.Contains($expected)) { throw 'El proceso no coincide con la demo. No se detuvo.' }
    & taskkill.exe /PID $record.pid /T /F | Out-Null
    Write-Output "Proceso $name detenido (PID $($record.pid))."
}
Remove-Item -LiteralPath $statePath
Write-Output 'Demo apagada. PostgreSQL y Apache no se modificaron. El enlace temporal deja de funcionar.'
