<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/** One transactional e-mail (rendered from a notification template). Queued so a slow SMTP server never delays checkout or the admin. */
class SendTemplatedEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public int $tries = 3;

    public array $backoff = [30, 120, 600];

    /** @param  list<array{name:string,data:string,mime:string}>  $attachments  data is base64 (queue payloads must be text) */
    public function __construct(public string $email, public ?string $name, public string $subject, public string $body, public ?string $link = null, public array $attachments = [], public string $key = '') {}

    public function handle(): void
    {
        Mail::send([], [], function ($m) {
            $m->to($this->email, $this->name)->subject($this->subject)
                ->html('<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#0f172a"><p>'.nl2br(e($this->body)).'</p>'.($this->link ? '<p><a href="'.e($this->link).'">'.e($this->link).'</a></p>' : '').'<p style="color:#64748b;font-size:12px">'.e(config('app.name')).'</p></div>');
            foreach ($this->attachments as $a) {
                $m->attachData(base64_decode($a['data']), $a['name'], ['mime' => $a['mime']]);
            }
        });
    }

    public function failed(\Throwable $e): void
    {
        Log::warning('notify.email_failed', ['key' => $this->key, 'error' => $e->getMessage()]);
    }
}
