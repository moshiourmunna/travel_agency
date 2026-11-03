$ErrorActionPreference = 'Continue'
$root = 'E:\projects\haj_agency\musafir'
$sm = "$env:LOCALAPPDATA\musafir-smoke"
$t = 'C:\Users\m\msffinal\t'
New-Item -ItemType Directory -Force $t | Out-Null
$log = "$t\run.log"
function L($m){ "$(Get-Date -Format HH:mm:ss) $m" | Out-File $log -Append }
$env:CHROME = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$env:MUSAFIR_BACKEND = "$root\backend"
$env:API = 'http://127.0.0.1:8010'
$env:FE = 'http://localhost:3010'
$env:OUT = "$t\shots"
foreach($f in 'pc\pc_smoke.mjs','pc\pc_portal_smoke.mjs','tests\checkout_e2e.mjs','tests\site_e2e.mjs','tests\admin_e2e.mjs','tests\admin_crawl.mjs'){ Copy-Item "$root\tooling\$f" $sm -Force }
L "pest"
Push-Location "$root\backend"
$env:OPENSSL_CONF = 'C:\laragon\bin\php\php-8.4.25-Win32-vs17-x64\extras\ssl\openssl.cnf'
$env:DB_DATABASE = 'musafir_final_test'
& php artisan test 2>&1 | Out-File "$t\pest.txt"
L "pest exit $LASTEXITCODE"
Remove-Item Env:DB_DATABASE
Pop-Location
Set-Location $sm
& node pc_smoke.mjs 2>&1 | Out-File "$t\pc_smoke.txt"; L "pc_smoke exit $LASTEXITCODE"
& node site_e2e.mjs http://localhost:3010 2>&1 | Out-File "$t\site.txt"; L "site exit $LASTEXITCODE"
& node pc_portal_smoke.mjs 2>&1 | Out-File "$t\portal.txt"; L "portal exit $LASTEXITCODE"
& node checkout_e2e.mjs http://localhost:3010 2>&1 | Out-File "$t\checkout.txt"; L "checkout exit $LASTEXITCODE"
& node admin_e2e.mjs http://127.0.0.1:8010/admin http://localhost:3010 2>&1 | Out-File "$t\admin_e2e.txt"; L "admin_e2e exit $LASTEXITCODE"
foreach($e in 'admin','sales','reservations','visa','support','accounts','content'){
  & node admin_crawl.mjs "$e@musafir.test" http://127.0.0.1:8010/admin 2>&1 | Out-File "$t\crawl_$e.txt"; L "crawl $e exit $LASTEXITCODE"
}
Set-Location "$root\backend"
& php artisan musafir:e2e-cleanup 2>&1 | Out-File "$t\cleanup.txt"; L "cleanup exit $LASTEXITCODE"
L "DONE"
