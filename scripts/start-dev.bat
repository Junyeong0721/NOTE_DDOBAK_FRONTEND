@echo off
setlocal
rem ddobak: start backend + frontend + Cloudflare quick tunnel
rem 이 파일 위치: <프론트 저장소>\scripts\start-dev.bat
set "FRONT=%~dp0.."
set "BACK="
if exist "%~dp0..\..\NOTE_DDOBAK_BACKEND\gradlew.bat" set "BACK=%~dp0..\..\NOTE_DDOBAK_BACKEND"
if not defined BACK if exist "%~dp0..\..\ddobak-backend-springboot\gradlew.bat" set "BACK=%~dp0..\..\ddobak-backend-springboot"
if not defined BACK (
  echo [또박] 백엔드 폴더를 찾지 못했습니다.
  echo        프론트 저장소와 같은 폴더에 NOTE_DDOBAK_BACKEND 저장소를 받아 주세요.
  pause
  exit /b 1
)

:check
set "BUSY="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":8081 .*LISTENING" /C:":5173 .*LISTENING"') do (
  if not defined BUSY echo [또박] 이미 켜져 있는 서버가 있습니다.
  set "BUSY=1"
  for /f "tokens=1" %%n in ('tasklist /FI "PID eq %%p" /NH') do echo        - PID %%p : %%n
)
if not defined BUSY goto :install
choice /C YN /M "[또박] 위 프로그램을 끄고 새로 시작할까요"
if errorlevel 2 exit /b 1
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":8081 .*LISTENING" /C:":5173 .*LISTENING"') do taskkill /PID %%p /F >nul 2>nul
timeout /t 3 /nobreak >nul
goto :check

:install
if not exist "%FRONT%\node_modules" (
  echo [또박] 프론트 라이브러리를 설치합니다. 처음 한 번만 걸려요.
  pushd "%FRONT%"
  call npm.cmd install
  popd
)
set "CF=cloudflared"
where cloudflared >nul 2>nul && goto :run
echo [또박] cloudflared 를 설치합니다. (처음 한 번만)
winget install --id Cloudflare.cloudflared -e --accept-source-agreements --accept-package-agreements
set "CF=%ProgramFiles(x86)%\cloudflared\cloudflared.exe"
if exist "%CF%" goto :run
set "CF=%ProgramFiles%\cloudflared\cloudflared.exe"
if exist "%CF%" goto :run
echo [또박] cloudflared 를 찾지 못했습니다. 이 창을 닫고 start-dev.bat 을 다시 실행해 주세요.
pause
exit /b 1

:run
echo [또박] 백엔드(8081)와 프론트(5173)를 새 창에서 켭니다.
rem backend log is UTF-8: switch that window to UTF-8 (65001) so Korean is not garbled
start "ddobak-backend" /d "%BACK%" cmd /k "chcp 65001 >nul & gradlew.bat bootRun"
start "ddobak-frontend" /d "%FRONT%" cmd /k npm.cmd run dev
echo [또박] 서버가 켜질 때까지 20초 기다립니다...
timeout /t 20 /nobreak >nul
echo.
echo ============================================================
echo  아래에 나오는 https://....trycloudflare.com 주소를
echo  iPad Safari 에서 여세요. 끝낼 때는 이 창에서 Ctrl+C
echo ============================================================
echo.
"%CF%" tunnel --url http://localhost:5173
pause
exit /b 0
