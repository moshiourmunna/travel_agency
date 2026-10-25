<?php

namespace App\Services\Payments;

use App\Support\Settings;

/**
 * Resolves a gateway code to a driver. A gateway is offered only if it is enabled in
 * settings (payments.gateways). In sandbox mode a gateway without credentials falls back to the
 * built-in simulator (MockGateway) branded with the same name, so the full flow works locally;
 * in live mode an unconfigured gateway is simply not offered.
 */
final class GatewayManager
{
    public const LABELS = ['sslcommerz' => 'Card · SSLCommerz', 'bkash' => 'bKash', 'nagad' => 'Nagad', 'bank_transfer' => 'Bank transfer', 'mock' => 'Test gateway'];

    public static function live(): bool
    {
        return config('musafir.payment_mode') === 'live';
    }

    public function enabled(): array
    {
        $on = (array) Settings::get('payments.gateways', []);
        $out = [];
        foreach (['bkash', 'nagad', 'sslcommerz', 'bank_transfer', 'mock'] as $code) {
            if (empty($on[$code]) || ($code === 'mock' && self::live())) {
                continue;
            }
            if ($this->resolve($code)) {
                $out[] = $code;
            }
        }

        return $out;
    }

    public function resolve(string $code): ?Gateway
    {
        $on = (array) Settings::get('payments.gateways', []);
        if (empty($on[$code])) {
            return null;
        }
        $driver = match ($code) {
            'sslcommerz' => new SslCommerzGateway,
            'bkash' => new BkashGateway,
            'nagad' => new NagadGateway,
            'bank_transfer' => new BankTransferGateway,
            'mock' => self::live() ? null : new MockGateway('mock', self::LABELS['mock']),
            default => null,
        };
        if (! $driver) {
            return null;
        }
        if ($driver->configured()) {
            return $driver;
        }

        return self::live() ? null : new MockGateway($code, self::LABELS[$code] ?? $code);
    }
}
