<?php

namespace App\Jobs;

use App\Services\Notify\Notifier;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;

/** One SMS through the configured provider (queued; sign-in codes use dispatchAfterResponse instead so they never wait for a worker). */
class SendSms implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public int $tries = 3;

    public array $backoff = [10, 60, 300];

    public function __construct(public string $phone, public string $body) {}

    public function handle(Notifier $n): void
    {
        $n->smsNow($this->phone, $this->body);
    }
}
