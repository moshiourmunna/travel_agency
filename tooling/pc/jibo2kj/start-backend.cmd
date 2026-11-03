@echo off
title Musafir backend (http://127.0.0.1:8010)
cd /d "%~dp0backend"
"C:\laragon\bin\php\php-8.4.25-Win32-vs17-x64\php.exe" -d upload_max_filesize=12M -d post_max_size=14M artisan serve --host=127.0.0.1 --port=8010
