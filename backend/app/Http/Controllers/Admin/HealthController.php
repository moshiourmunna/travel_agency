<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class HealthController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('Health', [
            'app' => config('app.name'),
            'db' => DB::connection()->getDatabaseName(),
        ]);
    }
}
