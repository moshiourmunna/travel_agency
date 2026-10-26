<?php

namespace App\Services\Auth;

use App\Models\OtpCode;
use App\Services\Notify\Notifier;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

/**
 * One-time codes for sign-in, password reset and phone verification. Codes are stored hashed, expire after
 * 5 minutes, allow 5 attempts, and a new code can be requested once a minute (max 5 per hour per destination).
 */
final class Otp
{
    public const TTL_MIN = 5;

    public const MAX_ATTEMPTS = 5;

    public function __construct(private Notifier $notifier) {}

    /** Bangladeshi mobile → E.164 (+8801XXXXXXXXX); null when it is not a valid BD mobile. */
    public static function phone(?string $raw): ?string
    {
        $d = preg_replace('/\D/', '', (string) $raw);
        if (preg_match('/^(?:880|0)?(1[3-9]\d{8})$/', $d, $m)) {
            return '+880'.$m[1];
        }

        return null;
    }

    /** @return string the plain code (only returned to callers for local development / tests) */
    public function send(string $channel, string $destination, string $purpose, string $locale = 'en'): string
    {
        $recent = OtpCode::where('destination', $destination)->where('purpose', $purpose)->where('created_at', '>', now()->subHour())->orderByDesc('id')->get();
        if ($recent->first() && $recent->first()->created_at->gt(now()->subMinute())) {
            throw ValidationException::withMessages(['destination' => __('Please wait a minute before requesting another code.')]);
        }
        if ($recent->count() >= 5) {
            throw ValidationException::withMessages(['destination' => __('Too many codes requested. Please try again in an hour.')]);
        }
        $code = (string) random_int(100000, 999999);
        OtpCode::where('destination', $destination)->where('purpose', $purpose)->whereNull('consumed_at')->update(['consumed_at' => now()]);
        OtpCode::create(['channel' => $channel, 'destination' => $destination, 'purpose' => $purpose, 'code_hash' => Hash::make($code), 'attempts' => 0,
            'expires_at' => now()->addMinutes(self::TTL_MIN), 'ip' => request()->ip()]);
        $msg = $locale === 'bn'
            ? "মুসাফির কোড: {$code}। ".self::TTL_MIN.' মিনিট বৈধ। কাউকে জানাবেন না।'
            : "Your Musafir code is {$code}. Valid for ".self::TTL_MIN.' minutes. Never share it.';
        if ($channel === 'sms') {
            $this->notifier->sms($destination, $msg);
        } else {
            Mail::raw($msg, fn ($m) => $m->to($destination)->subject($locale === 'bn' ? 'আপনার মুসাফির কোড' : 'Your Musafir code'));
        }

        return $code;
    }

    /** Consumes the code if it matches; throws a validation error otherwise. */
    public function verify(string $destination, string $purpose, string $code): void
    {
        $otp = OtpCode::where('destination', $destination)->where('purpose', $purpose)->whereNull('consumed_at')->orderByDesc('id')->first();
        $fail = fn (string $m) => throw ValidationException::withMessages(['code' => $m]);
        if (! $otp || $otp->expires_at->isPast()) {
            $fail(__('This code has expired. Please request a new one.'));
        }
        if ($otp->attempts >= self::MAX_ATTEMPTS) {
            $otp->update(['consumed_at' => now()]);
            $fail(__('Too many wrong attempts. Please request a new code.'));
        }
        if (! Hash::check($code, $otp->code_hash)) {
            $otp->increment('attempts');
            $fail(__('That code is not right. Please check and try again.'));
        }
        $otp->update(['consumed_at' => now()]);
    }
}
