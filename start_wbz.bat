@echo off
title WBZ.GG Tactical Launcher
color 0a
cls

echo ==========================================
echo       WBZ.GG TACTICAL COMMAND CENTER
echo ==========================================
echo.

:: 1. Check for Node Modules (First Run Only)
if not exist "node_modules" (
    echo [SYSTEM] First time setup detected.
    echo [SYSTEM] Installing necessary tactical assets...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Installation failed. Please check your internet connection.
        pause
        exit /b
    )
    echo [SYSTEM] Installation complete.
) else (
    echo [SYSTEM] Assets verified. Skipping installation.
)

echo.
echo [SYSTEM] Initializing Neural Network (Starting Next.js)...
echo.

:: 2. Launch Browser (Delayed)
start "" "http://localhost:3000"

:: 3. Start Server
npm run dev

pause
