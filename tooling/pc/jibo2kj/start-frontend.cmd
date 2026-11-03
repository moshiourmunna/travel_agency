@echo off
title Musafir website (http://localhost:3010)
cd /d "%~dp0frontend"
call npm run start -- -p 3010
