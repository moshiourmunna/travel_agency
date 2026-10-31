<?php

namespace App\Admin;

use App\Admin\Resources as R;
use App\Models\User;

/** All admin modules and the sidebar navigation (filtered by the signed-in user's permissions). */
final class Registry
{
    /** @var list<class-string<Resource>> */
    public const RESOURCES = [
        // Sales
        R\BookingResource::class, R\InquiryResource::class, R\LeadResource::class, R\CustomerResource::class, R\PaymentResource::class, R\RefundResource::class,
        R\CouponResource::class, R\OfferResource::class, R\GiftCardResource::class,
        // Catalogue
        R\TourResource::class, R\DestinationResource::class, R\ThemeResource::class, R\CategoryResource::class, R\CruiseResource::class, R\CruiseLineResource::class, R\ShipResource::class,
        R\ActivityResource::class, R\ActivitySlotResource::class, R\HotelResource::class, R\AmenityResource::class, R\FlightOfferResource::class, R\AirlineResource::class, R\AirportResource::class,
        R\VisaProductResource::class, R\VisaDocumentSetResource::class, R\VisaApplicationResource::class, R\DocumentResource::class, R\InsurancePlanResource::class, R\GiftCardDesignResource::class,
        R\CancellationPolicyResource::class, R\PlannerCostResource::class, R\CountryResource::class, R\RegionResource::class,
        // Content
        R\PageResource::class, R\BlogPostResource::class, R\BlogCategoryResource::class, R\TagResource::class, R\FaqResource::class, R\FaqCategoryResource::class,
        R\TestimonialResource::class, R\ReviewResource::class, R\TeamMemberResource::class, R\StatResource::class, R\PartnerResource::class,
        R\JobPostResource::class, R\JobApplicationResource::class, R\GalleryAlbumResource::class, R\SeoMetaResource::class, R\RedirectResource::class, R\NewsletterResource::class,
        // Organisation
        R\StaffResource::class, R\TicketResource::class, R\AgentResource::class, R\NotificationTemplateResource::class, R\LoyaltyTierResource::class,
        R\CurrencyResource::class, R\LanguageResource::class, R\ActivityLogResource::class,
    ];

    /** @var array<string, Resource>|null */
    private static ?array $cache = null;

    /** @return array<string, Resource> */
    public static function all(): array
    {
        if (self::$cache === null) {
            self::$cache = [];
            foreach (self::RESOURCES as $class) {
                $r = new $class;
                self::$cache[$r->slug] = $r;
            }
        }

        return self::$cache;
    }

    public static function get(string $slug): ?Resource
    {
        return self::all()[$slug] ?? null;
    }

    /** Sidebar: groups => items (only what the user may open). */
    public static function nav(User $u, array $badges = []): array
    {
        $r = fn (string $slug) => ['res' => $slug];
        $p = fn (string $route, string $icon, array $label, string $perm, array $extra = []) => ['route' => $route, 'icon' => $icon, 'label' => $label, 'perm' => $perm] + $extra;
        $groups = [
            ['label' => null, 'items' => [
                $p('admin.dashboard', 'layout-dashboard', ['en' => 'Dashboard', 'bn' => 'ড্যাশবোর্ড'], 'admin.access'),
            ]],
            ['label' => ['en' => 'Sales', 'bn' => 'বিক্রয়'], 'items' => [$r('bookings'), $r('inquiries'), $r('leads'), $r('customers'), $r('payments'), $r('refunds'), $r('coupons'), $r('offers'), $r('gift-cards')]],
            ['label' => ['en' => 'Catalog', 'bn' => 'ক্যাটালগ'], 'items' => [$r('tours'), $r('destinations'), $r('themes'), $r('categories'), $r('cruises'), $r('cruise-lines'), $r('ships'), $r('activities'), $r('activity-slots'),
                $r('hotels'), $r('amenities'), $r('flight-offers'), $r('airlines'), $r('airports'), $r('insurance-plans'), $r('gift-card-designs'), $r('cancellation-policies'), $r('planner-costs'), $r('countries'), $r('regions')]],
            ['label' => ['en' => 'Visa desk', 'bn' => 'ভিসা ডেস্ক'], 'items' => [$r('visa-applications'), $r('documents'), $r('visa-products'), $r('visa-document-sets')]],
            ['label' => ['en' => 'Content', 'bn' => 'কনটেন্ট'], 'items' => [
                $r('pages'),
                $p('admin.menus', 'menu', ['en' => 'Menus', 'bn' => 'মেনু'], 'menus.manage'),
                $p('admin.media', 'image', ['en' => 'Media library', 'bn' => 'মিডিয়া লাইব্রেরি'], 'content.view|catalog.manage'),
                $r('blog-posts'), $r('blog-categories'), $r('tags'), $r('faqs'), $r('faq-categories'), $r('reviews'), $r('testimonials'), $r('team'), $r('stats'), $r('partners'),
                $r('jobs'), $r('job-applications'), $r('gallery'),
                $p('admin.translations', 'languages', ['en' => 'Translations (UI text)', 'bn' => 'অনুবাদ (ইউআই লেখা)'], 'translations.manage'),
                $r('seo'), $r('redirects'), $r('newsletter'),
            ]],
            ['label' => ['en' => 'Organisation', 'bn' => 'প্রতিষ্ঠান'], 'items' => [
                $r('tickets'), $r('agents'), $r('staff'),
                $p('admin.roles', 'shield-check', ['en' => 'Roles & permissions', 'bn' => 'রোল ও অনুমতি'], 'roles.manage'),
                $r('notification-templates'), $r('loyalty-tiers'), $r('currencies'), $r('languages'),
                $p('admin.settings', 'settings', ['en' => 'Settings', 'bn' => 'সেটিংস'], 'settings.manage'),
                $r('activity-log'),
            ]],
        ];
        $out = [];
        foreach ($groups as $g) {
            $items = [];
            foreach ($g['items'] as $it) {
                if (isset($it['res'])) {
                    $res = self::get($it['res']);
                    if (! $res || ! $res->can($u, 'view')) {
                        continue;
                    }
                    $items[] = ['key' => $res->slug, 'label' => tr_pick($res->label), 'icon' => $res->icon, 'href' => route('admin.resource.index', $res->slug, false), 'badge' => $badges[$res->slug] ?? null];
                } elseif (collect(explode('|', $it['perm']))->contains(fn ($perm) => $u->can($perm))) { // 'a|b' = any of
                    $items[] = ['key' => $it['route'], 'label' => tr_pick($it['label']), 'icon' => $it['icon'], 'href' => route($it['route'], [], false), 'badge' => $badges[$it['route']] ?? null];
                }
            }
            if ($items) {
                $out[] = ['label' => $g['label'] ? tr_pick($g['label']) : null, 'items' => $items];
            }
        }

        return $out;
    }
}
