# Work Dashboard — First-time setup script
# Run: powershell -ExecutionPolicy Bypass -File scripts/setup.ps1

$ErrorActionPreference = "Stop"

# Refresh PATH to pick up recently installed tools
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "User") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "Machine")

# Check Node.js
try {
    $nodeVersion = & npm.cmd --version 2>$null
    Write-Host "[OK] npm $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[!] Node.js not found. Install it:" -ForegroundColor Red
    Write-Host "    winget install OpenJS.NodeJS.LTS --scope user" -ForegroundColor Yellow
    exit 1
}

# Install dependencies
Write-Host "`nInstalling npm dependencies..." -ForegroundColor Cyan
& npm.cmd install
if ($LASTEXITCODE -ne 0) { Write-Host "npm install failed" -ForegroundColor Red; exit 1 }
Write-Host "[OK] Dependencies installed" -ForegroundColor Green

# Create .env.local if missing
$envFile = Join-Path $PSScriptRoot "..\.env.local"
if (Test-Path $envFile) {
    Write-Host "[OK] .env.local already exists" -ForegroundColor Green
} else {
    $envContent = @"
VITE_SUPABASE_URL=https://ywrshvhjefrewobachke.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3cnNodmhqZWZyZXdvYmFjaGtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MjUzMTEsImV4cCI6MjA5NDAwMTMxMX0.xhVOPOu6qQsFtNPSeZUEcFSN4iCZRQ0jq2eGsvQUO-o
"@
    Set-Content -Path $envFile -Value $envContent -Encoding utf8
    Write-Host "[OK] .env.local created" -ForegroundColor Green
}

# Verify build
Write-Host "`nRunning build check..." -ForegroundColor Cyan
& npm.cmd run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Build failed — check errors above" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Setup complete ===" -ForegroundColor Green
Write-Host "Run 'npm.cmd run dev' to start the dev server (localhost:5173)" -ForegroundColor Cyan
