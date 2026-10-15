<?php

namespace App\Support;

use App\Models;

/**
 * Admin CRUD definitions. Field: [type, label, rules?, options?]
 * Types: text, textarea, number, checkbox, select, date, datetime, image, lines (one per line → JSON array),
 *        tr / trtext / trlines (translatable: one input per enabled language – EN/BN/AR).
 */
class AdminResources
{
    public static function all(): array
    {
        $pk = fn () => Models\Package::orderBy('type')->get()->mapWithKeys(fn ($p) => [$p->id => $p->getTranslations('title')['en'] ?? $p->slug])->all();

        return [
            'packages' => ['model' => Models\Package::class, 'label' => 'Packages', 'icon' => '🕋', 'order' => 'type', 'search' => 'slug',
                'columns' => ['title' => 'Title', 'type' => 'Type', 'class' => 'Class', 'price_from' => 'From ৳', 'departure_date' => 'Departure', 'status' => 'Status'],
                'fields' => [
                    'title' => ['tr', 'Title', 'required'], 'slug' => ['text', 'Slug (blank = auto)'],
                    'type' => ['select', 'Type', 'required', Models\Package::TYPES], 'class' => ['select', 'Class', 'required', Models\Package::CLASSES],
                    'summary' => ['trtext', 'Summary'], 'description' => ['trtext', 'Description'],
                    'inclusions' => ['trlines', 'Included (one per line)'], 'exclusions' => ['trlines', 'Not included (one per line)'],
                    'duration_days' => ['number', 'Duration (days)', 'required'], 'departure_city' => ['text', 'Departure city'], 'departure_date' => ['date', 'Departure date'], 'return_date' => ['date', 'Return date'],
                    'season_year' => ['number', 'Season year'], 'hijri_year' => ['text', 'Hijri year'],
                    'makkah_distance_m' => ['number', 'Makkah hotel → Haram (m)'], 'madinah_distance_m' => ['number', 'Madinah hotel → Haram (m)'], 'airline' => ['text', 'Airline'],
                    'seats_total' => ['number', 'Seats total'], 'seats_sold' => ['number', 'Seats sold'], 'price_from' => ['number', 'Price from (৳, for listings)', 'required'],
                    'rating' => ['number', 'Rating'], 'reviews_count' => ['number', 'Review count'], 'image' => ['image', 'Cover image'],
                    'is_featured' => ['checkbox', 'Featured on home'], 'status' => ['select', 'Status', 'required', ['published' => 'Published', 'draft' => 'Draft', 'closed' => 'Closed']],
                ]],
            'prices' => ['model' => Models\PackagePrice::class, 'label' => 'Package prices', 'icon' => '💲', 'order' => 'package_id', 'with' => 'package',
                'columns' => ['package.title' => 'Package', 'room_type' => 'Room', 'price' => 'Price ৳', 'b2b_price' => 'B2B ৳', 'deposit_amount' => 'Deposit ৳'],
                'fields' => [
                    'package_id' => ['select', 'Package', 'required', $pk], 'room_type' => ['select', 'Room type', 'required', Models\PackagePrice::ROOM_TYPES],
                    'price' => ['number', 'Price per person (৳)', 'required'], 'b2b_price' => ['number', 'Agent net price (৳)'], 'deposit_amount' => ['number', 'Deposit per person (৳)'],
                    'installment_plan.due_dates' => ['lines', 'Installment due dates (YYYY-MM-DD, one per line)'], 'valid_from' => ['date', 'Valid from'], 'valid_to' => ['date', 'Valid to'],
                ]],
            'hotels' => ['model' => Models\Hotel::class, 'label' => 'Hotels', 'icon' => '🏨', 'order' => 'distance_to_haram_m', 'search' => 'name',
                'columns' => ['name' => 'Name', 'city' => 'City', 'stars' => '★', 'distance_to_haram_m' => 'To Haram (m)', 'price_per_night' => 'Night ৳'],
                'fields' => ['name' => ['text', 'Name', 'required'], 'city' => ['select', 'City', 'required', Models\Hotel::CITIES], 'stars' => ['number', 'Stars', 'required'],
                    'distance_to_haram_m' => ['number', 'Walking distance to Haram (m)', 'required'], 'address' => ['text', 'Address'], 'price_per_night' => ['number', 'Price per night (৳)'],
                    'amenities' => ['lines', 'Amenities (one per line)'], 'supplier' => ['text', 'Supplier'], 'supplier_code' => ['text', 'Supplier code'], 'lat' => ['number', 'Latitude'], 'lng' => ['number', 'Longitude'],
                    'image' => ['image', 'Photo'], 'is_active' => ['checkbox', 'Active']]],
            'flights' => ['model' => Models\Flight::class, 'label' => 'Flights', 'icon' => '✈', 'order' => 'depart_at', 'search' => 'flight_no',
                'columns' => ['flight_no' => 'Flight', 'airline' => 'Airline', 'from_iata' => 'From', 'to_iata' => 'To', 'depart_at' => 'Departs', 'fare' => 'Fare ৳'],
                'fields' => ['airline' => ['text', 'Airline', 'required'], 'airline_code' => ['text', 'IATA code', 'required'], 'flight_no' => ['text', 'Flight no.', 'required'],
                    'from_iata' => ['text', 'From (IATA)', 'required'], 'to_iata' => ['text', 'To (IATA)', 'required'], 'via_iata' => ['text', 'Via (IATA)'], 'stops' => ['number', 'Stops'],
                    'depart_at' => ['datetime', 'Departure', 'required'], 'arrive_at' => ['datetime', 'Arrival', 'required'], 'duration_min' => ['number', 'Duration (min)', 'required'],
                    'fare' => ['number', 'Fare (৳)', 'required'], 'baggage' => ['text', 'Baggage'], 'cabin' => ['text', 'Cabin'], 'seats_block' => ['number', 'Block seats'], 'pnr_group' => ['text', 'Group PNR'], 'is_active' => ['checkbox', 'Active']]],
            'visa-types' => ['model' => Models\VisaType::class, 'label' => 'Visa services', 'icon' => '🛂', 'order' => 'sort',
                'columns' => ['name' => 'Name', 'country' => 'Country', 'processing_time' => 'Time', 'fee' => 'Fee ৳'],
                'fields' => ['name' => ['tr', 'Name', 'required'], 'country' => ['text', 'Country', 'required'], 'flag' => ['text', 'Flag emoji'], 'processing_time' => ['text', 'Processing time', 'required'],
                    'fee' => ['number', 'Fee (৳)', 'required'], 'provider' => ['select', 'Provider', 'required', ['nusuk' => 'Nusuk', 'manual' => 'Manual', 'embassy' => 'Embassy']],
                    'requirements' => ['lines', 'Requirements (one per line)'], 'sort' => ['number', 'Sort'], 'is_active' => ['checkbox', 'Active']]],
            'agents' => ['model' => Models\Agent::class, 'label' => 'Agents (B2B)', 'icon' => '🤝', 'order' => 'code', 'search' => 'company_name',
                'columns' => ['code' => 'Code', 'company_name' => 'Company', 'city' => 'City', 'tier' => 'Tier', 'commission_percent' => 'Comm. %', 'wallet_balance' => 'Wallet ৳', 'status' => 'Status'],
                'fields' => ['code' => ['text', 'Agent code', 'required'], 'company_name' => ['text', 'Company', 'required'], 'city' => ['text', 'City'], 'licence_no' => ['text', 'Licence no.'],
                    'parent_id' => ['select', 'Parent agent', null, fn () => [''] + Models\Agent::pluck('company_name', 'id')->all()], 'user_id' => ['select', 'Login user', null, fn () => [''] + Models\User::where('role', 'agent')->pluck('email', 'id')->all()],
                    'tier' => ['select', 'Tier', 'required', Models\Agent::TIERS], 'commission_percent' => ['number', 'Commission %'], 'credit_limit' => ['number', 'Credit limit (৳)'], 'wallet_balance' => ['number', 'Wallet (৳)'],
                    'status' => ['select', 'Status', 'required', ['active' => 'Active', 'suspended' => 'Suspended']]]],
            'users' => ['model' => Models\User::class, 'label' => 'Users', 'icon' => '👥', 'order' => 'id', 'search' => 'name',
                'columns' => ['name' => 'Name', 'phone' => 'Phone', 'email' => 'Email', 'role' => 'Role', 'status' => 'Status'],
                'fields' => ['name' => ['text', 'Name', 'required'], 'phone' => ['text', 'Mobile'], 'email' => ['text', 'Email'], 'role' => ['select', 'Role', 'required', ['customer' => 'Customer', 'agent' => 'Agent', 'staff' => 'Staff', 'admin' => 'Admin']],
                    'status' => ['select', 'Status', 'required', ['active' => 'Active', 'blocked' => 'Blocked']], 'password' => ['password', 'New password (blank = keep)']]],
            'posts' => ['model' => Models\Post::class, 'label' => 'Blog posts', 'icon' => '📝', 'order' => 'published_at', 'dir' => 'desc',
                'columns' => ['title' => 'Title', 'category' => 'Category', 'published_at' => 'Published'],
                'fields' => ['title' => ['tr', 'Title', 'required'], 'slug' => ['text', 'Slug (blank = auto)'], 'category' => ['select', 'Category', 'required', ['news' => 'News & circulars', 'guide' => 'Hajj guide', 'umrah' => 'Umrah tips', 'payment' => 'Payment', 'travel' => 'Travel']],
                    'excerpt' => ['trtext', 'Excerpt'], 'body' => ['trtext', 'Body (HTML allowed)'], 'image' => ['image', 'Cover image'], 'read_minutes' => ['number', 'Read minutes'], 'published_at' => ['datetime', 'Publish at (blank = draft)']]],
            'faqs' => ['model' => Models\Faq::class, 'label' => 'FAQ', 'icon' => '❓', 'order' => 'sort',
                'columns' => ['question' => 'Question', 'category' => 'Category', 'sort' => 'Sort'],
                'fields' => ['question' => ['tr', 'Question', 'required'], 'answer' => ['trtext', 'Answer', 'required'], 'category' => ['select', 'Category', 'required', ['hajj' => 'Hajj', 'umrah' => 'Umrah', 'payment' => 'Payment', 'visa' => 'Visa', 'women' => 'Women']],
                    'sort' => ['number', 'Sort'], 'is_active' => ['checkbox', 'Active']]],
            'gallery' => ['model' => Models\GalleryItem::class, 'label' => 'Gallery', 'icon' => '🖼', 'order' => 'sort',
                'columns' => ['caption' => 'Caption', 'album' => 'Album', 'type' => 'Type'],
                'fields' => ['caption' => ['tr', 'Caption'], 'album' => ['select', 'Album', 'required', ['hajj-2025' => 'Hajj 2025', 'umrah' => 'Umrah', 'ziyarah' => 'Ziyarah', 'videos' => 'Videos']],
                    'type' => ['select', 'Type', 'required', ['image' => 'Image', 'video' => 'Video']], 'path' => ['image', 'Image / video thumbnail', 'required'], 'url' => ['text', 'Video URL'], 'sort' => ['number', 'Sort']]],
            'team' => ['model' => Models\TeamMember::class, 'label' => 'Guides & team', 'icon' => '🧕', 'order' => 'sort',
                'columns' => ['name' => 'Name', 'role' => 'Role', 'group' => 'Group'],
                'fields' => ['name' => ['tr', 'Name', 'required'], 'role' => ['tr', 'Role / title'], 'group' => ['select', 'Group', 'required', ['guide' => 'Guides & scholars (home)', 'leader' => 'Leadership (about)']],
                    'photo' => ['image', 'Photo'], 'sort' => ['number', 'Sort'], 'is_active' => ['checkbox', 'Active']]],
            'reviews' => ['model' => Models\Review::class, 'label' => 'Reviews', 'icon' => '⭐', 'order' => 'id', 'dir' => 'desc',
                'columns' => ['name' => 'Name', 'trip' => 'Trip', 'rating' => '★', 'status' => 'Status'],
                'fields' => ['name' => ['text', 'Name', 'required'], 'city' => ['text', 'City'], 'trip' => ['text', 'Trip (e.g. Hajj 2025)'], 'package_id' => ['select', 'Package', null, fn () => [''] + $pk()],
                    'rating' => ['number', 'Rating 1–5', 'required'], 'body' => ['textarea', 'Review', 'required'], 'status' => ['select', 'Status', 'required', ['approved' => 'Approved', 'pending' => 'Pending', 'hidden' => 'Hidden']]]],
            'branches' => ['model' => Models\Branch::class, 'label' => 'Branches', 'icon' => '📍', 'order' => 'sort',
                'columns' => ['name' => 'Name', 'phone' => 'Phone'],
                'fields' => ['name' => ['tr', 'Name', 'required'], 'address' => ['text', 'Address', 'required'], 'phone' => ['text', 'Phone'], 'lat' => ['number', 'Latitude'], 'lng' => ['number', 'Longitude'],
                    'is_head_office' => ['checkbox', 'Head office'], 'sort' => ['number', 'Sort']]],
        ];
    }

    public static function get(string $key): array
    {
        $r = self::all()[$key] ?? abort(404);
        foreach ($r['fields'] as $k => $f) {
            if (isset($f[3]) && $f[3] instanceof \Closure) {
                $r['fields'][$k][3] = ($f[3])();
            }
        }

        return $r;
    }
}
