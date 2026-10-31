<?php

namespace App\Admin\Resources;

use App\Admin\Action;
use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\Refund;
use App\Services\RefundService;
use Illuminate\Database\Eloquent\Model;

class RefundResource extends Resource
{
    public string $model = Refund::class;

    public string $slug = 'refunds';

    public array $label = ['en' => 'Refunds', 'bn' => 'রিফান্ড'];

    public array $singular = ['en' => 'Refund', 'bn' => 'রিফান্ড'];

    public string $icon = 'rotate-ccw';

    public string $perm = 'payments';

    public array $with = ['booking', 'payment', 'requester', 'approver'];

    public array $search = ['reason'];

    public bool $creatable = false;

    public bool $editable = false;

    public bool $deletable = false;

    public const STATUS = ['requested' => ['Requested', 'অনুরোধ', 'accent'], 'approved' => ['Approved', 'অনুমোদিত', 'blue'], 'processed' => ['Paid out', 'প্রদান করা হয়েছে', 'green'], 'rejected' => ['Rejected', 'প্রত্যাখ্যাত', 'red']];

    public function columns(): array
    {
        return [
            Col::datetime('created_at', 'Requested', 'অনুরোধ')->sortable(),
            Col::make('booking', 'Booking', 'বুকিং')->value(fn ($m) => $m->booking?->ref),
            Col::make('method', 'Paid by', 'পেমেন্ট মাধ্যম')->value(fn ($m) => PaymentResource::GATEWAYS[$m->payment?->gateway] ?? $m->payment?->gateway)->hideMobile(),
            Col::money('amount', 'Amount', 'পরিমাণ')->sortable(),
            Col::make('reason', 'Reason', 'কারণ')->hideMobile(),
            Col::badge('status', 'Status', 'অবস্থা', self::STATUS)->sortable(),
            Col::make('approver', 'Approved by', 'অনুমোদনকারী')->value(fn ($m) => $m->approver?->name)->hideMobile(),
        ];
    }

    public function filters(): array
    {
        return [Filter::select('status', 'Status', 'অবস্থা', array_map(fn ($s) => ['en' => $s[0], 'bn' => $s[1]], self::STATUS))];
    }

    public function link(Model $m): ?string
    {
        return $m->booking_id ? route('admin.bookings.show', $m->booking_id, false).'#refunds' : null;
    }

    public function actions(): array
    {
        $svc = fn () => app(RefundService::class);

        return [
            Action::make('approve', 'Approve', 'অনুমোদন')->permission('payments.refund')->icon('check')->primary()->visible(fn ($m) => $m->status === 'requested')
                ->handle(fn ($m, $d, $u) => $svc()->approve($m, $u) ? null : null),
            Action::make('process', 'Mark paid out', 'প্রদান সম্পন্ন')->permission('payments.refund')->icon('banknote')->primary()->visible(fn ($m) => $m->status === 'approved')
                ->confirm('Send the money back now? Wallet refunds are credited instantly; card and mobile-wallet refunds must also be completed in the gateway panel unless the live bKash API is configured.',
                    'এখন টাকা ফেরত দেবেন? ওয়ালেট রিফান্ড সঙ্গে সঙ্গে জমা হবে; কার্ড ও মোবাইল ওয়ালেট রিফান্ড গেটওয়ে প্যানেলেও সম্পন্ন করতে হবে (লাইভ বিকাশ এপিআই ছাড়া)।')
                ->handle(fn ($m, $d, $u) => $svc()->process($m, $u) ? null : null),
            Action::make('reject', 'Reject', 'প্রত্যাখ্যান')->permission('payments.refund')->icon('x')->danger()->visible(fn ($m) => in_array($m->status, ['requested', 'approved'], true))
                ->fields([Field::text('note', 'Reason', 'কারণ')->required()->rule('max:160')])
                ->handle(fn ($m, $d, $u) => $svc()->reject($m, $u, $d['note']) ? null : null),
        ];
    }
}
