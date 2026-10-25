<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Cache-Control + weak ETag for public GET endpoints (304 when unchanged). */
class PublicCache
{
    public function handle(Request $request, Closure $next, int $maxAge = 60): Response
    {
        $response = $next($request);
        if (! $request->isMethod('GET') || $response->getStatusCode() !== 200) {
            return $response;
        }
        $etag = 'W/"'.md5((string) $response->getContent()).'"';
        $response->headers->set('ETag', $etag);
        $response->headers->set('Cache-Control', "public, max-age={$maxAge}, s-maxage=".($maxAge * 5).', stale-while-revalidate=600');
        if (trim((string) $request->headers->get('If-None-Match')) === $etag) {
            $response->setNotModified();
        }

        return $response;
    }
}
