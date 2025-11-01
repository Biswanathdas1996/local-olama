# Start Metabase
$MetabasePath = Split-Path -Parent $MyInvocation.MyCommand.Path
$JarFile = Join-Path $MetabasePath "metabase.jar"

Write-Host "Starting Metabase on port 3001..." -ForegroundColor Cyan
Write-Host "Once started, access Metabase at: http://localhost:3001" -ForegroundColor Green
Write-Host ""
Write-Host "First-time setup:" -ForegroundColor Yellow
Write-Host "1. Create an admin account" -ForegroundColor Gray
Write-Host "2. Skip 'Add your data' (we'll connect databases programmatically)" -ForegroundColor Gray
Write-Host "3. Save your credentials securely" -ForegroundColor Gray
Write-Host ""

# Set environment variables
$env:MB_DB_TYPE = "h2"
$env:MB_DB_FILE = Join-Path $MetabasePath "data\metabase.db"
$env:MB_JETTY_PORT = "3001"

# Start Metabase
java -jar "$JarFile"
