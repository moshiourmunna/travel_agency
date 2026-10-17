<?php

// Router for `php artisan serve` only (never used by Apache/Nginx/production).
// PHP's built-in server does not expose OS environment variables in $_ENV/$_SERVER, so Laravel's standard
// LARAVEL_STORAGE_PATH override is lost there. Forward it, then hand over to Laravel's own router.
// Used by the browser test-suite (tests/e2e) to keep its uploads/sessions/logs out of the real storage/ folder.
if (is_string($path = getenv('LARAVEL_STORAGE_PATH')) && $path !== '') {
    $_ENV['LARAVEL_STORAGE_PATH'] = $_SERVER['LARAVEL_STORAGE_PATH'] = $path;
}

return require __DIR__.'/vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php';
