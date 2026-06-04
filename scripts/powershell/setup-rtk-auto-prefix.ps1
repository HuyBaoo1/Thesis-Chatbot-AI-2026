# Setup RTK auto-prefix wrappers for common terminal commands
Write-Host "Setting up RTK auto-prefix in PowerShell profile..." -ForegroundColor Cyan

$profilePath = $PROFILE
$profileDir = Split-Path -Parent $profilePath
if (!(Test-Path -Path $profileDir)) {
    New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
}
if (!(Test-Path -Path $profilePath)) {
    New-Item -ItemType File -Path $profilePath -Force | Out-Null
    Write-Host "Created PowerShell profile at: $profilePath" -ForegroundColor Green
}

$beginMarker = "# >>> RTK AUTO PREFIX START >>>"
$endMarker = "# <<< RTK AUTO PREFIX END <<<"

$rtkBlock = @"
$beginMarker
# Added by scripts/powershell/setup-rtk-auto-prefix.ps1
# Auto-prefix common commands through RTK for compact output.
if (Get-Command rtk -ErrorAction SilentlyContinue) {
    function global:_Invoke-RtkOrOriginal {
        param(
            [Parameter(Mandatory = `$true)][string]`$CommandName,
            [Parameter(ValueFromRemainingArguments = `$true)]`$Args
        )

        if (`$Args -and `$Args[0] -eq "--") {
            `$Args = `$Args[1..(`$Args.Count - 1)]
        }

        # Avoid self-recursion and keep explicit rtk usage unchanged.
        if (`$CommandName -eq "rtk") {
            & rtk @Args
            return
        }

        & rtk `$CommandName @Args
    }

    function global:git { param([Parameter(ValueFromRemainingArguments = `$true)]`$Args) _Invoke-RtkOrOriginal "git" @Args }
    function global:gh { param([Parameter(ValueFromRemainingArguments = `$true)]`$Args) _Invoke-RtkOrOriginal "gh" @Args }
    function global:npm { param([Parameter(ValueFromRemainingArguments = `$true)]`$Args) _Invoke-RtkOrOriginal "npm" @Args }
    function global:pnpm { param([Parameter(ValueFromRemainingArguments = `$true)]`$Args) _Invoke-RtkOrOriginal "pnpm" @Args }
    function global:npx { param([Parameter(ValueFromRemainingArguments = `$true)]`$Args) _Invoke-RtkOrOriginal "npx" @Args }
    function global:pytest { param([Parameter(ValueFromRemainingArguments = `$true)]`$Args) _Invoke-RtkOrOriginal "pytest" @Args }
    function global:jest { param([Parameter(ValueFromRemainingArguments = `$true)]`$Args) _Invoke-RtkOrOriginal "jest" @Args }
    function global:vitest { param([Parameter(ValueFromRemainingArguments = `$true)]`$Args) _Invoke-RtkOrOriginal "vitest" @Args }
    function global:prettier { param([Parameter(ValueFromRemainingArguments = `$true)]`$Args) _Invoke-RtkOrOriginal "prettier" @Args }
    function global:tsc { param([Parameter(ValueFromRemainingArguments = `$true)]`$Args) _Invoke-RtkOrOriginal "tsc" @Args }
    function global:next { param([Parameter(ValueFromRemainingArguments = `$true)]`$Args) _Invoke-RtkOrOriginal "next" @Args }
}
$endMarker
"@

$currentContent = Get-Content $profilePath -Raw -ErrorAction SilentlyContinue

if ($currentContent -match [regex]::Escape($beginMarker)) {
    $pattern = "(?s)" + [regex]::Escape($beginMarker) + ".*?" + [regex]::Escape($endMarker)
    $newContent = [regex]::Replace($currentContent, $pattern, $rtkBlock)
    Set-Content -Path $profilePath -Value $newContent -Encoding UTF8
    Write-Host "Updated existing RTK auto-prefix block in profile." -ForegroundColor Yellow
} else {
    Add-Content -Path $profilePath -Value "`r`n$rtkBlock"
    Write-Host "Added RTK auto-prefix block to profile." -ForegroundColor Green
}

Write-Host ""
Write-Host "Apply now in current shell with:" -ForegroundColor Cyan
Write-Host "  . `$PROFILE" -ForegroundColor White
Write-Host ""
Write-Host "New PowerShell windows will auto-load RTK wrappers." -ForegroundColor Green
