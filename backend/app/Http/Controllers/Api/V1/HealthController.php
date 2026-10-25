<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        try {
            DB::select('select 1');
            $db = 'ok';
        } catch (Throwable) {
            $db = 'down';
        }

        return response()->json([
            'status' => $db === 'ok' ? 'ok' : 'degraded',
            'app' => config('app.name'),
            'db' => $db,
            'time' => now()->toIso8601String(),
        ], $db === 'ok' ? 200 : 503);
    }
}
