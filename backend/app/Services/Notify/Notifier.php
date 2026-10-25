<?php

namespace App\Services\Notify;

use App\Models\NotificationTemplate;
use App\Models\SmsLog;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Sends a templated message (notification_templates, editable in the admin, EN/BN) by email and SMS,
 * and stores an in-app notification for signed-in travellers. Locally MAIL_MAILER=log and SMS_DRIVER=log
 * write everything to storage/logs/laravel.log; production swaps the drivers in .env.
 */
final class Notifier
{
    /**
     * @param  array<string,scalar|null>  $vars
     * @param  array{email?:?string, phone?:?string, name?:?string}  $to
     * @param  list<array{name:string,data:string,mime:string}>  $attachments
     */
    public function send(string $key, array $vars, array $to, string $locale = 'en', ?User $user = null, array $attachments = [], ?string $link = null): void
    {
        $tpls = NotificationTemplate::where('key', $key)->where('is_active', true)->get()->keyBy('channel');
        $fill = fn (?string $s) => $s === null ? '' : strtr($s, collect($vars)->mapWithKeys(fn ($v, $k) => ['{'.$k.'}' => (string) $v])->all());
        $pick = fn (NotificationTemplate $t, string $f) => $t->getTranslation($f, $locale, true) ?: $t->getTranslation($f, 'en', true);

        if (($t = $tpls->get('email')) && ! empty($to['email'])) {
            $subject = $fill($pick($t, 'subject'));
            $body = $fill($pick($t, 'body'));
            try {
                Mail::send([], [], function ($m) use ($to, $subject, $body, $attachments, $link) {
                    $m->to($to['email'], $to['name'] ?? null)->subject($subject)
                        ->html('<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#0f172a"><p>'.e($body).'</p>'.($link ? '<p><a href="'.e($link).'">'.e($link).'</a></p>' : '').'<p style="color:#64748b;font-size:12px">'.e(config('app.name')).'</p></div>');
                    foreach ($attachments as $a) {
                        $m->attachData($a['data'], $a['name'], ['mime' => $a['mime']]);
                    }
                });
            } catch (\Throwable $e) {
                Log::warning('notify.email_failed', ['key' => $key, 'error' => $e->getMessage()]);
            }
        }

        if (($t = $tpls->get('sms')) && ! empty($to['phone'])) {
            $this->sms((string) $to['phone'], $fill($pick($t, 'body')));
        }

        if ($user) {
            DB::table('notifications')->insert([
                'id' => (string) Str::uuid(), 'type' => $key, 'notifiable_type' => User::class, 'notifiable_id' => $user->id,
                'data' => json_encode(['title' => $tpls->get('email') ? $fill($pick($tpls->get('email'), 'subject')) : $key, 'body' => $tpls->first() ? $fill($pick($tpls->first(), 'body')) : '', 'link' => $link, 'kind' => $key], JSON_UNESCAPED_UNICODE),
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }

    public function sms(string $phone, string $body): void
    {
        $driver = (string) config('musafir.sms_driver', 'log');
        $status = 'sent';
        $response = null;
        if ($driver === 'log') {
            Log::info("[SMS to {$phone}] {$body}");
            $response = ['driver' => 'log'];
        } else {
            // Real SMS providers (SSL Wireless, BulkSMSBD) plug in here; until credentials exist we log and mark as queued.
            Log::info("[SMS via {$driver} to {$phone}] {$body}");
            $status = 'queued';
        }
        SmsLog::create(['to' => $phone, 'body' => $body, 'driver' => $driver, 'status' => $status, 'response' => $response]);
    }
}
