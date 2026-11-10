$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Demo-Processes.ps1')
$root = Split-Path -Parent $PSScriptRoot
function Assert-Demo([bool]$Condition, [string]$Message) { if (-not $Condition) { throw $Message } }

$own = [pscustomobject]@{ Name='node.exe'; CommandLine="node `"$root\node_modules\next\dist\server\lib\start-server.js`"" }
$foreign = [pscustomobject]@{ Name='node.exe'; CommandLine='node C:\other\node_modules\next\dist\server\lib\start-server.js' }
Assert-Demo (Test-PetshopNextProcess $own $root) 'No se reconoce Next del proyecto.'
Assert-Demo (-not (Test-PetshopNextProcess $foreign $root)) 'Se acepto un proceso de otro proyecto.'
Assert-Demo ((Select-DemoPort 3000 @(3000,3001)) -eq 3002) 'No se eligio un puerto alternativo.'
Assert-Demo ((Select-DemoPort 3000 @(5432,80)) -eq 3000) 'No se conservo un puerto libre.'
$self = Get-Process -Id $PID
$stale = @{ pid=$PID; startedUtc=[DateTime]::MinValue.ToString('o') }
Assert-Demo ($null -eq (Get-DemoProcess $stale 'server' $root 3000)) 'Se acepto un PID con otra fecha.'
$unrelated = @{ pid=$PID; startedUtc=$self.StartTime.ToUniversalTime().ToString('o') }
Assert-Demo ($null -eq (Get-DemoProcess $unrelated 'server' $root 3000)) 'Se acepto un comando ajeno a la demo.'
foreach ($file in @('Start-Demo.ps1','Stop-Demo.ps1','Demo-Processes.ps1')) {
    $parseErrors = $null
    [System.Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot $file),[ref]$null,[ref]$parseErrors) | Out-Null
    Assert-Demo ($parseErrors.Count -eq 0) "Sintaxis invalida en $file."
}
$statePath = Join-Path $root 'artifacts/demo/state.json'
if (Test-Path -LiteralPath $statePath) {
    $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    Assert-Demo ($null -ne (Get-DemoProcess $state.server 'server' $root $state.port)) 'Servidor registrado no reconocido.'
    Assert-Demo ($null -ne (Get-DemoProcess $state.tunnel 'tunnel' $root $state.port)) 'Tunel registrado no reconocido.'
}
Write-Output 'Pruebas OK: procesos propios/ajenos, PID reutilizado, puertos y sintaxis de los scripts.'
