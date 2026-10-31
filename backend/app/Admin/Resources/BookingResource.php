<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class BookingResource extends Resource
{
    public string $model = Booking::class;

    public string $slug = 'bookings';

    public array $label = ['en' => 'Bookings', 'bn' => 'বুকিং'];

    public array $singular = ['en' => 'Booking', 'bn' => 'বুকিং'];

    public string $icon = 'briefcase';

    public string $perm = 'bookings';

    public array $abilities = ['view' => 'bookings.view', 'manage' => 'bookings.update', 'delete' => 'bookings.cancel'];

    public array $with = ['owner'];

    public array $search = ['ref', 'title', 'contact'];

    public bool $creatable = false;

    public bool $deletable = false;

    public const STATUS = ['pending' => ['Pending payment', 'পেমেন্ট বাকি', 'accent'], 'partial' => ['Part-paid', 'আংশিক পরিশোধিত', 'gold'], 'confirmed' => ['Confirmed', 'নিশ্চিত', 'green'],
        'completed' => ['Completed', 'সম্পন্ন', 'blue'], 'cancelled' => ['Cancelled', 'বাতিল', 'red'], 'refunded' => ['Refunded', 'রিফান্ডেড', 'gray']];

    public const PAY = ['unpaid' => ['Unpaid', 'অপরিশোধিত', 'red'], 'partial' => ['Partial', 'আংশিক', 'gold'], 'paid' => ['Paid', 'পরিশোধিত', 'green'], 'refunded' => ['Refunded', 'রিফান্ডেড', 'gray']];

    public const KINDS = ['tour' => ['en' => 'Holiday', 'bn' => 'হলিডে'], 'cruise' => ['en' => 'Cruise', 'bn' => 'ক্রুজ'], 'activity' => ['en' => 'Activity', 'bn' => 'অ্যাক্টিভিটি'], 'hotel' => ['en' => 'Hotel', 'bn' => 'হোটেল'],
        'flight' => ['en' => 'Flight', 'bn' => 'ফ্লাইট'], 'visa' => ['en' => 'Visa', 'bn' => 'ভিসা'], 'gift_card' => ['en' => 'Gift card', 'bn' => 'গিফট কার্ড']];

    public function columns(): array
    {
        return [
            Col::make('ref', 'Booking', 'বুকিং')->sortable(),
            Col::make('customer', 'Customer', 'গ্রাহক')->value(fn ($m) => $m->contact['name'] ?? trim(($m->contact['first_name'] ?? '').' '.($m->contact['last_name'] ?? ''))),
            Col::tr('title', 'Trip', 'ট্রিপ')->hideMobile(),
            Col::date('travel_start', 'Travel', 'যাত্রা')->sortable()->hideMobile(),
            Col::money('total', 'Total', 'মোট')->sortable(),
            Col::money('paid', 'Paid', 'পরিশোধিত')->hideMobile(),
            Col::badge('status', 'Status', 'অবস্থা', self::STATUS)->sortable(),
            Col::badge('payment_status', 'Payment', 'পেমেন্ট', self::PAY)->hideMobile(),
            Col::datetime('created_at', 'Booked', 'বুকিংয়ের সময়')->sortable()->hideMobile(),
        ];
    }

    public function filters(): array
    {
        return [
            Filter::select('status', 'Status', 'অবস্থা', array_map(fn ($s) => ['en' => $s[0], 'bn' => $s[1]], self::STATUS)),
            Filter::select('payment_status', 'Payment', 'পেমেন্ট', array_map(fn ($s) => ['en' => $s[0], 'bn' => $s[1]], self::PAY)),
            Filter::select('kind', 'Product', 'পণ্য', self::KINDS),
            Filter::select('owner_staff_id', 'Owner', 'দায়িত্বপ্রাপ্ত', User::where('type', 'staff')->orderBy('name')->pluck('name', 'id')->all()),
            Filter::select('travel', 'Travel date', 'যাত্রার তারিখ', ['upcoming' => ['en' => 'Upcoming', 'bn' => 'আসন্ন'], '30' => ['en' => 'Next 30 days', 'bn' => 'আগামী ৩০ দিন'], 'past' => ['en' => 'Past', 'bn' => 'অতীত']])
                ->apply(fn ($q, $v) => match ($v) {
                    'past' => $q->where('travel_start', '<', today()),
                    '30' => $q->whereBetween('travel_start', [today(), today()->addDays(30)]),
                    default => $q->where('travel_start', '>=', today()),
                }),
            Filter::select('channel', 'Channel', 'চ্যানেল', ['web' => 'Website', 'branch' => 'Branch', 'phone' => 'Phone', 'agent' => 'B2B agent', 'app' => 'App']),
        ];
    }

    public function link(Model $m): ?string
    {
        return route('admin.bookings.show', $m->id, false);
    }
}
