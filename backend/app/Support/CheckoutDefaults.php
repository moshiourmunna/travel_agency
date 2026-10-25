<?php

namespace App\Support;

/** Checkout defaults added in M4: used by the seeders (fresh installs) and by a data migration (existing databases). */
final class CheckoutDefaults
{
    /** @return list<array{0:string,1:string,2:mixed,3:string,4:bool}> group, key, value, type, public */
    public static function settings(): array
    {
        return [
            ['commerce', 'full_pay_discount_pct', 2, 'number', true],
            ['commerce', 'balance_due_days', 21, 'number', true],
            ['commerce', 'plans_min_total', 20000, 'number', true],
            ['commerce', 'bank_hold_hours', 24, 'number', false],
            ['commerce', 'gift_min', 1000, 'number', true],
            ['commerce', 'gift_max', 500000, 'number', true],
            ['company', 'bin', '004567891-0101', 'text', true],
        ];
    }

    public static function addons(): array
    {
        return [
            ['code' => 'esim', 'label' => ['en' => 'Travel eSIM 10 GB', 'bn' => 'ট্রাভেল ই-সিম ১০ জিবি'], 'price' => 1500, 'per' => 'person', 'is_active' => true],
            ['code' => 'photographer', 'label' => ['en' => 'Photographer (half day)', 'bn' => 'ফটোগ্রাফার (অর্ধদিন)'], 'price' => 6500, 'per' => 'booking', 'is_active' => true],
        ];
    }
}
