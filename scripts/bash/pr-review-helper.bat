@echo off
REM PR Review Helper for Windows

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
set "REVIEWS_DIR=%PROJECT_ROOT%\.pr-reviews"

if "%1"=="" goto :show_help
if "%1"=="help" goto :show_help
if "%1"=="--help" goto :show_help
if "%1"=="-h" goto :show_help

if "%1"=="fetch" goto :fetch
if "%1"=="latest" goto :latest
if "%1"=="list" goto :list
if "%1"=="view" goto :view
if "%1"=="setup" goto :setup

echo Unknown command: %1
goto :show_help

:show_help
echo.
echo PR Review Helper
echo.
echo Usage: %~nx0 ^<command^> [options]
echo.
echo Commands:
echo   fetch [PR_NUMBER]    Fetch PR review comments from GitHub
echo   latest               Show the latest bot review comment
echo   list                 List all saved PR reviews
echo   view [PR_NUMBER]     View a specific PR review
echo   setup                Setup GitHub token and configuration
echo.
echo Examples:
echo   %~nx0 fetch          Fetch latest PR
echo   %~nx0 fetch 42       Fetch PR #42
echo   %~nx0 latest         Show latest bot comment
echo   %~nx0 view           View latest review
echo.
goto :eof

:fetch
echo Fetching PR reviews...
if "%2"=="" (
    python "%SCRIPT_DIR%fetch_pr_reviews.py"
) else (
    python "%SCRIPT_DIR%fetch_pr_reviews.py" %2
)
goto :eof

:latest
if not exist "%REVIEWS_DIR%\PR_*.md" (
    echo No reviews found. Run '%~nx0 fetch' first.
    goto :eof
)

for /f "delims=" %%f in ('dir /b /o-d "%REVIEWS_DIR%\PR_*.md" 2^>nul') do (
    set "latest_file=%REVIEWS_DIR%\%%f"
    goto :show_latest_file
)

:show_latest_file
echo Latest PR Review: %latest_file%
echo.
type "%latest_file%"
goto :eof

:list
if not exist "%REVIEWS_DIR%\PR_*.md" (
    echo No reviews found
    goto :eof
)

echo Saved PR Reviews:
echo.
for /f "delims=" %%f in ('dir /b /o-d "%REVIEWS_DIR%\PR_*.md" 2^>nul') do (
    echo   %%f
)
goto :eof

:view
if "%2"=="" (
    REM View latest
    for /f "delims=" %%f in ('dir /b /o-d "%REVIEWS_DIR%\PR_*.md" 2^>nul') do (
        set "view_file=%REVIEWS_DIR%\%%f"
        goto :show_view_file
    )
) else (
    REM View specific PR
    for /f "delims=" %%f in ('dir /b /o-d "%REVIEWS_DIR%\PR_%2_*.md" 2^>nul') do (
        set "view_file=%REVIEWS_DIR%\%%f"
        goto :show_view_file
    )
)

echo No review found
goto :eof

:show_view_file
echo Viewing: %view_file%
echo.
type "%view_file%"
goto :eof

:setup
echo PR Review Helper Setup
echo.

REM Check for GitHub token
if "%GITHUB_TOKEN%"=="" (
    echo GITHUB_TOKEN not set
    echo.
    echo To set up GitHub token:
    echo 1. Go to: https://github.com/settings/tokens
    echo 2. Generate new token ^(classic^)
    echo 3. Select 'repo' scope
    echo 4. Copy the token
    echo.
    set /p "token=Enter GitHub token (or press Enter to skip): "
    
    if not "!token!"=="" (
        setx GITHUB_TOKEN "!token!"
        echo Token saved to environment variables
    )
) else (
    echo GITHUB_TOKEN is set
)

REM Check Python
echo.
echo Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo Python not found. Please install Python 3.
) else (
    echo Python is installed
    
    REM Check requests library
    python -c "import requests" >nul 2>&1
    if errorlevel 1 (
        echo requests library not found
        set /p "install=Install requests? (y/n): "
        if /i "!install!"=="y" (
            pip install requests
            echo Installed requests
        )
    ) else (
        echo requests library is installed
    )
)

echo.
echo Setup complete!
echo.
echo Try: %~nx0 fetch
goto :eof
