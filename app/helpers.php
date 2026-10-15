<?php

use App\Support\SiteConfig;

if (! function_exists('t3')) {
    /** Inline UI string in up to three languages: t3('Book now', 'বুক করুন', 'احجز الآن'). Falls back to English. */
    function t3(string $en, ?string $bn = null, ?string $ar = null): string
    {
        return match (app()->getLocale()) { 'bn' => $bn ?: $en, 'ar' => $ar ?: $en, default => $en };
    }
}
if (! function_exists('money')) {
    /** ৳ 8,45,000 (South-Asian grouping). */
    function money(int|float|null $amount, string $symbol = '৳ '): string
    {
        $n = (string) (int) round($amount ?? 0);
        $neg = str_starts_with($n, '-'); $n = ltrim($n, '-');
        if (strlen($n) > 3) {
            $last3 = substr($n, -3); $rest = substr($n, 0, -3);
            $rest = preg_replace('/\B(?=(\d{2})+(?!\d))/', ',', $rest);
            $n = $rest.','.$last3;
        }
        return $symbol.($neg ? '-' : '').$n;
    }
}
if (! function_exists('module_on')) {
    function module_on(string $key): bool { return SiteConfig::moduleOn($key); }
}
if (! function_exists('site')) {
    function site(string $key, $default = null) { return SiteConfig::setting($key, $default); }
}
if (! function_exists('img')) {
    /** Seeded images live in public/assets, uploads in storage/app/public. */
    function img(?string $path): string
    {
        if (! $path) return asset('assets/img/img1.jpg');
        if (str_starts_with($path, 'http')) return $path;
        return str_starts_with($path, 'assets/') ? asset($path) : asset('storage/'.$path);
    }
}
