<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** C. Catalogue: geo, destinations, themes, tours, cruises, activities, hotels, flights, visas, offers, coupons. */
return new class extends Migration
{
    /** Common publishing columns for public catalogue entities. */
    private function publishable(Blueprint $t): void
    {
        $t->string('status', 16)->default('published')->index(); // draft | published | archived
        $t->boolean('is_featured')->default(false)->index();
        $t->unsignedSmallInteger('sort')->default(0);
        $t->timestamp('published_at')->nullable();
        $t->text('search_text')->nullable(); // EN + BN text maintained by the model, FULLTEXT (ngram)
        $t->timestamps();
        $t->softDeletes();
    }

    private function fulltext(string $table): void
    {
        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE `{$table}` ADD FULLTEXT `{$table}_search_ft` (`search_text`) WITH PARSER ngram");
        }
    }

    public function up(): void
    {
        Schema::create('regions', function (Blueprint $t) {
            $t->id();
            $t->string('code', 24)->unique(); // bd | intl | asia | gulf | europe
            $t->json('name');
            $t->unsignedSmallInteger('sort')->default(0);
            $t->timestamps();
        });

        Schema::create('countries', function (Blueprint $t) {
            $t->id();
            $t->char('iso2', 2)->unique();
            $t->json('name');
            $t->string('flag', 16)->nullable();
            $t->string('currency', 3)->nullable();
            $t->string('dial_code', 8)->nullable();
            $t->foreignId('region_id')->nullable()->constrained()->nullOnDelete();
            $t->json('visa_note')->nullable();
            $t->timestamps();
        });

        Schema::create('categories', function (Blueprint $t) {
            $t->id();
            $t->string('slug', 40)->unique();
            $t->string('icon', 40)->nullable();
            $t->json('name');
            $t->unsignedSmallInteger('sort')->default(0);
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        Schema::create('categorizables', function (Blueprint $t) {
            $t->foreignId('category_id')->constrained()->cascadeOnDelete();
            $t->morphs('categorizable');
            $t->primary(['category_id', 'categorizable_id', 'categorizable_type'], 'categorizables_pk');
        });

        Schema::create('destinations', function (Blueprint $t) {
            $t->id();
            $t->ulid('ulid')->unique();
            $t->string('slug', 120)->unique();
            $t->foreignId('country_id')->nullable()->constrained()->nullOnDelete();
            $t->string('region', 24)->index(); // bd | intl
            $t->json('name');
            $t->json('country_name')->nullable();
            $t->json('tagline')->nullable();
            $t->json('description')->nullable();
            $t->json('best_time')->nullable();
            $t->json('visa_info')->nullable();
            $t->string('currency', 24)->nullable();
            $t->json('flight_time')->nullable();
            $t->json('things_to_do')->nullable(); // [{en,bn}]
            $t->decimal('lat', 10, 7)->nullable();
            $t->decimal('lng', 10, 7)->nullable();
            $t->foreignId('image_id')->nullable()->constrained('media_assets')->nullOnDelete();
            $t->json('gallery')->nullable(); // [media_asset_id]
            $t->unsignedSmallInteger('tours_count_display')->nullable();
            $this->publishable($t);
        });

        Schema::create('themes', function (Blueprint $t) {
            $t->id();
            $t->string('slug', 80)->unique();
            $t->string('category_slug', 40)->nullable(); // tours in this category are listed on the theme page
            $t->string('icon', 40)->nullable();
            $t->json('name');
            $t->json('tagline')->nullable();
            $t->json('description')->nullable();
            $t->json('perks')->nullable();
            $t->foreignId('image_id')->nullable()->constrained('media_assets')->nullOnDelete();
            $this->publishable($t);
        });

        Schema::create('cancellation_policies', function (Blueprint $t) {
            $t->id();
            $t->string('code', 24)->unique();
            $t->string('kind', 12); // free | partial | none
            $t->json('name');
            $t->json('description')->nullable();
            $t->json('rules'); // [{"days_before": 7, "refund_pct": 100}, ...] sorted desc
            $t->timestamps();
        });

        Schema::create('tours', function (Blueprint $t) {
            $t->id();
            $t->ulid('ulid')->unique();
            $t->string('slug', 160)->unique();
            $t->foreignId('destination_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('cancellation_policy_id')->nullable()->constrained()->nullOnDelete();
            $t->string('region', 24)->index();
            $t->json('title');
            $t->json('location')->nullable();     // "Cox's Bazar"
            $t->json('country_name')->nullable(); // "Bangladesh"
            $t->json('summary')->nullable();
            $t->json('description')->nullable();  // overview paragraph
            $t->json('highlights')->nullable();
            $t->json('inclusions')->nullable();
            $t->json('exclusions')->nullable();
            $t->json('route_stops')->nullable();  // [{en,bn}] for the route map
            $t->unsignedSmallInteger('days');
            $t->unsignedSmallInteger('nights');
            $t->string('group_size', 16)->nullable();
            $t->decimal('price_from', 12, 2);
            $t->decimal('price_was', 12, 2)->nullable();
            $t->json('badge')->nullable();
            $t->boolean('includes_flight')->default(false);
            $t->boolean('includes_visa')->default(false);
            $t->decimal('rating', 2, 1)->default(0);
            $t->unsignedInteger('reviews_count')->default(0);
            $t->unsignedSmallInteger('booked_this_week')->default(0);
            $t->foreignId('image_id')->nullable()->constrained('media_assets')->nullOnDelete();
            $t->json('gallery')->nullable();
            $this->publishable($t);
            $t->index(['region', 'status', 'price_from']);
        });

        Schema::create('tour_itinerary_days', function (Blueprint $t) {
            $t->id();
            $t->foreignId('tour_id')->constrained()->cascadeOnDelete();
            $t->unsignedSmallInteger('day_no');
            $t->json('title');
            $t->json('body')->nullable();
            $t->json('meals')->nullable();
            $t->json('stay')->nullable();
            $t->timestamps();
            $t->unique(['tour_id', 'day_no']);
        });

        Schema::create('tour_departures', function (Blueprint $t) {
            $t->id();
            $t->foreignId('tour_id')->constrained()->cascadeOnDelete();
            $t->date('date');
            $t->date('return_date')->nullable();
            $t->unsignedSmallInteger('seats_total')->default(20);
            $t->unsignedSmallInteger('seats_held')->default(0);
            $t->decimal('price', 12, 2);
            $t->string('status', 16)->default('open'); // open | guaranteed | closed | cancelled
            $t->timestamps();
            $t->index(['tour_id', 'date']);
        });

        Schema::create('tour_price_tiers', function (Blueprint $t) {
            $t->id();
            $t->foreignId('tour_id')->constrained()->cascadeOnDelete();
            $t->string('code', 24); // twin | triple | single (Pricer + commerce.room_factors)
            $t->json('label');
            $t->decimal('price', 12, 2)->nullable();
            $t->decimal('factor', 5, 3)->nullable(); // multiplier of the departure price
            $t->unsignedSmallInteger('sort')->default(0);
            $t->timestamps();
        });

        Schema::create('tour_addons', function (Blueprint $t) {
            $t->id();
            $t->foreignId('tour_id')->nullable()->constrained()->cascadeOnDelete(); // null = global add-on
            $t->string('code', 32);
            $t->json('label');
            $t->decimal('price', 12, 2);
            $t->string('per', 12)->default('person'); // person | booking
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        Schema::create('cruise_lines', function (Blueprint $t) {
            $t->id();
            $t->string('slug', 80)->unique();
            $t->string('name');
            $t->timestamps();
        });

        Schema::create('ships', function (Blueprint $t) {
            $t->id();
            $t->foreignId('cruise_line_id')->nullable()->constrained()->nullOnDelete();
            $t->string('slug', 80)->unique();
            $t->string('name');
            $t->json('facts')->nullable();
            $t->timestamps();
        });

        Schema::create('cruises', function (Blueprint $t) {
            $t->id();
            $t->ulid('ulid')->unique();
            $t->string('slug', 160)->unique();
            $t->foreignId('ship_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('cancellation_policy_id')->nullable()->constrained()->nullOnDelete();
            $t->string('region', 24)->index();
            $t->json('title');
            $t->json('description')->nullable();
            $t->unsignedSmallInteger('nights');
            $t->json('depart_port')->nullable();
            $t->json('route')->nullable(); // [{en,bn}] ports
            $t->json('cabin_from')->nullable();
            $t->json('highlights')->nullable();
            $t->decimal('price_from', 12, 2);
            $t->decimal('price_was', 12, 2)->nullable();
            $t->json('badge')->nullable();
            $t->decimal('rating', 2, 1)->default(0);
            $t->unsignedInteger('reviews_count')->default(0);
            $t->date('next_departure')->nullable();
            $t->foreignId('image_id')->nullable()->constrained('media_assets')->nullOnDelete();
            $t->json('gallery')->nullable();
            $this->publishable($t);
        });

        Schema::create('cruise_sailings', function (Blueprint $t) {
            $t->id();
            $t->foreignId('cruise_id')->constrained()->cascadeOnDelete();
            $t->date('date');
            $t->date('return_date')->nullable();
            $t->decimal('price', 12, 2);
            $t->unsignedSmallInteger('seats_total')->default(40);
            $t->unsignedSmallInteger('seats_held')->default(0);
            $t->string('status', 16)->default('open');
            $t->timestamps();
            $t->index(['cruise_id', 'date']);
        });

        Schema::create('cruise_cabins', function (Blueprint $t) {
            $t->id();
            $t->foreignId('cruise_id')->constrained()->cascadeOnDelete();
            $t->string('code', 24); // inside | ocean | balcony | suite
            $t->json('name');
            $t->json('description')->nullable();
            $t->decimal('price', 12, 2);
            $t->unsignedTinyInteger('capacity')->default(2);
            $t->unsignedSmallInteger('sort')->default(0);
            $t->timestamps();
        });

        Schema::create('cruise_ports_of_call', function (Blueprint $t) {
            $t->id();
            $t->foreignId('cruise_id')->constrained()->cascadeOnDelete();
            $t->unsignedSmallInteger('day_no');
            $t->json('port');
            $t->json('body')->nullable();
            $t->string('arrive', 8)->nullable();
            $t->string('depart', 8)->nullable();
            $t->timestamps();
        });

        Schema::create('activities', function (Blueprint $t) {
            $t->id();
            $t->ulid('ulid')->unique();
            $t->string('slug', 160)->unique();
            $t->foreignId('destination_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('cancellation_policy_id')->nullable()->constrained()->nullOnDelete();
            $t->string('category', 24)->index(); // tour | water | adventure | tickets | food | transfer
            $t->string('region', 24)->index();
            $t->json('title');
            $t->json('city')->nullable();
            $t->json('description')->nullable();
            $t->json('duration_text')->nullable();
            $t->unsignedSmallInteger('duration_min')->nullable();
            $t->json('languages')->nullable();
            $t->json('meeting_point')->nullable();
            $t->boolean('pickup')->default(false);
            $t->boolean('instant_confirm')->default(true);
            $t->json('highlights')->nullable();
            $t->json('inclusions')->nullable();
            $t->decimal('price', 12, 2);
            $t->decimal('price_was', 12, 2)->nullable();
            $t->json('badge')->nullable();
            $t->decimal('rating', 2, 1)->default(0);
            $t->unsignedInteger('reviews_count')->default(0);
            $t->foreignId('image_id')->nullable()->constrained('media_assets')->nullOnDelete();
            $t->json('gallery')->nullable();
            $this->publishable($t);
        });

        Schema::create('activity_options', function (Blueprint $t) {
            $t->id();
            $t->foreignId('activity_id')->constrained()->cascadeOnDelete();
            $t->json('name');
            $t->json('description')->nullable();
            $t->decimal('price', 12, 2);
            $t->decimal('child_price', 12, 2)->nullable();
            $t->unsignedSmallInteger('sort')->default(0);
            $t->timestamps();
        });

        Schema::create('activity_slots', function (Blueprint $t) {
            $t->id();
            $t->foreignId('activity_id')->constrained()->cascadeOnDelete();
            $t->dateTime('starts_at');
            $t->unsignedSmallInteger('capacity')->default(20);
            $t->unsignedSmallInteger('booked')->default(0);
            $t->decimal('price', 12, 2)->nullable();
            $t->timestamps();
            $t->index(['activity_id', 'starts_at']);
        });

        Schema::create('amenities', function (Blueprint $t) {
            $t->id();
            $t->string('code', 32)->unique();
            $t->string('icon', 40)->nullable();
            $t->json('name');
            $t->timestamps();
        });

        Schema::create('hotels', function (Blueprint $t) {
            $t->id();
            $t->ulid('ulid')->unique();
            $t->string('slug', 160)->unique();
            $t->foreignId('destination_id')->nullable()->constrained()->nullOnDelete();
            $t->string('kind', 16)->default('hotel'); // hotel | resort | apartment
            $t->json('name');
            $t->json('city')->nullable();
            $t->json('address')->nullable();
            $t->json('description')->nullable();
            $t->unsignedTinyInteger('stars')->default(3);
            $t->json('distance_text')->nullable();
            $t->json('amenities')->nullable(); // [code]
            $t->boolean('refundable')->default(true);
            $t->boolean('breakfast')->default(false);
            $t->decimal('price_from', 12, 2);
            $t->decimal('price_was', 12, 2)->nullable();
            $t->decimal('guest_score', 3, 1)->default(0);
            $t->unsignedInteger('reviews_count')->default(0);
            $t->string('supplier', 32)->nullable();
            $t->string('supplier_code', 64)->nullable();
            $t->decimal('lat', 10, 7)->nullable();
            $t->decimal('lng', 10, 7)->nullable();
            $t->foreignId('image_id')->nullable()->constrained('media_assets')->nullOnDelete();
            $t->json('gallery')->nullable();
            $this->publishable($t);
        });

        Schema::create('hotel_room_types', function (Blueprint $t) {
            $t->id();
            $t->foreignId('hotel_id')->constrained()->cascadeOnDelete();
            $t->json('name');
            $t->json('description')->nullable();
            $t->json('features')->nullable();
            $t->unsignedTinyInteger('max_adults')->default(2);
            $t->unsignedTinyInteger('max_children')->default(1);
            $t->json('bed')->nullable();
            $t->unsignedSmallInteger('size_sqm')->nullable();
            $t->decimal('price', 12, 2);
            $t->boolean('refundable')->default(true);
            $t->boolean('breakfast')->default(false);
            $t->unsignedSmallInteger('sort')->default(0);
            $t->timestamps();
        });

        Schema::create('hotel_rates', function (Blueprint $t) {
            $t->id();
            $t->foreignId('hotel_room_type_id')->constrained()->cascadeOnDelete();
            $t->date('starts_on');
            $t->date('ends_on');
            $t->decimal('price', 12, 2);
            $t->unsignedSmallInteger('allotment')->default(5);
            $t->timestamps();
        });

        Schema::create('airlines', function (Blueprint $t) {
            $t->id();
            $t->string('code', 3)->unique();
            $t->string('name');
            $t->string('color', 16)->nullable();
            $t->foreignId('logo_id')->nullable()->constrained('media_assets')->nullOnDelete();
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        Schema::create('airports', function (Blueprint $t) {
            $t->id();
            $t->char('iata', 3)->unique();
            $t->json('name');
            $t->json('city');
            $t->foreignId('country_id')->nullable()->constrained()->nullOnDelete();
            $t->boolean('is_popular')->default(false);
            $t->timestamps();
        });

        Schema::create('flight_offers', function (Blueprint $t) {
            $t->id();
            $t->foreignId('airline_id')->constrained()->restrictOnDelete();
            $t->char('origin', 3)->index();
            $t->char('destination', 3)->index();
            $t->string('flight_no', 16);
            $t->string('dep_time', 5);
            $t->string('arr_time', 5);
            $t->unsignedSmallInteger('duration_min');
            $t->unsignedTinyInteger('stops')->default(0);
            $t->json('via')->nullable();
            $t->string('cabin', 16)->default('economy');
            $t->decimal('fare', 12, 2);
            $t->string('baggage', 16)->nullable();
            $t->boolean('refundable')->default(false);
            $t->unsignedSmallInteger('seats')->default(9);
            $t->boolean('is_active')->default(true);
            $t->timestamps();
            $t->index(['origin', 'destination', 'cabin']);
        });

        Schema::create('visa_document_sets', function (Blueprint $t) {
            $t->id();
            $t->string('code', 24)->unique(); // general | job | business | student
            $t->json('name');
            $t->json('items'); // [{en,bn}]
            $t->unsignedSmallInteger('sort')->default(0);
            $t->timestamps();
        });

        Schema::create('visa_products', function (Blueprint $t) {
            $t->id();
            $t->ulid('ulid')->unique();
            $t->string('slug', 120)->unique();
            $t->foreignId('country_id')->nullable()->constrained()->nullOnDelete();
            $t->json('country_name');
            $t->string('flag', 16)->nullable();
            $t->json('type');
            $t->json('processing');
            $t->decimal('fee', 12, 2);
            $t->json('validity')->nullable();
            $t->json('stay')->nullable();
            $t->json('entry')->nullable();
            $t->json('description')->nullable();
            $t->json('extra_documents')->nullable(); // [{en,bn}]
            $t->foreignId('image_id')->nullable()->constrained('media_assets')->nullOnDelete();
            $this->publishable($t);
        });

        Schema::create('visa_requirements', function (Blueprint $t) {
            $t->id();
            $t->foreignId('visa_product_id')->constrained()->cascadeOnDelete();
            $t->json('item');
            $t->boolean('required')->default(true);
            $t->unsignedSmallInteger('sort')->default(0);
            $t->timestamps();
        });

        Schema::create('insurance_plans', function (Blueprint $t) {
            $t->id();
            $t->string('code', 32)->unique();
            $t->json('name');
            $t->json('coverage')->nullable(); // [{en,bn}]
            $t->decimal('price', 12, 2);
            $t->json('price_note')->nullable();
            $t->boolean('is_popular')->default(false);
            $t->unsignedSmallInteger('sort')->default(0);
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        Schema::create('gift_card_designs', function (Blueprint $t) {
            $t->id();
            $t->string('code', 32)->unique();
            $t->json('name');
            $t->string('gradient', 96)->nullable();
            $t->foreignId('image_id')->nullable()->constrained('media_assets')->nullOnDelete();
            $t->json('amounts')->nullable();
            $t->boolean('is_active')->default(true);
            $t->unsignedSmallInteger('sort')->default(0);
            $t->timestamps();
        });

        Schema::create('offers', function (Blueprint $t) {
            $t->id();
            $t->string('code', 32)->unique();
            $t->json('title');
            $t->json('description')->nullable();
            $t->string('kind', 16)->default('holiday'); // holiday | cruise | flight | bank (offers page filter)
            $t->json('discount_text')->nullable();
            $t->json('tag')->nullable();
            $t->string('link', 512)->nullable();
            $t->foreignId('image_id')->nullable()->constrained('media_assets')->nullOnDelete();
            $t->timestamp('starts_at')->nullable();
            $t->timestamp('ends_at')->nullable()->index();
            $t->boolean('is_flash')->default(false);
            $t->unsignedSmallInteger('sort')->default(0);
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        Schema::create('coupons', function (Blueprint $t) {
            $t->id();
            $t->string('code', 32)->unique();
            $t->json('name')->nullable();
            $t->string('type', 12)->default('percent'); // percent | fixed
            $t->decimal('value', 12, 2);
            $t->decimal('max_discount', 12, 2)->nullable();
            $t->decimal('min_spend', 12, 2)->default(0);
            $t->unsignedInteger('max_uses')->nullable();
            $t->unsignedSmallInteger('max_uses_per_user')->nullable();
            $t->unsignedInteger('used')->default(0);
            $t->json('scope')->nullable(); // {"kinds": ["tour"], "first_booking": true}
            $t->timestamp('valid_from')->nullable();
            $t->timestamp('valid_to')->nullable();
            $t->string('status', 16)->default('active')->index(); // active | scheduled | paused | expired
            $t->timestamps();
            $t->softDeletes();
        });

        Schema::create('planner_costs', function (Blueprint $t) {
            $t->id();
            $t->foreignId('destination_id')->unique()->constrained()->cascadeOnDelete();
            $t->decimal('cost_per_day_standard', 12, 2);
            $t->decimal('cost_per_day_premium', 12, 2)->nullable();
            $t->decimal('flight_estimate', 12, 2)->default(0);
            $t->timestamps();
        });

        Schema::create('currencies', function (Blueprint $t) {
            $t->id();
            $t->string('code', 3)->unique();
            $t->string('symbol', 8);
            $t->decimal('rate_to_bdt', 12, 4)->default(1);
            $t->boolean('is_active')->default(true);
            $t->unsignedSmallInteger('sort')->default(0);
            $t->timestamps();
        });

        foreach (['destinations', 'tours', 'cruises', 'activities', 'hotels', 'visa_products'] as $table) {
            $this->fulltext($table);
        }
    }

    public function down(): void
    {
        foreach (['currencies', 'planner_costs', 'coupons', 'offers', 'gift_card_designs', 'insurance_plans', 'visa_requirements', 'visa_products', 'visa_document_sets',
            'flight_offers', 'airports', 'airlines', 'hotel_rates', 'hotel_room_types', 'hotels', 'amenities', 'activity_slots', 'activity_options', 'activities',
            'cruise_ports_of_call', 'cruise_cabins', 'cruise_sailings', 'cruises', 'ships', 'cruise_lines', 'tour_addons', 'tour_price_tiers', 'tour_departures',
            'tour_itinerary_days', 'tours', 'cancellation_policies', 'themes', 'destinations', 'categorizables', 'categories', 'countries', 'regions'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
