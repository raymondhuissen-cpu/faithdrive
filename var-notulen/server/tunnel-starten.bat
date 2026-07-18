@echo off
where cloudflared >nul 2>nul
if errorlevel 1 (
  echo cloudflared is nog niet geinstalleerd.
  echo.
  echo Open een NIEUW Opdrachtprompt-venster ^(niet dit venster^) en typ:
  echo   winget install --id Cloudflare.cloudflared
  echo.
  echo Sluit daarna dit venster en dubbelklik opnieuw op tunnel-starten.bat
  pause
  exit /b 1
)

echo ============================================
echo   Tunnel wordt gestart...
echo ============================================
echo.
echo Zodra hieronder een adres verschijnt zoals https://iets.trycloudflare.com
echo is dat de link die je op je iPad kunt openen.
echo.
echo Laat dit venster open staan, naast het venster van starten.bat, zolang
echo je de app op je iPad wilt gebruiken.
echo.
cloudflared tunnel --url http://localhost:3000
pause
