<?php

namespace App\Http\Middleware;

use App\Support\Revalidator;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Collects the cache tags of every public model saved/deleted during this admin request and purges them
 * on the Next.js site before the response is returned, so the change is live when the editor looks.
 */
class FlushRevalidation
{
    public function handle(Request $request, Closure $next): Response
    {
        $r = app(Revalidator::class);
        $r->collect(! $request->isMethodSafe());
        $response = $next($request);
        if ($r->collecting()) {
            $result = $r->flush();
            $r->collect(false);
            if ($result && ! $result['ok'] && $request->hasSession()) {
                $request->session()->flash('warning', __('admin.revalidate_failed', ['error' => $result['error'] ?? '?']));
            }
            if ($result && $request->hasSession()) {
                $request->session()->flash('revalidated', $result['tags']);
            }
        }

        return $response;
    }
}
