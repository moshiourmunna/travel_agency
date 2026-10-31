<?php

namespace App\Support;

use App\Models;
use Illuminate\Database\Eloquent\Model;

/**
 * Which Next.js cache tags show a given record (see frontend lib/api.ts calls). Saving or deleting any of
 * these models from the admin purges exactly those tags via App\Support\Revalidator.
 */
final class CacheTags
{
    /** Models whose changes are visible on the public site. */
    public const MODELS = [
        Models\Tour::class, Models\TourItineraryDay::class, Models\TourDeparture::class, Models\TourPriceTier::class, Models\TourAddon::class,
        Models\Destination::class, Models\Theme::class, Models\Category::class, Models\Region::class, Models\Country::class, Models\CancellationPolicy::class,
        Models\Cruise::class, Models\CruiseCabin::class, Models\CruiseSailing::class, Models\CruisePortOfCall::class, Models\CruiseLine::class, Models\Ship::class,
        Models\Activity::class, Models\ActivityOption::class, Models\ActivitySlot::class,
        Models\Hotel::class, Models\HotelRoomType::class, Models\HotelRate::class, Models\Amenity::class,
        Models\Airline::class, Models\Airport::class, Models\FlightOffer::class,
        Models\VisaProduct::class, Models\VisaRequirement::class, Models\VisaDocumentSet::class,
        Models\InsurancePlan::class, Models\GiftCardDesign::class, Models\Offer::class, Models\PlannerCost::class, Models\Currency::class, Models\Language::class, Models\LoyaltyTier::class,
        Models\Page::class, Models\PageSection::class, Models\Menu::class, Models\MenuItem::class, Models\Banner::class, Models\Faq::class, Models\FaqCategory::class,
        Models\Testimonial::class, Models\TeamMember::class, Models\Stat::class, Models\Partner::class, Models\BlogPost::class, Models\BlogCategory::class, Models\Tag::class,
        Models\JobPost::class, Models\GalleryAlbum::class, Models\GalleryItem::class, Models\Review::class, Models\SeoMeta::class, Models\Redirect::class,
        Models\Translation::class, Models\Setting::class, Models\MediaAsset::class,
    ];

    /** @return list<string> */
    public static function for(Model $m): array
    {
        $slug = fn (string $class, $id) => $id ? $class::withoutGlobalScopes()->whereKey($id)->value('slug') : null;
        $one = fn (string $prefix, ?string $s) => $s ? ["{$prefix}:{$s}"] : [];
        $orig = fn (string $k) => $m->getOriginal($k);
        $slugTags = function (string $prefix) use ($m) { // current + previous slug (a renamed page must drop its old URL)
            return array_values(array_unique(array_filter([$m->getAttribute('slug') ? "{$prefix}:".$m->getAttribute('slug') : null, $m->getOriginal('slug') ? "{$prefix}:".$m->getOriginal('slug') : null])));
        };

        $tags = match (true) {
            $m instanceof Models\Tour => ['tours', 'page:home', 'destinations', 'themes', ...$slugTags('tour'), ...$one('destination', $slug(Models\Destination::class, $m->destination_id))],
            $m instanceof Models\TourItineraryDay, $m instanceof Models\TourDeparture, $m instanceof Models\TourPriceTier, $m instanceof Models\TourAddon => ['tours', ...$one('tour', $slug(Models\Tour::class, $m->tour_id))],
            $m instanceof Models\Destination => ['destinations', 'tours', 'activities', 'planner', 'page:home', ...$slugTags('destination')],
            $m instanceof Models\Theme => ['themes', 'tours', 'page:home', ...$slugTags('theme')],
            $m instanceof Models\Category => ['themes', 'tours', 'activities', 'page:home', 'site'],
            $m instanceof Models\Region, $m instanceof Models\Country => ['destinations', 'tours', 'visas', 'airports', 'site'],
            $m instanceof Models\CancellationPolicy => ['tours', 'cruises', 'activities', 'hotels'],
            $m instanceof Models\Cruise => ['cruises', 'page:home', ...$slugTags('cruise')],
            $m instanceof Models\CruiseCabin, $m instanceof Models\CruiseSailing, $m instanceof Models\CruisePortOfCall => ['cruises', ...$one('cruise', $slug(Models\Cruise::class, $m->cruise_id))],
            $m instanceof Models\CruiseLine, $m instanceof Models\Ship => ['cruises'],
            $m instanceof Models\Activity => ['activities', 'page:home', 'planner', ...$slugTags('activity')],
            $m instanceof Models\ActivityOption, $m instanceof Models\ActivitySlot => ['activities', ...$one('activity', $slug(Models\Activity::class, $m->activity_id))],
            $m instanceof Models\Hotel => ['hotels', ...$slugTags('hotel')],
            $m instanceof Models\HotelRoomType => ['hotels', ...$one('hotel', $slug(Models\Hotel::class, $m->hotel_id))],
            $m instanceof Models\HotelRate => ['hotels'],
            $m instanceof Models\Amenity => ['hotels'],
            $m instanceof Models\Airline, $m instanceof Models\Airport, $m instanceof Models\FlightOffer => ['flights', 'airports', 'page:home', 'site'],
            $m instanceof Models\VisaProduct => ['visas', ...$slugTags('visa')],
            $m instanceof Models\VisaRequirement => ['visas', ...$one('visa', $slug(Models\VisaProduct::class, $m->visa_product_id))],
            $m instanceof Models\VisaDocumentSet => ['visas'],
            $m instanceof Models\InsurancePlan => ['insurance'],
            $m instanceof Models\GiftCardDesign => ['gift-cards'],
            $m instanceof Models\Offer => ['offers', 'page:home'],
            $m instanceof Models\PlannerCost => ['planner'],
            $m instanceof Models\Currency, $m instanceof Models\Language, $m instanceof Models\LoyaltyTier => ['site'],
            $m instanceof Models\Page => ['pages', 'seo', ...$slugTags('page')],
            $m instanceof Models\PageSection => ['pages', ...$one('page', $slug(Models\Page::class, $m->page_id))],
            $m instanceof Models\Menu, $m instanceof Models\MenuItem => ['menus', 'site'],
            $m instanceof Models\Banner => ['pages', 'site', 'offers'],
            $m instanceof Models\Faq, $m instanceof Models\FaqCategory => ['faqs', 'page:home', 'visas'],
            $m instanceof Models\Testimonial => ['reviews', 'page:home', 'pages'],
            $m instanceof Models\TeamMember => ['team', 'pages'],
            $m instanceof Models\Stat, $m instanceof Models\Partner => ['site', 'page:home', 'pages'],
            $m instanceof Models\BlogPost => ['posts', 'page:home', ...$slugTags('post')],
            $m instanceof Models\BlogCategory, $m instanceof Models\Tag => ['posts'],
            $m instanceof Models\JobPost => ['careers'],
            $m instanceof Models\GalleryAlbum, $m instanceof Models\GalleryItem => ['gallery'],
            $m instanceof Models\Review => ['reviews', 'page:home', ...self::reviewable($m)],
            $m instanceof Models\SeoMeta => ['seo', ...self::seoOwner($m)],
            $m instanceof Models\Redirect => ['redirects'],
            $m instanceof Models\Translation => ['translations'],
            $m instanceof Models\Setting => ['site', 'settings', 'page:home'],
            $m instanceof Models\MediaAsset => ['all'], // an image can appear anywhere
            default => [],
        };
        if (in_array(class_basename($m), ['Tour', 'Destination', 'Theme', 'Cruise', 'Activity', 'Hotel', 'VisaProduct', 'Page', 'BlogPost', 'SeoMeta', 'Redirect'], true)) {
            $tags[] = 'sitemap';
        }

        return array_values(array_unique($tags));
    }

    private static function reviewable(Models\Review $r): array
    {
        $map = [Models\Tour::class => 'tour', Models\Cruise::class => 'cruise', Models\Activity::class => 'activity', Models\Hotel::class => 'hotel'];
        $p = $map[$r->reviewable_type] ?? null;
        if (! $p || ! $r->reviewable_id) {
            return [];
        }
        $s = ($r->reviewable_type)::withoutGlobalScopes()->whereKey($r->reviewable_id)->value('slug');

        return $s ? ["{$p}:{$s}", $p === 'activity' ? 'activities' : "{$p}s"] : [];
    }

    private static function seoOwner(Models\SeoMeta $s): array
    {
        if (! $s->seoable_type || ! $s->seoable_id || ! class_exists($s->seoable_type)) {
            return ['pages'];
        }
        $owner = ($s->seoable_type)::withoutGlobalScopes()->find($s->seoable_id);

        return $owner ? self::for($owner) : [];
    }
}
