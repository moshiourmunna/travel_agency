<?php

namespace App\Support;

use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Support\Facades\Cache;

/**
 * RFC 6238 time-based one-time passwords (Google Authenticator, Microsoft Authenticator, 1Password, Authy …):
 * SHA-1, 6 digits, 30-second steps, ±1 step clock drift. A code can be used once (replay guard per user).
 */
final class Totp
{
    private const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    public static function secret(): string
    {
        $bytes = random_bytes(20);
        $bits = '';
        foreach (str_split($bytes) as $c) {
            $bits .= str_pad(decbin(ord($c)), 8, '0', STR_PAD_LEFT);
        }
        $out = '';
        foreach (str_split($bits, 5) as $chunk) {
            $out .= self::ALPHABET[bindec(str_pad($chunk, 5, '0'))];
        }

        return $out; // 32 chars
    }

    public static function code(string $secret, ?int $step = null): string
    {
        $step ??= intdiv(time(), 30);
        $hash = hash_hmac('sha1', pack('N2', 0, $step), self::decode($secret), true);
        $o = ord($hash[19]) & 0x0F;
        $n = ((ord($hash[$o]) & 0x7F) << 24) | (ord($hash[$o + 1]) << 16) | (ord($hash[$o + 2]) << 8) | ord($hash[$o + 3]);

        return str_pad((string) ($n % 1_000_000), 6, '0', STR_PAD_LEFT);
    }

    /** True when $code matches the current ±1 step and that step was not used before by $replayKey. */
    public static function verify(string $secret, string $code, ?string $replayKey = null): bool
    {
        $code = preg_replace('/\D/', '', $code);
        if (strlen($code) !== 6) {
            return false;
        }
        $now = intdiv(time(), 30);
        foreach ([0, -1, 1] as $d) {
            if (hash_equals(self::code($secret, $now + $d), $code)) {
                if ($replayKey) {
                    $last = (int) Cache::get("totp:last:{$replayKey}", 0);
                    if ($now + $d <= $last) {
                        return false;
                    }
                    Cache::put("totp:last:{$replayKey}", $now + $d, 120);
                }

                return true;
            }
        }

        return false;
    }

    public static function uri(string $secret, string $label, string $issuer): string
    {
        return 'otpauth://totp/'.rawurlencode($issuer.':'.$label).'?'.http_build_query(['secret' => $secret, 'issuer' => $issuer, 'algorithm' => 'SHA1', 'digits' => 6, 'period' => 30], '', '&', PHP_QUERY_RFC3986);
    }

    public static function qrSvg(string $uri): string
    {
        return (new Writer(new ImageRenderer(new RendererStyle(200, 1), new SvgImageBackEnd)))->writeString($uri);
    }

    /** @return list<string> e.g. "k7q2-zm4p" */
    public static function recoveryCodes(int $n = 8): array
    {
        return array_map(fn () => strtolower(substr(bin2hex(random_bytes(4)), 0, 4).'-'.substr(bin2hex(random_bytes(4)), 0, 4)), range(1, $n));
    }

    private static function decode(string $b32): string
    {
        $b32 = strtoupper(preg_replace('/[^A-Za-z2-7]/', '', $b32));
        $bits = '';
        foreach (str_split($b32) as $c) {
            $bits .= str_pad(decbin(strpos(self::ALPHABET, $c)), 5, '0', STR_PAD_LEFT);
        }
        $out = '';
        foreach (str_split($bits, 8) as $byte) {
            if (strlen($byte) === 8) {
                $out .= chr(bindec($byte));
            }
        }

        return $out;
    }
}
