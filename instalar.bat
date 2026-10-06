@echo off
title FileDrop - Instalador
cd /d "%~dp0"

echo.
echo  ================================
echo    FileDrop - Instalacion
echo  ================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  [X] Node.js no esta instalado.
    echo      Descargalo de: https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo  [1/3] Node.js detectado:
node -v
echo.

echo  [2/3] Instalando dependencias...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo  [X] Error al instalar dependencias.
    pause
    exit /b 1
)
echo.

echo  [3/3] Configurando Firewall de Windows...
echo        (Se pediran permisos de administrador)

:: Creamos regla para el puerto 3000 entrante
netsh advfirewall firewall delete rule name="FileDrop 3000" >nul 2>nul
netsh advfirewall firewall add rule name="FileDrop 3000" dir=in action=allow protocol=TCP localport=3000 >nul 2>nul

:: Y una regla para node.exe directamente
netsh advfirewall firewall delete rule name="FileDrop Node" >nul 2>nul
netsh advfirewall firewall add rule name="FileDrop Node" dir=in action=allow program="%ProgramFiles%\nodejs\node.exe" enable=yes >nul 2>nul

if %errorlevel% neq 0 (
    echo.
    echo  [!] No se pudo configurar el Firewall automaticamente.
    echo      Abre "instalar.bat" con clic derecho ^> "Ejecutar como administrador".
    echo.
) else (
    echo        OK - Reglas creadas.
)

echo.
echo  ================================
echo    Instalacion completada
echo  ================================
echo.
echo  Ahora ejecuta "iniciar.bat".
echo.
pause