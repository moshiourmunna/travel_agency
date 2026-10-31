<?php

namespace App\Http\Middleware;

use App\Admin\Registry;
use App\Models;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'admin.app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /** @return array<string, mixed> */
    public function share(Request $request): array
    {
        $u = $request->user();
        $staff = $u && $u->isStaff();

        return [
            ...parent::share($request),
            'locale' => app()->getLocale(),
            'app' => [
                'name' => 'Musafir',
                'frontend' => config('musafir.frontend_url'),
                'base' => '/'.trim(config('musafir.admin_path'), '/'),
                'env' => app()->environment(),
                'payment_mode' => config('musafir.payment_mode'),
            ],
            'auth' => $staff ? [
                'user' => ['id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'initials' => $u->initials(), 'title' => $u->title, 'role' => $u->getRoleNames()->first()],
                'permissions' => $u->getAllPermissions()->pluck('name')->values(),
            ] : null,
            'nav' => fn () => $staff ? Registry::nav($u, $this->badges($u)) : [],
            'flash' => fn () => array_filter([
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                'warning' => $request->session()->get('warning'),
                'revalidated' => $request->session()->get('revalidated'),
            ]),
        ];
    }

    /** Sidebar counters (cached 60 s). */
    private function badges($u): array
    {
        return Cache::remember('admin.badges', 60, fn () => [
            'bookings' => Models\Booking::where('status', 'pending')->count() ?: null,
            'inquiries' => Models\Inquiry::where('status', 'new')->count() ?: null,
            'payments' => Models\Payment::where('status', 'pending')->where('gateway', 'bank_transfer')->count() ?: null,
            'refunds' => Models\Refund::whereIn('status', ['requested', 'approved'])->count() ?: null,
            'reviews' => Models\Review::where('status', 'review')->count() ?: null,
            'tickets' => Models\SupportTicket::where('status', 'open')->count() ?: null,
            'visa-applications' => Models\VisaApplication::whereNotIn('stage', ['approved', 'rejected', 'delivered'])->count() ?: null,
            'documents' => Models\Document::where('status', 'pending')->count() ?: null,
        ]);
    }
}
