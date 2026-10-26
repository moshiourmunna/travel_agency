<?php

/*
| Musafir platform configuration. Everything business-related (company info, prices, content)
| lives in the database and is edited from the admin panel; this file only holds infrastructure
| switches that differ between environments (local Laragon, VPS, shared hosting).
*/
return [
    // Public Next.js site (used for CORS, absolute links in emails, revalidation webhooks).
    'frontend_url' => rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/'),

    // Admin panel location. Set ADMIN_DOMAIN=admin.musafir.com to serve it on its own host
    // (then ADMIN_PATH may be empty). Locally it is http://127.0.0.1:8000/admin.
    'admin_domain' => env('ADMIN_DOMAIN') ?: null,
    'admin_path' => trim((string) env('ADMIN_PATH', 'admin'), '/'),

    // Shared secret for POST {frontend}/api/revalidate (HMAC-SHA256 of the body).
    'revalidate_secret' => env('REVALIDATE_SECRET', ''),
    'revalidate_enabled' => (bool) env('REVALIDATE_ENABLED', true),

    'payment_mode' => env('PAYMENT_MODE', 'sandbox'), // sandbox | live
    // Local development only: return the sign-in code in the API response so you can test without an SMS provider.
    'otp_debug' => (bool) env('OTP_DEBUG', false),
    'sms_driver' => env('SMS_DRIVER', 'log'),          // log | ssl_wireless | bulksmsbd

    'locales' => ['en', 'bn'],
    'default_locale' => 'en',
    'currency' => 'BDT',
    'timezone_display' => 'Asia/Dhaka',
];
