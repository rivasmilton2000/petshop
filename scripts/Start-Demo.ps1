param([ValidateRange(1024, 65535)][int]$Port = 3000, [switch]$SkipBuild, [switch]$Restart)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$demoDirectory = Join-Path $projectRoot 'artifacts/demo'
$statePath = Join-Path $demoDirectory 'state.json'
New-Item -ItemType Directory -Path $demoDirectory -Force | Out-Null
. (Join-Path $PSScriptRoot 'Demo-Processes.ps1')

$cloudCommand = Get-Command cloudflared -ErrorAction SilentlyContinue
$cloudExecutable = if ($cloudCommand) { $cloudCommand.Source } else { Join-Path $demoDirectory 'tools/cloudflared.exe' }
if (-not (Test-Path -LiteralPath $cloudExecutable)) { throw 'Falta cloudflared. Instala Cloudflare.cloudflared o guarda el ejecutable oficial en artifacts/demo/tools/cloudflared.exe.' }

if (Test-Path -LiteralPath $statePath) {
    $previous = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    if ($previous.root -ne $projectRoot) { throw 'El registro pertenece a otro proyecto. No se detuvieron procesos.' }
    $activeServer = Get-DemoProcess $previous.server 'server' $projectRoot $previous.port
    $activeTunnel = Get-DemoProcess $previous.tunnel 'tunnel' $projectRoot $previous.port
    $healthy = $false
    if ($activeServer -and $activeTunnel -and $previous.url -match '^https://[a-z0-9-]+\.trycloudflare\.com$') {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$($previous.port)/" -TimeoutSec 5
            $healthy = $response.StatusCode -eq 200 -and $response.Content.Contains('Happy Tails Start Here')
        } catch { $healthy = $false }
    }
    if ($healthy -and -not $Restart) {
        Write-Output "La demo ya esta encendida: $($previous.url)"
        Write-Output "Puerto local: $($previous.port). Para recompilar y reiniciar usa -Restart."
        exit 0
    }
    Stop-DemoRecord $previous.tunnel 'tunnel' $projectRoot $previous.port
    Stop-DemoRecord $previous.server 'server' $projectRoot $previous.port
    Remove-Item -LiteralPath $statePath
    Write-Output 'Registro anterior limpiado; preparando una nueva demo.'
}

Stop-PetshopNextOnPort $Port $projectRoot
$occupied = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty LocalPort)
$selectedPort = Select-DemoPort $Port $occupied
if ($selectedPort -ne $Port) { Write-Output "El puerto $Port pertenece a otro servicio; se conserva y la demo usara el puerto $selectedPort." }
$Port = $selectedPort

function Save-State {
    $script:state | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $statePath -Encoding UTF8
}
function Process-Record($Process) {
    return @{ pid = $Process.Id; startedUtc = $Process.StartTime.ToUniversalTime().ToString('o') }
}
function Stop-OwnProcess($Process) {
    if ($Process -and -not $Process.HasExited) { & taskkill.exe /PID $Process.Id /T /F | Out-Null }
}
function Start-Next([string]$Origin) {
    $previousOrigin = $env:APP_URL
    try {
        $env:APP_URL = $Origin
        return Start-Process -FilePath $env:ComSpec -ArgumentList "/d /s /c `"npm.cmd run start -- --hostname 127.0.0.1 --port $Port`"" -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $demoDirectory 'next.out.log') -RedirectStandardError (Join-Path $demoDirectory 'next.err.log') -PassThru
    } finally {
        if ($null -eq $previousOrigin) { Remove-Item Env:APP_URL -ErrorAction SilentlyContinue } else { $env:APP_URL = $previousOrigin }
    }
}
function Wait-Next($Process) {
    $deadline = (Get-Date).AddSeconds(30)
    while ((Get-Date) -lt $deadline) {
        if ($Process.HasExited) { throw 'Next.js se detuvo. Revisa artifacts/demo/next.err.log.' }
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/" -TimeoutSec 3
            if ($response.StatusCode -eq 200 -and $response.Content.Contains('Happy Tails Start Here')) { return }
        } catch { Start-Sleep -Milliseconds 300 }
    }
    throw 'Next.js no respondio con la portada dentro del tiempo esperado.'
}

$server = $null
$tunnel = $null
$script:state = @{ root = $projectRoot; port = $Port; url = $null; server = $null; tunnel = $null }
try {
    if (-not $SkipBuild) {
        Push-Location $projectRoot
        try { & npm.cmd run build; if ($LASTEXITCODE -ne 0) { throw 'La compilacion fallo.' } } finally { Pop-Location }
    }
    Write-Output "Iniciando Next.js de produccion en 127.0.0.1:$Port..."
    $server = Start-Next "http://localhost:$Port"
    $script:state.server = Process-Record $server
    Save-State
    Wait-Next $server

    Write-Output 'Creando tunel HTTPS de Cloudflare exclusivamente hacia Next.js...'
    $tunnel = Start-Process -FilePath $cloudExecutable -ArgumentList "tunnel --no-autoupdate --protocol http2 --url http://127.0.0.1:$Port" -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $demoDirectory 'cloudflared.out.log') -RedirectStandardError (Join-Path $demoDirectory 'cloudflared.err.log') -PassThru
    $script:state.tunnel = Process-Record $tunnel
    Save-State
    $deadline = (Get-Date).AddSeconds(60)
    $publicURL = $null
    while ((Get-Date) -lt $deadline) {
        if ($tunnel.HasExited) { throw 'Cloudflare se detuvo. Revisa artifacts/demo/cloudflared.err.log.' }
        $log = [string](Get-Content -LiteralPath (Join-Path $demoDirectory 'cloudflared.err.log') -Raw -ErrorAction SilentlyContinue)
        $match = [regex]::Match($log, 'https://[a-z0-9-]+\.trycloudflare\.com')
        if ($match.Success -and $log.Contains('Registered tunnel connection')) { $publicURL = $match.Value; break }
        Start-Sleep -Milliseconds 500
    }
    if (-not $publicURL) { throw 'Cloudflare no confirmo el enlace y la conexion. Revisa artifacts/demo/cloudflared.err.log.' }

    # El origen HTTPS se configura solo en el proceso de la demo, sin alterar .env.local.
    Stop-OwnProcess $server
    $server.WaitForExit()
    $server = Start-Next $publicURL
    $script:state.server = Process-Record $server
    $script:state.url = $publicURL
    Save-State
    Wait-Next $server
    Write-Output "Demo iniciada: $publicURL"
    Write-Output "Puerto local: $Port. Next PID: $($server.Id). Cloudflared PID: $($tunnel.Id)."
    Write-Output 'Procesos en segundo plano; conserva el PC encendido y con Internet. Para apagar: powershell.exe -ExecutionPolicy Bypass -File scripts/Stop-Demo.ps1'
} catch {
    Stop-OwnProcess $tunnel
    Stop-OwnProcess $server
    if (Test-Path -LiteralPath $statePath) { Remove-Item -LiteralPath $statePath }
    throw
}
