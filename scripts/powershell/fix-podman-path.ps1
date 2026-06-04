# Fix Podman PATH for PowerShell
Write-Host "Fixing Podman PATH..." -ForegroundColor Green

# Tìm Podman installation
$podmanPaths = @(
    "C:\Program Files\RedHat\Podman",
    "$env:ProgramFiles\RedHat\Podman",
    "${env:ProgramFiles(x86)}\RedHat\Podman",
    "$env:LOCALAPPDATA\Programs\Podman"
)

$podmanPath = $null
foreach ($path in $podmanPaths) {
    if (Test-Path "$path\podman.exe") {
        $podmanPath = $path
        Write-Host "Found Podman at: $podmanPath" -ForegroundColor Yellow
        break
    }
}

if (-not $podmanPath) {
    Write-Host "ERROR: Podman not found! Please install Podman Desktop first." -ForegroundColor Red
    exit 1
}

# Python Scripts path (for podman-compose) — auto-detect
$pythonScriptsPath = $null
$pythonPaths = @(
    "$env:APPDATA\Python\Python313\Scripts",
    "$env:APPDATA\Python\Python312\Scripts",
    "$env:APPDATA\Python\Python311\Scripts",
    "$env:LOCALAPPDATA\Programs\Python\Python313\Scripts",
    "$env:LOCALAPPDATA\Programs\Python\Python312\Scripts",
    "$env:LOCALAPPDATA\Programs\Python\Python311\Scripts"
)
foreach ($pp in $pythonPaths) {
    if (Test-Path $pp) {
        $pythonScriptsPath = $pp
        Write-Host "Found Python Scripts at: $pythonScriptsPath" -ForegroundColor Yellow
        break
    }
}
if (-not $pythonScriptsPath) {
    # Fallback: try to find via Python itself
    $pythonExe = Get-Command python -ErrorAction SilentlyContinue
    if ($pythonExe) {
        $pythonScriptsPath = Split-Path $pythonExe.Source
    }
}

# Add to current session
$env:Path = "$podmanPath;$pythonScriptsPath;$env:Path"
Write-Host "Added to current session PATH" -ForegroundColor Green

# Add to user PATH permanently
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$pathsToAdd = @($podmanPath, $pythonScriptsPath)
$pathUpdated = $false

foreach ($path in $pathsToAdd) {
    if ($userPath -notlike "*$path*") {
        if (-not $pathUpdated) {
            $newPath = $userPath
            $pathUpdated = $true
        }
        $newPath = "$newPath;$path"
        Write-Host "Will add to PATH: $path" -ForegroundColor Yellow
    } else {
        Write-Host "Already in PATH: $path" -ForegroundColor Green
    }
}

if ($pathUpdated) {
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "Updated permanent PATH" -ForegroundColor Green
} else {
    Write-Host "All paths already in permanent PATH" -ForegroundColor Green
}

Write-Host ""
Write-Host "Testing commands..." -ForegroundColor Cyan
try {
    $podmanVersion = & podman --version
    Write-Host "✓ podman: $podmanVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ podman: Not working" -ForegroundColor Red
}

try {
    $composeVersion = & podman-compose --version
    Write-Host "✓ podman-compose: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ podman-compose: Not working" -ForegroundColor Red
}

Write-Host ""
Write-Host "Done! You can now use:" -ForegroundColor Green
Write-Host "  podman ps"
Write-Host "  podman-compose up -d"
Write-Host ""
Write-Host "Note: Close and reopen PowerShell for permanent changes to take effect." -ForegroundColor Yellow
