<?php

namespace App\Admin\Resources;

use App\Admin\Action;
use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\BookingActivity;
use App\Models\Payment;
use App\Services\Checkout\BookingService;
use Illuminate\Database\Eloquent\Model;

class PaymentResource extends Resource
{
    public string $model = Payment::class;

    public string $slug = 'payments';

    public array $label = ['en' => 'Payments', 'bn' => 'পেমেন্ট'];

    public array $singular = ['en' => 'Payment', 'bn' => 'পেমেন্ট'];

    public string $icon = 'credit-card';

    public string $perm = 'payments';

    public array $with = ['booking'];

    public array $search = ['gateway_txn', 'val_id', 'method'];

    public bool $creatable = false;

    public bool $editable = false;

    public bool $deletable = false;

    public const STATUS = ['initiated' => ['Started', 'শুরু', 'gray'], 'pending' => ['Pending', 'অপেক্ষমাণ', 'accent'], 'success' => ['Paid', 'পরিশোধিত', 'green'],
        'failed' => ['Failed', 'ব্যর্থ', 'red'], 'cancelled' => ['Cancelled', 'বাতিল', 'gray'], 'refunded' => ['Refunded', 'রিফান্ডেড', 'purple']];

    public const GATEWAYS = ['bkash' => 'bKash', 'nagad' => 'Nagad', 'sslcommerz' => 'Card (SSLCommerz)', 'bank_transfer' => 'Bank transfer', 'wallet' => 'Wallet', 'cash' => 'Cash / office', 'mock' => 'Test gateway'];

    public function columns(): array
    {
        return [
            Col::datetime('created_at', 'Date', 'তারিখ')->sortable(),
            Col::make('booking', 'Booking', 'বুকিং')->value(fn ($m) => $m->booking?->ref ?? ($m->purpose === 'wallet_topup' ? 'Wallet top-up' : '—')),
            Col::make('gateway', 'Method', 'মাধ্যম')->value(fn ($m) => self::GATEWAYS[$m->gateway] ?? $m->gateway),
            Col::make('gateway_txn', 'Transaction / slip', 'লেনদেন / স্লিপ')->hideMobile(),
            Col::money('amount', 'Amount', 'পরিমাণ')->sortable(),
            Col::badge('status', 'Status', 'অবস্থা', self::STATUS)->sortable(),
        ];
    }

    public function filters(): array
    {
        return [
            Filter::select('status', 'Status', 'অবস্থা', array_map(fn ($s) => ['en' => $s[0], 'bn' => $s[1]], self::STATUS)),
            Filter::select('gateway', 'Method', 'মাধ্যম', self::GATEWAYS),
            Filter::select('purpose', 'Purpose', 'উদ্দেশ্য', ['booking' => 'Booking', 'instalment' => 'Instalment', 'wallet_topup' => 'Wallet top-up', 'gift_card' => 'Gift card']),
        ];
    }

    public function link(Model $m): ?string
    {
        return route('admin.resource.show', ['payments', $m->id], false);
    }

    public function detail(Model $m): ?array
    {
        return [
            ['label' => tr_pick(['en' => 'Booking', 'bn' => 'বুকিং']), 'value' => $m->booking?->ref ?? '—', 'href' => $m->booking_id ? route('admin.bookings.show', $m->booking_id, false) : null],
            ['label' => tr_pick(['en' => 'Amount', 'bn' => 'পরিমাণ']), 'value' => (float) $m->amount, 'type' => 'money'],
            ['label' => tr_pick(['en' => 'Method', 'bn' => 'মাধ্যম']), 'value' => (self::GATEWAYS[$m->gateway] ?? $m->gateway).($m->method ? ' · '.$m->method : '')],
            ['label' => tr_pick(['en' => 'Status', 'bn' => 'অবস্থা']), 'value' => tr_pick(['en' => self::STATUS[$m->status][0] ?? $m->status, 'bn' => self::STATUS[$m->status][1] ?? $m->status])],
            ['label' => tr_pick(['en' => 'Transaction / slip reference', 'bn' => 'লেনদেন / স্লিপ রেফারেন্স']), 'value' => $m->gateway_txn ?: '—'],
            ['label' => tr_pick(['en' => 'Paid at', 'bn' => 'পরিশোধের সময়']), 'value' => $m->paid_at?->timezone(config('app.timezone'))->format('Y-m-d H:i') ?? '—'],
            ['label' => tr_pick(['en' => 'Gateway data', 'bn' => 'গেটওয়ের তথ্য']), 'value' => json_encode($m->raw, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), 'type' => 'pre'],
        ];
    }

    public function actions(): array
    {
        return [
            Action::make('verify', 'Verify transfer & confirm', 'ট্রান্সফার যাচাই ও নিশ্চিত')->permission('payments.reconcile')->icon('badge-check')->primary()
                ->visible(fn ($m) => in_array($m->status, ['pending', 'initiated'], true) && $m->gateway === 'bank_transfer')
                ->confirm('Confirm that this amount has arrived in the bank account. The booking will be updated and the traveller notified.', 'নিশ্চিত করুন যে টাকা ব্যাংক অ্যাকাউন্টে এসেছে। বুকিং আপডেট হবে এবং ভ্রমণকারীকে জানানো হবে।')
                ->fields([Field::text('note', 'Bank reference / note', 'ব্যাংক রেফারেন্স / নোট')->rule('max:160')])
                ->handle(function ($m, $d, $u) {
                    app(BookingService::class)->settle($m, ['verified_by' => $u->id, 'verified_at' => now()->toIso8601String(), 'note' => $d['note'] ?? null]);

                    return app()->getLocale() === 'bn' ? 'পেমেন্ট নিশ্চিত হয়েছে।' : 'Payment confirmed and booking updated.';
                }),
            Action::make('reject', 'Reject transfer', 'ট্রান্সফার প্রত্যাখ্যান')->permission('payments.reconcile')->icon('x')->danger()
                ->visible(fn ($m) => in_array($m->status, ['pending', 'initiated'], true) && $m->gateway === 'bank_transfer')
                ->fields([Field::text('reason', 'Reason', 'কারণ')->required()->rule('max:160')])
                ->handle(function ($m, $d, $u) {
                    $m->update(['status' => 'failed', 'raw' => array_merge((array) $m->raw, ['rejected_by' => $u->id, 'reason' => $d['reason']])]);
                    if ($m->booking_id) {
                        BookingActivity::create(['booking_id' => $m->booking_id, 'user_id' => $u->id, 'type' => 'payment', 'body' => ['en' => 'Bank transfer not received: '.$d['reason'], 'bn' => 'ব্যাংক ট্রান্সফার পাওয়া যায়নি: '.$d['reason']]]);
                    }

                    return null;
                }),
        ];
    }
}
