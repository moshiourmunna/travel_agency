@echo off
rem Run after changing frontend code or .env.local. The backend (start-backend.cmd) must be running first.
cd /d "%~dp0frontend"
call npm run build
