@echo off
cd /d "%~dp0"
echo ============================================
echo   VAR Notulen - installeren
echo ============================================
echo.
echo Bezig met installeren, dit kan een minuut duren...
echo.
call npm install
if errorlevel 1 (
  echo.
  echo Er ging iets mis bij het installeren. Stuur de foutmelding hierboven door.
  pause
  exit /b 1
)

if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo.
  echo Er is een instellingenbestand ^(.env^) aangemaakt.
  echo Kladblok gaat nu open - vul VAR_APP_PASSWORD en SESSION_SECRET in,
  echo sla op met Ctrl+S en sluit Kladblok daarna weer.
  echo.
  pause
  notepad ".env"
)

echo.
echo Installatie klaar! Dubbelklik nu op "starten.bat" om de app te starten.
pause
