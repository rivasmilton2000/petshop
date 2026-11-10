# Funciones compartidas. Solo se detienen procesos cuya identidad se comprueba.
function Test-PetshopNextProcess($Details, [string]$Root) {
    if (-not $Details -or $Details.Name -ne 'node.exe' -or -not $Details.CommandLine) { return $false }
    $command = $Details.CommandLine.Replace('/', '\').ToLowerInvariant()
    $prefix = ($Root.TrimEnd('\') + '\node_modules\').ToLowerInvariant()
    return $command.Contains($prefix) -and $command.Contains('\next\dist\')
}

function Get-DemoProcess($Record, [string]$Kind, [string]$Root, [int]$Port) {
    if (-not $Record) { return $null }
    $process = Get-Process -Id $Record.pid -ErrorAction SilentlyContinue
    if (-not $process -or $process.StartTime.ToUniversalTime().ToString('o') -ne $Record.startedUtc) { return $null }
    $details = Get-CimInstance Win32_Process -Filter "ProcessId=$($Record.pid)"
    if (-not $details -or -not $details.CommandLine) { return $null }
    if ($Kind -eq 'tunnel') {
        if ($details.Name -ne 'cloudflared.exe' -or -not $details.CommandLine.Contains("--url http://127.0.0.1:$Port")) { return $null }
    } else {
        $expected = "npm.cmd run start -- --hostname 127.0.0.1 --port $Port"
        if (-not $details.CommandLine.Contains($expected)) { return $null }
    }
    return $process
}

function Stop-DemoRecord($Record, [string]$Kind, [string]$Root, [int]$Port) {
    $process = Get-DemoProcess $Record $Kind $Root $Port
    if (-not $process) { return }
    & taskkill.exe /PID $process.Id /T /F | Out-Null
    if ($LASTEXITCODE -ne 0 -and (Get-Process -Id $process.Id -ErrorAction SilentlyContinue)) { throw "No se pudo detener el proceso $Kind." }
    $process.WaitForExit(10000) | Out-Null
    Write-Output "Proceso $Kind detenido (PID $($process.Id))."
}

function Stop-PetshopNextOnPort([int]$Port, [string]$Root) {
    $listeners = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
    foreach ($listener in $listeners) {
        $details = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
        if (-not (Test-PetshopNextProcess $details $Root)) { continue }
        # Subir solo por ancestros Next del mismo proyecto; nunca hasta VS Code,
        # PowerShell ni una terminal que pueda tener otras tareas abiertas.
        while ($details.ParentProcessId) {
            $parent = Get-CimInstance Win32_Process -Filter "ProcessId=$($details.ParentProcessId)"
            if (-not (Test-PetshopNextProcess $parent $Root)) { break }
            $details = $parent
        }
        $process = Get-Process -Id $details.ProcessId -ErrorAction SilentlyContinue
        if ($process) {
            Write-Output "Cerrando Next.js anterior de Petshop (PID $($process.Id), puerto $Port)..."
            & taskkill.exe /PID $process.Id /T /F | Out-Null
            if ($LASTEXITCODE -ne 0 -and (Get-Process -Id $process.Id -ErrorAction SilentlyContinue)) { throw 'No se pudo detener el servidor anterior de Petshop.' }
            $process.WaitForExit(10000) | Out-Null
        }
    }
}

function Select-DemoPort([int]$Preferred, [int[]]$Occupied) {
    foreach ($candidate in $Preferred..([Math]::Min(65535, $Preferred + 20))) {
        if ($Occupied -notcontains $candidate) { return $candidate }
    }
    throw "No hay un puerto disponible entre $Preferred y $([Math]::Min(65535, $Preferred + 20))."
}
