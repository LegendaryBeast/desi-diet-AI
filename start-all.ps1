<#
.SYNOPSIS
    Starts all DesiDiet services: Neo4j (Docker), Backend (FastAPI), and Frontend (Vite).

.DESCRIPTION
    This script launches the entire DesiDiet development stack in the correct order:
      1. Neo4j Docker container (waits until healthy)
      2. FastAPI backend with uvicorn (in a new terminal)
      3. Vite React frontend (in a new terminal)

    Each service runs in its own terminal window so logs are visible and isolated.

.PARAMETER SkipNeo4j
    Skip the Neo4j Docker step (useful if you run Neo4j Desktop or it's already running).

.PARAMETER SkipBackend
    Skip the backend FastAPI server.

.PARAMETER SkipFrontend
    Skip the frontend Vite dev server.

.PARAMETER Force
    Force-restart Neo4j container even if one with the same name already exists.

.EXAMPLE
    .\start-all.ps1
    .\start-all.ps1 -SkipNeo4j
    .\start-all.ps1 -Force
#>
param(
    [switch]$SkipNeo4j,
    [switch]$SkipBackend,
    [switch]$SkipFrontend,
    [switch]$Force
)

# ── Configuration ────────────────────────────────────────────────────────────
$ErrorActionPreference = "Stop"
$ProjectRoot   = $PSScriptRoot
$BackendDir    = Join-Path $ProjectRoot "backend"
$FrontendDir   = Join-Path $ProjectRoot "frontend"
$VenvActivate  = Join-Path $BackendDir "venv\Scripts\Activate.ps1"

$Neo4jContainer = "desidiet-neo4j"
$Neo4jImage     = "neo4j:5"
$Neo4jAuth      = "neo4j/khadok2025"
$Neo4jBoltPort  = 7687
$Neo4jHttpPort  = 7474

$BackendHost = "127.0.0.1"
$BackendPort = 8000

# ── Helper Functions ─────────────────────────────────────────────────────────

function Write-Banner {
    param([string]$Text, [string]$Color = "Cyan")
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor $Color
    Write-Host "  $Text" -ForegroundColor $Color
    Write-Host ("=" * 60) -ForegroundColor $Color
    Write-Host ""
}

function Write-Step {
    param([string]$Text)
    Write-Host "  → $Text" -ForegroundColor Yellow
}

function Write-OK {
    param([string]$Text)
    Write-Host "  ✓ $Text" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Text)
    Write-Host "  ⚠ $Text" -ForegroundColor DarkYellow
}

function Write-Fail {
    param([string]$Text)
    Write-Host "  ✗ $Text" -ForegroundColor Red
}

function Test-CommandExists {
    param([string]$Cmd)
    return [bool](Get-Command $Cmd -ErrorAction SilentlyContinue)
}

function Test-PortListening {
    param([int]$Port)
    try {
        $conn = New-Object System.Net.Sockets.TcpClient
        $conn.Connect("127.0.0.1", $Port)
        $conn.Close()
        return $true
    } catch {
        return $false
    }
}

function Wait-ForPort {
    param(
        [int]$Port,
        [string]$ServiceName,
        [int]$TimeoutSeconds = 60
    )
    Write-Step "Waiting for $ServiceName on port $Port..."
    $elapsed = 0
    while ($elapsed -lt $TimeoutSeconds) {
        if (Test-PortListening -Port $Port) {
            Write-OK "$ServiceName is ready on port $Port"
            return $true
        }
        Start-Sleep -Seconds 2
        $elapsed += 2
        Write-Host "    ... ($elapsed`s / $TimeoutSeconds`s)" -ForegroundColor DarkGray
    }
    Write-Fail "$ServiceName did not become ready within $TimeoutSeconds seconds"
    return $false
}

# ── Pre-flight Checks ───────────────────────────────────────────────────────

Write-Banner "DesiDiet — Development Server Launcher" "Magenta"

# Check Docker
if (-not $SkipNeo4j) {
    if (-not (Test-CommandExists "docker")) {
        Write-Fail "Docker is not installed or not in PATH. Install Docker Desktop or use -SkipNeo4j."
        exit 1
    }
    # Verify Docker daemon is running
    try {
        docker info 2>&1 | Out-Null
    } catch {
        Write-Fail "Docker daemon is not running. Start Docker Desktop first or use -SkipNeo4j."
        exit 1
    }
}

# Check Python venv
if (-not $SkipBackend) {
    if (-not (Test-Path $VenvActivate)) {
        Write-Fail "Python venv not found at: $VenvActivate"
        Write-Host "  Run this first:" -ForegroundColor Gray
        Write-Host "    cd backend; python -m venv venv; .\venv\Scripts\Activate.ps1; pip install -r requirements.txt" -ForegroundColor Gray
        exit 1
    }
}

# Check Node/npm
if (-not $SkipFrontend) {
    if (-not (Test-CommandExists "npm")) {
        Write-Fail "npm is not installed or not in PATH."
        exit 1
    }
    if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
        Write-Warn "node_modules missing in frontend/. Will run 'npm install' first."
    }
}

# ── 1. Neo4j Docker ─────────────────────────────────────────────────────────

if (-not $SkipNeo4j) {
    Write-Banner "1/3  Neo4j Database (Docker)"

    $neo4jNeedsStart = $true

    # Check if container already exists
    $existing = docker ps -a --filter "name=^${Neo4jContainer}$" --format "{{.Status}}" 2>$null

    if ($existing) {
        if ($existing -match "^Up") {
            Write-OK "Container '$Neo4jContainer' is already running."
            if ($Force) {
                Write-Step "Force flag set — restarting container..."
                docker stop $Neo4jContainer | Out-Null
                docker rm $Neo4jContainer | Out-Null
                # Will fall through to fresh start below
            } else {
                Write-Host "    Use -Force to restart it." -ForegroundColor DarkGray
                if (Test-PortListening -Port $Neo4jBoltPort) {
                    Write-OK "Neo4j Bolt port $Neo4jBoltPort is accessible."
                }
                $neo4jNeedsStart = $false
            }
        } else {
            Write-Warn "Container '$Neo4jContainer' exists but is stopped."
            if ($Force) {
                Write-Step "Force flag — removing old container..."
                docker rm $Neo4jContainer | Out-Null
                # Will fall through to fresh start below
            } else {
                Write-Step "Starting existing container..."
                docker start $Neo4jContainer | Out-Null
                $started = Wait-ForPort -Port $Neo4jBoltPort -ServiceName "Neo4j Bolt" -TimeoutSeconds 45
                if (-not $started) { exit 1 }
                $neo4jNeedsStart = $false
            }
        }
    }

    if ($neo4jNeedsStart) {
        # Run a fresh container
        Write-Step "Pulling & starting Neo4j container..."
        docker run -d `
            --name $Neo4jContainer `
            -p "${Neo4jHttpPort}:7474" `
            -p "${Neo4jBoltPort}:7687" `
            -e "NEO4J_AUTH=$Neo4jAuth" `
            $Neo4jImage

        if ($LASTEXITCODE -ne 0) {
            Write-Fail "Failed to start Neo4j container."
            exit 1
        }

        $started = Wait-ForPort -Port $Neo4jBoltPort -ServiceName "Neo4j Bolt" -TimeoutSeconds 60
        if (-not $started) { exit 1 }
    }

    Write-OK "Neo4j Browser → http://localhost:$Neo4jHttpPort"
} else {
    Write-Banner "1/3  Neo4j — SKIPPED" "DarkGray"
}

# ── 2. Backend (FastAPI) ────────────────────────────────────────────────────

if (-not $SkipBackend) {
    Write-Banner "2/3  Backend (FastAPI + Uvicorn)"

    # Check if backend port is already in use
    if (Test-PortListening -Port $BackendPort) {
        Write-Warn "Port $BackendPort is already in use. Backend may already be running."
        Write-Host "    Skipping backend launch. Kill the existing process if you want a fresh start." -ForegroundColor DarkGray
    } else {
        Write-Step "Launching backend in a new terminal..."

        $backendScript = @"
`$Host.UI.RawUI.WindowTitle = 'DesiDiet — Backend (port $BackendPort)'
Set-Location '$BackendDir'
Write-Host '━━━ DesiDiet Backend ━━━' -ForegroundColor Cyan
Write-Host ''
& '$VenvActivate'
Write-Host 'Virtual environment activated.' -ForegroundColor Green
Write-Host 'Starting uvicorn on http://${BackendHost}:${BackendPort} ...' -ForegroundColor Yellow
Write-Host ''
uvicorn app.main:app --reload --host $BackendHost --port $BackendPort
Write-Host ''
Write-Host 'Backend process exited. Press any key to close.' -ForegroundColor Red
`$null = `$Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
"@

        $encodedCmd = [Convert]::ToBase64String(
            [System.Text.Encoding]::Unicode.GetBytes($backendScript)
        )
        Start-Process powershell.exe -ArgumentList "-NoExit", "-EncodedCommand", $encodedCmd

        Write-OK "Backend terminal launched."
        Write-Step "Waiting for backend to be ready..."

        $backendReady = Wait-ForPort -Port $BackendPort -ServiceName "FastAPI Backend" -TimeoutSeconds 45
        if (-not $backendReady) {
            Write-Warn "Backend didn't respond in time. It may still be loading — check its terminal."
        } else {
            Write-OK "API Docs  → http://${BackendHost}:${BackendPort}/docs"
            Write-OK "Health    → http://${BackendHost}:${BackendPort}/health"
        }
    }
} else {
    Write-Banner "2/3  Backend — SKIPPED" "DarkGray"
}

# ── 3. Frontend (Vite) ──────────────────────────────────────────────────────

if (-not $SkipFrontend) {
    Write-Banner "3/3  Frontend (Vite React)"

    $frontendPort = 3421

    if (Test-PortListening -Port $frontendPort) {
        Write-Warn "Port $frontendPort is already in use. Frontend may already be running."
    } else {
        # Run npm install if node_modules is missing
        $nodeModules = Join-Path $FrontendDir "node_modules"
        $npmInstallStep = ""
        if (-not (Test-Path $nodeModules)) {
            $npmInstallStep = @"

Write-Host 'Installing npm dependencies...' -ForegroundColor Yellow
npm install
Write-Host ''
"@
        }

        Write-Step "Launching frontend in a new terminal..."

        $frontendScript = @"
`$Host.UI.RawUI.WindowTitle = 'DesiDiet — Frontend (port $frontendPort)'
Set-Location '$FrontendDir'
Write-Host '━━━ DesiDiet Frontend ━━━' -ForegroundColor Cyan
Write-Host ''
$npmInstallStep
Write-Host 'Starting Vite dev server...' -ForegroundColor Yellow
Write-Host ''
npm run dev
Write-Host ''
Write-Host 'Frontend process exited. Press any key to close.' -ForegroundColor Red
`$null = `$Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
"@

        $encodedCmd = [Convert]::ToBase64String(
            [System.Text.Encoding]::Unicode.GetBytes($frontendScript)
        )
        Start-Process powershell.exe -ArgumentList "-NoExit", "-EncodedCommand", $encodedCmd

        Write-OK "Frontend terminal launched."
        Write-OK "Web App   → http://localhost:$frontendPort"
    }
} else {
    Write-Banner "3/3  Frontend — SKIPPED" "DarkGray"
}

# ── Summary ──────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host ("─" * 60) -ForegroundColor DarkGray
Write-Host ""
Write-Host "  All services launched! Summary:" -ForegroundColor Green
Write-Host ""

$services = @(
    @{ Name = "Neo4j Browser";   URL = "http://localhost:$Neo4jHttpPort";          Skipped = $SkipNeo4j   }
    @{ Name = "Neo4j Bolt";      URL = "bolt://localhost:$Neo4jBoltPort";           Skipped = $SkipNeo4j   }
    @{ Name = "FastAPI Backend"; URL = "http://${BackendHost}:${BackendPort}";      Skipped = $SkipBackend }
    @{ Name = "API Docs";        URL = "http://${BackendHost}:${BackendPort}/docs"; Skipped = $SkipBackend }
    @{ Name = "Vite Frontend";   URL = "http://localhost:3421";                     Skipped = $SkipFrontend}
)

foreach ($svc in $services) {
    if ($svc.Skipped) {
        Write-Host ("    {0,-18} SKIPPED" -f $svc.Name) -ForegroundColor DarkGray
    } else {
        Write-Host ("    {0,-18} {1}" -f $svc.Name, $svc.URL) -ForegroundColor White
    }
}

Write-Host ""
Write-Host "  Tip: Close this window at any time — the service" -ForegroundColor DarkGray
Write-Host "  terminals will keep running independently." -ForegroundColor DarkGray
Write-Host ""
