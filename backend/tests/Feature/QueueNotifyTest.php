<?php

use App\Jobs\SendSms;
use App\Jobs\SendTemplatedEmail;
use App\Models\Booking;
use App\Services\Checkout\BookingService;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;


it('queues booking e-mails and SMS instead of sending them in the request', function () {
    Queue::fake();
    $b = Booking::whereNotNull('contact')->firstOrFail();
    app(BookingService::class)->notify($b, 'booking_confirmed');
    Queue::assertPushed(SendTemplatedEmail::class, fn ($j) => $j->email === ($b->contact['email'] ?? null) && str_contains($j->body.$j->subject, $b->ref));
});

it('sends the queued e-mail with attachments when the worker runs it', function () {
    (new SendTemplatedEmail('t@example.com', 'T', 'Subject', "Line 1\nLine 2", 'https://example.com', [['name' => 'v.pdf', 'mime' => 'application/pdf', 'data' => base64_encode('%PDF-1.4')]]))->handle();
    $sent = Mail::mailer('array')->getSymfonyTransport()->messages();
    expect($sent)->toHaveCount(1);
    $msg = $sent->first()->getOriginalMessage();
    expect($msg->getSubject())->toBe('Subject')->and($msg->getAttachments())->toHaveCount(1)->and($msg->getHtmlBody())->toContain('Line 1<br />');
});

it('sends sign-in code SMS right after the response, never through the queue', function () {
    Bus::fake();
    app(App\Services\Notify\Notifier::class)->sms('01712345678', 'code 123456', urgent: true);
    Bus::assertDispatchedAfterResponse(SendSms::class);
    app(App\Services\Notify\Notifier::class)->sms('01712345678', 'hello');
    Bus::assertDispatched(SendSms::class, 2);
});
