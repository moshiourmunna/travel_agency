<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

/**
 * Baseline security headers on every Laravel response (API, admin, payment pages, PDFs).
 * The admin panel additionally gets a strict nonce-based Content-Security-Policy (see csp()).
 * HSTS is only sent over HTTPS, so local http://127.0.0.1 keeps working.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $admin = $request->routeIs('admin.*') || $this->isAdminPath($request);
        if ($admin) {
            Vite::useCspNonce(); // @vite tags and the inline theme script carry this nonce
        }
        $response = $next($request);
        $h = $response->headers;
        $h->set('X-Content-Type-Options', 'nosniff');
        $h->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $h->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self), usb=(), interest-cohort=()');
        $h->set('Cross-Origin-Opener-Policy', 'same-origin');
        if (! $h->has('X-Frame-Options') && ! $request->is('api/bookings/*/voucher')) {
            $h->set('X-Frame-Options', 'SAMEORIGIN');
        }
        if ($request->isSecure()) {
            $h->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }
        if ($admin && ! $h->has('Content-Security-Policy') && str_contains((string) $h->get('Content-Type'), 'text/html')) {
            $h->set('Content-Security-Policy', $this->csp());
        }
        if ($request->is('api/*')) {
            $h->set('X-Robots-Tag', 'noindex');
        }

        return $response;
    }

    private function isAdminPath(Request $request): bool
    {
        $domain = config('musafir.admin_domain');
        if ($domain && $request->getHost() === $domain) {
            return true;
        }
        $path = config('musafir.admin_path');

        return $path !== '' && ($request->is($path) || $request->is($path.'/*'));
    }

    /** scheme://host[:port] of each configured URL (media may live on APP_URL, a CDN or S3). */
    private function origins(array $urls): array
    {
        return array_values(array_unique(array_filter(array_map(function ($u) {
            $p = $u ? parse_url((string) $u) : null;

            return $p && isset($p['scheme'], $p['host']) ? $p['scheme'].'://'.$p['host'].(isset($p['port']) ? ':'.$p['port'] : '') : null;
        }, $urls))));
    }

    private function csp(): string
    {
        $nonce = Vite::cspNonce();
        $script = ["'self'", "'nonce-{$nonce}'"];
        $connect = ["'self'"];
        if (Vite::isRunningHot()) { // `npm run dev`: allow the Vite dev server + HMR socket
            $hot = rtrim((string) @file_get_contents(public_path('hot')));
            $script[] = $hot;
            $connect[] = $hot;
            $connect[] = preg_replace('#^http#', 'ws', $hot);
        }

        return implode('; ', [
            "default-src 'self'",
            'script-src '.implode(' ', $script),
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: ".implode(' ', $this->origins([config('app.url'), config('filesystems.disks.public.url'), config('musafir.frontend_url')])),
            "font-src 'self' data:",
            'connect-src '.implode(' ', $connect),
            "frame-src 'self'",
            "frame-ancestors 'self'",
            "form-action 'self'",
            "base-uri 'self'",
            "object-src 'none'",
        ]);
    }
}
