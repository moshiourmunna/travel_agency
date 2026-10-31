<?php

namespace App\Http\Controllers\Admin;

use App\Admin\Registry;
use App\Admin\Resources\BookingResource;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Document;
use App\Models\Inquiry;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Review;
use App\Models\SupportTicket;
use App\Models\User;
use App\Models\VisaApplication;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $r): Response
    {
        $u = $r->user();
        $tz = config('app.timezone');
        $now = CarbonImmutable::now($tz);
        $monthStart = $now->startOfMonth();
        $prevStart = $monthStart->subMonth();
        $finance = $u->can('dashboard.finance');
        $kpis = [];

        if ($u->can('bookings.view')) {
            $live = fn ($q) => $q->whereNotIn('status', ['cancelled', 'refunded']);
            $thisMonth = Booking::where('created_at', '>=', $monthStart)->tap($live)->count();
            $lastMonth = Booking::whereBetween('created_at', [$prevStart, $monthStart])->tap($live)->count();
            $kpis[] = ['key' => 'bookings', 'label' => tr_pick(['en' => 'Bookings this month', 'bn' => 'এ মাসের বুকিং']), 'value' => $thisMonth, 'delta' => self::delta($thisMonth, $lastMonth), 'icon' => 'briefcase', 'href' => route('admin.resource.index', 'bookings', false)];
            $kpis[] = ['key' => 'travelling', 'label' => tr_pick(['en' => 'Travelling in the next 14 days', 'bn' => 'আগামী ১৪ দিনে যাত্রা']), 'value' => Booking::whereIn('status', ['confirmed', 'partial'])->whereBetween('travel_start', [$now->toDateString(), $now->addDays(14)->toDateString()])->count(), 'icon' => 'plane-takeoff', 'href' => route('admin.resource.index', ['bookings', 'f[travel]' => '30'], false)];
        }
        if ($finance) {
            $rev = fn ($from, $to) => (float) Payment::where('status', 'success')->whereBetween('paid_at', [$from, $to])->sum('amount');
            $cur = $rev($monthStart, $now);
            $prev = $rev($prevStart, $monthStart);
            $kpis[] = ['key' => 'revenue', 'label' => tr_pick(['en' => 'Payments received this month', 'bn' => 'এ মাসে প্রাপ্ত পেমেন্ট']), 'value' => $cur, 'type' => 'money', 'delta' => self::delta($cur, $prev), 'icon' => 'banknote', 'href' => route('admin.resource.index', 'payments', false)];
            $kpis[] = ['key' => 'outstanding', 'label' => tr_pick(['en' => 'Balance still due', 'bn' => 'বাকি পাওনা']), 'value' => (float) Booking::whereIn('status', ['pending', 'partial', 'confirmed'])->sum(DB::raw('GREATEST(total - paid, 0)')), 'type' => 'money', 'icon' => 'hourglass'];
        }
        if ($u->can('customers.view')) {
            $kpis[] = ['key' => 'customers', 'label' => tr_pick(['en' => 'New customers this month', 'bn' => 'এ মাসের নতুন গ্রাহক']), 'value' => User::where('type', 'customer')->where('created_at', '>=', $monthStart)->count(), 'icon' => 'user-plus', 'href' => route('admin.resource.index', 'customers', false)];
        }
        if ($u->can('visa.view')) {
            $kpis[] = ['key' => 'visa', 'label' => tr_pick(['en' => 'Visa files in progress', 'bn' => 'চলমান ভিসা ফাইল']), 'value' => VisaApplication::whereNotIn('stage', ['approved', 'rejected', 'delivered', 'failed'])->count(), 'icon' => 'stamp', 'href' => route('admin.resource.index', 'visa-applications', false)];
        }
        if ($u->can('content.view') && ! $u->can('bookings.view')) {
            $kpis[] = ['key' => 'reviews', 'label' => tr_pick(['en' => 'Published reviews', 'bn' => 'প্রকাশিত রিভিউ']), 'value' => Review::where('status', 'published')->count(), 'icon' => 'star', 'href' => route('admin.resource.index', 'reviews', false)];
            $kpis[] = ['key' => 'tours', 'label' => tr_pick(['en' => 'Published tours', 'bn' => 'প্রকাশিত ট্যুর']), 'value' => \App\Models\Tour::where('status', 'published')->count(), 'icon' => 'map', 'href' => route('admin.resource.index', 'tours', false)];
        }

        return Inertia::render('Dashboard', [
            'kpis' => $kpis,
            'attention' => $this->attention($u),
            'chart' => $u->can('bookings.view') ? $this->chart($now, $finance) : null,
            'recent' => $u->can('bookings.view') ? Booking::latest()->limit(8)->get()->map(fn ($b) => [
                'id' => $b->id, 'ref' => $b->ref, 'title' => $b->tr('title'), 'customer' => $b->contact['name'] ?? null, 'total' => (float) $b->total,
                'status' => $b->status, 'status_label' => tr_pick(['en' => BookingResource::STATUS[$b->status][0] ?? $b->status, 'bn' => BookingResource::STATUS[$b->status][1] ?? $b->status]),
                'status_color' => BookingResource::STATUS[$b->status][2] ?? 'gray', 'created_at' => $b->created_at?->toIso8601String(), 'href' => route('admin.bookings.show', $b->id, false),
            ]) : [],
            'mix' => $u->can('bookings.view') ? Booking::where('created_at', '>=', $now->subDays(90))->whereNotIn('status', ['cancelled', 'refunded'])
                ->selectRaw('kind, count(*) c, sum(total) t')->groupBy('kind')->orderByDesc('c')->get()
                ->map(fn ($x) => ['kind' => $x->kind, 'label' => tr_pick(BookingResource::KINDS[$x->kind] ?? ['en' => $x->kind, 'bn' => $x->kind]), 'count' => (int) $x->c, 'total' => $finance ? (float) $x->t : null]) : [],
            'revalidate' => $u->can('settings.manage') ? cache('musafir.revalidate.last') : null,
        ]);
    }

    private static function delta(float $cur, float $prev): ?float
    {
        return $prev > 0 ? round(($cur - $prev) / $prev * 100, 1) : null;
    }

    /** Work waiting for this person, in priority order. */
    private function attention(User $u): array
    {
        $items = [];
        $add = function (string $perm, int $count, array $label, string $href, string $icon, string $tone = 'accent') use ($u, &$items) {
            if ($count > 0 && $u->can($perm)) {
                $items[] = ['count' => $count, 'label' => tr_pick($label), 'href' => $href, 'icon' => $icon, 'tone' => $tone];
            }
        };
        $idx = fn ($slug, $q = []) => route('admin.resource.index', [$slug] + $q, false);
        $add('payments.reconcile', Payment::where('gateway', 'bank_transfer')->where('status', 'pending')->count(), ['en' => 'Bank transfers to verify', 'bn' => 'যাচাইয়ের অপেক্ষায় ব্যাংক ট্রান্সফার'], $idx('payments', ['f[status]' => 'pending', 'f[gateway]' => 'bank_transfer']), 'landmark', 'red');
        $add('payments.refund', Refund::whereIn('status', ['requested', 'approved'])->count(), ['en' => 'Refunds waiting', 'bn' => 'অপেক্ষমাণ রিফান্ড'], $idx('refunds'), 'rotate-ccw', 'red');
        $add('bookings.view', Booking::where('status', 'pending')->where('hold_expires_at', '<=', now()->addHours(6))->where('hold_expires_at', '>', now())->count(), ['en' => 'Seat holds expiring within 6 hours', 'bn' => '৬ ঘণ্টার মধ্যে শেষ হওয়া সিট হোল্ড'], $idx('bookings', ['f[status]' => 'pending']), 'timer');
        $add('leads.view', Inquiry::where('status', 'new')->count(), ['en' => 'New enquiries', 'bn' => 'নতুন জিজ্ঞাসা'], $idx('inquiries', ['f[status]' => 'new']), 'inbox');
        $add('tickets.view', SupportTicket::where('status', 'open')->count(), ['en' => 'Open support tickets', 'bn' => 'খোলা সাপোর্ট টিকিট'], $idx('tickets', ['f[status]' => 'open']), 'life-buoy');
        $add('visa.documents', Document::where('status', 'pending')->count(), ['en' => 'Visa documents to check', 'bn' => 'যাচাইয়ের অপেক্ষায় ভিসা ডকুমেন্ট'], $idx('documents', ['f[status]' => 'pending']), 'file-check');
        $add('reviews.moderate', Review::where('status', 'review')->count(), ['en' => 'Reviews awaiting moderation', 'bn' => 'মডারেশনের অপেক্ষায় রিভিউ'], $idx('reviews', ['f[status]' => 'review']), 'star');
        $add('bookings.view', Booking::whereIn('status', ['partial'])->whereNotNull('travel_start')->where('travel_start', '<=', now()->addDays(21)->toDateString())->count(), ['en' => 'Part-paid trips departing within 21 days', 'bn' => '২১ দিনের মধ্যে যাত্রা, আংশিক পরিশোধিত'], $idx('bookings', ['f[status]' => 'partial']), 'hourglass');

        return $items;
    }

    private function chart(CarbonImmutable $now, bool $finance): array
    {
        $from = $now->subDays(29)->startOfDay();
        // timestamps are stored in the app timezone (Asia/Dhaka)
        $b = Booking::where('created_at', '>=', $from)->selectRaw('DATE(created_at) d, count(*) c')->groupBy('d')->pluck('c', 'd');
        $p = $finance ? Payment::where('status', 'success')->where('paid_at', '>=', $from)->selectRaw('DATE(paid_at) d, sum(amount) s')->groupBy('d')->pluck('s', 'd') : collect();
        $days = [];
        for ($i = 0; $i < 30; $i++) {
            $d = $from->addDays($i)->toDateString();
            $days[] = ['date' => $d, 'bookings' => (int) ($b[$d] ?? 0), 'revenue' => $finance ? (float) ($p[$d] ?? 0) : null];
        }

        return $days;
    }

    /** Global search box (top bar): bookings, customers and every module the person may open. */
    public function search(Request $r): JsonResponse
    {
        $term = trim((string) $r->query('q'));
        if (mb_strlen($term) < 2) {
            return response()->json(['results' => []]);
        }
        $u = $r->user();
        $out = [];
        $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $term).'%';
        if ($u->can('bookings.view')) {
            foreach (Booking::where(fn ($q) => $q->where('ref', 'like', $like)->orWhere('contact', 'like', $like)->orWhere('title', 'like', $like))->latest()->limit(5)->get() as $b) {
                $out[] = ['group' => tr_pick(['en' => 'Bookings', 'bn' => 'বুকিং']), 'title' => $b->ref.' · '.$b->tr('title'), 'sub' => $b->contact['name'] ?? '', 'href' => route('admin.bookings.show', $b->id, false), 'icon' => 'briefcase'];
            }
        }
        foreach (['customers', 'tours', 'destinations', 'cruises', 'activities', 'hotels', 'visa-products', 'visa-applications', 'blog-posts', 'pages', 'tickets', 'inquiries', 'leads', 'coupons', 'staff'] as $slug) {
            $res = Registry::get($slug);
            if (! $res || ! $res->can($u, 'view')) {
                continue;
            }
            $q = $res->query();
            $res->applySearch($q, $term);
            foreach ($q->limit(4)->get() as $m) {
                $out[] = ['group' => tr_pick($res->label), 'title' => $res->title($m), 'sub' => '', 'href' => $res->link($m) ?? route('admin.resource.'.($res->editable && $res->can($u, 'manage') ? 'edit' : 'show'), [$slug, $m->getKey()], false), 'icon' => $res->icon];
            }
            if (count($out) >= 30) {
                break;
            }
        }

        return response()->json(['results' => $out]);
    }
}
