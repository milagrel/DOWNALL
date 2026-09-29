@echo off
title Baido - Baixar Tudo
cd /d "%~dp0"

echo ============================================
echo   Baido - Baixar Tudo
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado. Instala em https://nodejs.org
    pause
    exit /b 1
)

if not exist "backend\node_modules" (
    echo [1/4] A instalar dependencias do backend...
    call npm --prefix backend install
) else (
    echo [1/4] Backend ja instalado.
)

if not exist "frontend\node_modules" (
    echo [2/4] A instalar dependencias do frontend...
    call npm --prefix frontend install
) else (
    echo [2/4] Frontend ja instalado.
)

echo [3/4] A iniciar o backend em http://localhost:3001 ...
start "Baido Backend" /D "%~dp0backend" cmd /k npm start

echo [4/4] A iniciar o frontend em http://localhost:5173 ...
start "Baido Frontend" /D "%~dp0frontend" cmd /k npm run dev

timeout /t 4 /nobreak >nul
start http://localhost:5173

echo.
echo  Pronto! O browser abriu em http://localhost:5173
echo  (Se a porta 5173 estiver ocupada, o Vite usa outra - ve o terminal "Baido Frontend")
echo  Para parar: fecha as janelas "Baido Backend" e "Baido Frontend"
echo.
pause
