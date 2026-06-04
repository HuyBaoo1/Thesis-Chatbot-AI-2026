# Common functions for PowerShell scripts
# Source this file at the top of any PS1 script that needs container runtime:
#   . "$PSScriptRoot\common.ps1"
#
# Auto-detects podman or docker. Override with env var CONTAINER_RUNTIME:
#   $env:CONTAINER_RUNTIME = "docker"   # force docker
#   $env:CONTAINER_RUNTIME = "podman"   # force podman

function Find-ContainerRuntime {
    <#
    .SYNOPSIS
    Finds the container runtime (podman or docker) available in PATH or common install locations.
    Sets $ContainerRuntime and $ContainerCompose for use in scripts.
    Priority: env var CONTAINER_RUNTIME > docker > podman (docker is more common).
    #>
    
    # 0. Override via environment variable
    if ($env:CONTAINER_RUNTIME -eq "docker") {
        $script:ContainerRuntime = "docker"
        $script:ContainerCompose = _findDockerCompose
        return "docker"
    }
    if ($env:CONTAINER_RUNTIME -eq "podman") {
        $script:ContainerRuntime = "podman"
        $script:ContainerCompose = "podman-compose"
        return "podman"
    }
    
    # 1. Check if docker is in PATH (preferred — more common)
    $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
    if ($dockerCmd) {
        $script:ContainerRuntime = "docker"
        $script:ContainerCompose = _findDockerCompose
        return "docker"
    }
    
    # 2. Check if podman is in PATH
    $podmanCmd = Get-Command podman -ErrorAction SilentlyContinue
    if ($podmanCmd) {
        $script:ContainerRuntime = "podman"
        $script:ContainerCompose = "podman-compose"
        return "podman"
    }
    
    # 3. Search common Docker install locations (Windows)
    $dockerPaths = @(
        "$env:ProgramFiles\Docker\Docker\resources\bin",
        "$env:LOCALAPPDATA\Docker\wsl\bin",
        "$env:ProgramFiles\Docker\Docker"
    )
    foreach ($p in $dockerPaths) {
        if (Test-Path "$p\docker.exe") {
            $env:PATH += ";$p"
            $script:ContainerRuntime = "docker"
            $script:ContainerCompose = _findDockerCompose
            return "docker"
        }
    }
    
    # 4. Search common Podman install locations (Windows)
    $podmanPaths = @(
        "$env:ProgramFiles\RedHat\Podman",
        "${env:ProgramFiles(x86)}\RedHat\Podman",
        "$env:LOCALAPPDATA\Programs\Podman"
    )
    foreach ($p in $podmanPaths) {
        if (Test-Path "$p\podman.exe") {
            $env:PATH += ";$p"
            $script:ContainerRuntime = "podman"
            $script:ContainerCompose = "podman-compose"
            return "podman"
        }
    }
    
    Write-Host "ERROR: Neither podman nor docker found in PATH or common install locations!" -ForegroundColor Red
    Write-Host "Set env var to override: `$env:CONTAINER_RUNTIME = 'docker'" -ForegroundColor Yellow
    Write-Host "Or install: Docker (https://docker.com) or Podman (https://podman.io)" -ForegroundColor Yellow
    return $null
}

function _findDockerCompose {
    # Docker Compose v2: "docker compose" (plugin, no hyphen)
    # Docker Compose v1: "docker-compose" (standalone binary)
    & docker compose version 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        return "docker compose"
    }
    $composeV1 = Get-Command docker-compose -ErrorAction SilentlyContinue
    if ($composeV1) {
        return "docker-compose"
    }
    return "docker compose"  # fallback to v2 syntax
}

# Write detected runtime info
function Show-RuntimeInfo {
    Write-Host "Container runtime: $ContainerRuntime" -ForegroundColor Gray
    Write-Host "Compose command:   $ContainerCompose" -ForegroundColor Gray
}

function Invoke-Container {
    param([Parameter(ValueFromRemainingArguments)]$Params)
    & $script:ContainerRuntime @Params
}

function Invoke-Compose {
    param([Parameter(ValueFromRemainingArguments)]$Params)
    # Handle "docker compose" (2 words) vs "docker-compose" / "podman-compose" (1 word)
    $parts = $script:ContainerCompose -split ' '
    if ($parts.Count -gt 1) {
        & $parts[0] $parts[1..($parts.Count-1)] @Params
    } else {
        & $script:ContainerCompose @Params
    }
}

# Use this in scripts: Invoke-Compose -f docker-compose.yml up -d
# Or for direct calls, split the compose command:
#   $cc = $ContainerCompose -split ' '
#   & $cc[0] $cc[1..($cc.Count-1)] -f docker-compose.yml up -d

# Auto-detect on source
if (-not $script:ContainerRuntime) {
    Find-ContainerRuntime | Out-Null
}
