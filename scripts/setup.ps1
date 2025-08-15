# Setup script for Windows
Write-Host "[Setup] Checking Node.js (npm.cmd)..."
$npmPath = $(where.exe npm.cmd 2>$null)
if (-not $npmPath) {
    Write-Host "npm.cmd not found. Please install Node.js from https://nodejs.org/ and ensure npm.cmd is in your PATH."
    exit 1
}
Write-Host "[Setup] Installing Node.js dependencies..."
& $npmPath install
Write-Host "[Setup] Checking ffmpeg..."
try {
    $ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
    if ($null -eq $ffmpeg) {
        Write-Host "ffmpeg not found. Please download from https://ffmpeg.org/download.html and add ffmpeg to your PATH."
    } else {
        Write-Host "ffmpeg found: $($ffmpeg.Path)"
    }
}
catch {
    Write-Host "Error occurred while checking ffmpeg."
}
Write-Host "[Setup] Done."
　　　　　　　　　　　　　　　　　　　　　　　　　　　　