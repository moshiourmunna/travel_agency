$ErrorActionPreference = 'Continue'
$root = 'E:\projects\haj_agency\musafir'
$php = 'C:\laragon\bin\php\php-8.4.25-Win32-vs17-x64\php.exe'
$mysql = 'C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe'
$log = 'C:\Users\m\msffinal\setup.log'
function L($m){ "$(Get-Date -Format HH:mm:ss) $m" | Tee-Object -FilePath $log -Append }
L "start"
& $mysql -uroot -e "CREATE DATABASE IF NOT EXISTS musafir_final CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE DATABASE IF NOT EXISTS musafir_final_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1 | Out-File $log -Append
L "db created $LASTEXITCODE"
Set-Location "$root\backend"
if (-not (Test-Path .env)) {
  $e = Get-Content .env.example -Raw
  $secret = ([guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N"))
  $e = $e -replace '(?m)^DB_DATABASE=.*$','DB_DATABASE=musafir_final'
  $e = $e -replace '(?m)^APP_URL=.*$','APP_URL=http://127.0.0.1:8010'
  $e = $e -replace '(?m)^FRONTEND_URL=.*$','FRONTEND_URL=http://localhost:3010'
  $e = $e -replace '(?m)^SANCTUM_STATEFUL_DOMAINS=.*$','SANCTUM_STATEFUL_DOMAINS=localhost:3010,127.0.0.1:3010'
  $e = $e -replace '(?m)^REVALIDATE_SECRET=.*$',"REVALIDATE_SECRET=$secret"
  [IO.File]::WriteAllText("$root\backend\.env", $e)
  $fe = Get-Content "$root\frontend\.env.example" -Raw
  $fe = $fe -replace '(?m)^API_URL=.*$','API_URL=http://127.0.0.1:8010'
  $fe = $fe -replace '(?m)^NEXT_PUBLIC_SITE_URL=.*$','NEXT_PUBLIC_SITE_URL=http://localhost:3010'
  $fe = $fe -replace '(?m)^REVALIDATE_SECRET=.*$',"REVALIDATE_SECRET=$secret"
  [IO.File]::WriteAllText("$root\frontend\.env.local", $fe)
  L "env files written"
}
L "composer install"
& composer.bat install --no-interaction 2>&1 | Out-File $log -Append
L "composer exit $LASTEXITCODE"
& $php artisan key:generate --force 2>&1 | Out-File $log -Append
& $php artisan migrate --seed --force 2>&1 | Out-File $log -Append
L "migrate exit $LASTEXITCODE"
& $php artisan storage:link 2>&1 | Out-File $log -Append
L "storage:link exit $LASTEXITCODE"
& npm.cmd ci --no-audit --no-fund 2>&1 | Out-File $log -Append
& npm.cmd run build 2>&1 | Out-File $log -Append
L "admin build exit $LASTEXITCODE"
Start-Process -FilePath "$root\start-backend.cmd" -WorkingDirectory "$root" -WindowStyle Minimized
Start-Sleep 6
try { $r = Invoke-WebRequest http://127.0.0.1:8010/api/v1/health -UseBasicParsing -TimeoutSec 30; L "health $($r.StatusCode)" } catch { L "health FAIL $_" }
Set-Location "$root\frontend"
& npm.cmd ci --no-audit --no-fund 2>&1 | Out-File $log -Append
L "frontend npm ci exit $LASTEXITCODE"
& npm.cmd run build 2>&1 | Out-File $log -Append
L "next build exit $LASTEXITCODE"
Start-Process -FilePath "$root\start-frontend.cmd" -WorkingDirectory "$root" -WindowStyle Minimized
Start-Sleep 10
foreach($u in 'http://localhost:3010/en','http://localhost:3010/bn','http://127.0.0.1:8010/admin/login'){ try { $r = Invoke-WebRequest $u -UseBasicParsing -TimeoutSec 60; L "$u $($r.StatusCode)" } catch { L "$u FAIL $_" } }
L "DONE"
