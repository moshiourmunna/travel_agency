<?php

namespace App\Integrations;

use App\Models\IntegrationLog;

trait LogsCalls
{
    protected function logged(string $provider, string $operation, array $request, callable $fn, bool $logResponse = true)
    {
        $t = microtime(true);
        try {
            $res = $fn();
            $status = 'ok';
            return $res;
        } catch (\Throwable $e) {
            $status = 'error'; $res = ['error' => $e->getMessage()];
            throw $e;
        } finally {
            try {
                IntegrationLog::create(['provider' => $provider, 'operation' => $operation, 'status' => $status ?? 'error', 'duration_ms' => (int) ((microtime(true) - $t) * 1000),
                    'request' => $request, 'response' => $logResponse && is_array($res ?? null) ? $res : null]);
            } catch (\Throwable) {
            }
        }
    }
}
