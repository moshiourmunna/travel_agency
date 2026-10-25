<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** D. Commerce: travellers, bookings, payments, loyalty, wallet, wishlists, reviews, visa applications. Money = decimal(12,2) BDT. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loyalty_tiers', function (Blueprint $t) {
            $t->id();
            $t->string('code', 16)->unique();
            $t->json('name');
            $t->unsignedInteger('min_miles')->default(0);
            $t->json('perks')->nullable();
            $t->decimal('miles_multiplier', 4, 2)->default(1);
            $t->unsignedSmallInteger('sort')->default(0);
            $t->timestamps();
        });

        Schema::table('users', function (Blueprint $t) {
            $t->string('code', 16)->nullable()->unique()->after('ulid'); // CU-10240 / staff code
            $t->string('segment', 24)->nullable()->after('city');
            $t->foreign('tier_id')->references('id')->on('loyalty_tiers')->nullOnDelete();
            $t->foreign('referred_by')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('agents', function (Blueprint $t) {
            $t->id();
            $t->string('code', 16)->unique(); // AG-118
            $t->json('company');
            $t->json('city')->nullable();
            $t->string('licence_no', 64)->nullable();
            $t->string('contact_name')->nullable();
            $t->string('email')->nullable();
            $t->string('phone', 32)->nullable();
            $t->decimal('commission_pct', 5, 2)->default(5);
            $t->decimal('credit_limit', 12, 2)->default(0);
            $t->decimal('balance', 12, 2)->default(0);
            $t->string('status', 16)->default('active')->index();
            $t->timestamps();
            $t->softDeletes();
        });

        Schema::create('agent_users', function (Blueprint $t) {
            $t->foreignId('agent_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('role', 16)->default('member');
            $t->primary(['agent_id', 'user_id']);
        });

        Schema::create('travellers', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('name');
            $t->json('relation')->nullable();
            $t->date('dob')->nullable();
            $t->string('gender', 12)->nullable();
            $t->string('nationality', 2)->default('BD');
            $t->text('passport_no_enc')->nullable();
            $t->string('passport_last4', 8)->nullable();
            $t->date('passport_expiry')->nullable();
            $t->string('meal_pref', 24)->nullable();
            $t->string('seat_pref', 16)->nullable();
            $t->boolean('is_self')->default(false);
            $t->timestamps();
            $t->softDeletes();
        });

        Schema::create('bookings', function (Blueprint $t) {
            $t->id();
            $t->ulid('ulid')->unique();
            $t->string('ref', 20)->unique(); // MSF-26-48213
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('agent_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('owner_staff_id')->nullable()->constrained('users')->nullOnDelete();
            $t->foreignId('coupon_id')->nullable()->constrained()->nullOnDelete();
            $t->string('kind', 16)->index(); // tour | cruise | flight | hotel | visa | activity
            $t->nullableMorphs('product'); // main product (Tour, Cruise, ...)
            $t->json('title');            // snapshot
            $t->json('subtitle')->nullable();
            $t->string('image_key', 64)->nullable();
            $t->string('status', 16)->default('pending'); // pending | partial | confirmed | completed | cancelled | refunded
            $t->string('payment_status', 16)->default('unpaid'); // unpaid | partial | paid | refunded
            $t->string('channel', 16)->default('web');
            $t->json('contact')->nullable(); // {name, email, phone, city}
            $t->date('travel_start')->nullable();
            $t->date('travel_end')->nullable();
            $t->json('pax')->nullable(); // {"adults":2,"children":0,"infants":0}
            $t->unsignedSmallInteger('pax_count')->default(1);
            $t->decimal('subtotal', 12, 2)->default(0);
            $t->decimal('discount', 12, 2)->default(0);
            $t->decimal('tax', 12, 2)->default(0);
            $t->decimal('total', 12, 2)->default(0);
            $t->decimal('paid', 12, 2)->default(0);
            $t->decimal('cost', 12, 2)->default(0);
            $t->string('currency', 3)->default('BDT');
            $t->string('payment_plan', 16)->default('full'); // full | deposit | instalments
            $t->text('notes')->nullable();
            $t->unsignedInteger('miles_earned')->default(0);
            $t->timestamp('cancelled_at')->nullable();
            $t->string('cancel_reason')->nullable();
            $t->timestamp('hold_expires_at')->nullable();
            $t->timestamps();
            $t->softDeletes();
            $t->index(['status', 'travel_start']);
            $t->index(['user_id', 'created_at']);
        });
        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE bookings ADD CONSTRAINT bookings_paid_le_total CHECK (paid <= total)');
        }

        Schema::create('booking_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('booking_id')->constrained()->cascadeOnDelete();
            $t->nullableMorphs('bookable'); // TourDeparture, CruiseSailing, ActivitySlot, HotelRoomType, FlightOffer, VisaProduct, InsurancePlan, TourAddon
            $t->json('label');
            $t->unsignedSmallInteger('qty')->default(1);
            $t->decimal('unit_price', 12, 2);
            $t->decimal('line_total', 12, 2);
            $t->decimal('cost', 12, 2)->default(0);
            $t->json('meta')->nullable();
            $t->timestamps();
        });

        Schema::create('booking_travellers', function (Blueprint $t) {
            $t->id();
            $t->foreignId('booking_id')->constrained()->cascadeOnDelete();
            $t->foreignId('traveller_id')->nullable()->constrained()->nullOnDelete();
            $t->string('name');
            $t->string('type', 8)->default('adult'); // adult | child | infant
            $t->string('ticket_no', 32)->nullable();
            $t->string('seat', 8)->nullable();
            $t->timestamps();
        });

        Schema::create('booking_activities', function (Blueprint $t) {
            $t->id();
            $t->foreignId('booking_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->string('type', 24); // created | status | payment | note | email | sms
            $t->json('body');
            $t->boolean('internal')->default(false);
            $t->timestamps();
        });

        Schema::create('booking_documents', function (Blueprint $t) {
            $t->id();
            $t->foreignId('booking_id')->constrained()->cascadeOnDelete();
            $t->string('kind', 24); // voucher | e-ticket | invoice | itinerary
            $t->json('title');
            $t->string('path')->nullable();
            $t->timestamps();
        });

        Schema::create('payments', function (Blueprint $t) {
            $t->id();
            $t->ulid('ulid')->unique();
            $t->foreignId('booking_id')->nullable()->constrained()->restrictOnDelete();
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->string('purpose', 16)->default('booking'); // booking | instalment | wallet_topup | gift_card
            $t->string('gateway', 24); // mock | sslcommerz | bkash | nagad | bank_transfer | wallet | cash
            $t->string('method', 48)->nullable(); // display label: "bKash", "Card · SSLCommerz"
            $t->decimal('amount', 12, 2);
            $t->decimal('fee', 12, 2)->default(0);
            $t->string('status', 16)->default('initiated')->index(); // initiated | pending | success | failed | cancelled | refunded
            $t->string('gateway_txn', 96)->nullable();
            $t->string('val_id', 96)->nullable();
            $t->json('raw')->nullable();
            $t->timestamp('paid_at')->nullable();
            $t->timestamps();
            $t->unique(['gateway', 'gateway_txn']);
        });

        Schema::create('instalments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('booking_id')->constrained()->cascadeOnDelete();
            $t->unsignedTinyInteger('seq');
            $t->date('due_date');
            $t->decimal('amount', 12, 2);
            $t->string('status', 16)->default('upcoming'); // paid | due | upcoming | overdue
            $t->foreignId('payment_id')->nullable()->constrained()->nullOnDelete();
            $t->timestamps();
        });

        Schema::create('refunds', function (Blueprint $t) {
            $t->id();
            $t->foreignId('payment_id')->constrained()->restrictOnDelete();
            $t->foreignId('booking_id')->nullable()->constrained()->nullOnDelete();
            $t->decimal('amount', 12, 2);
            $t->string('reason')->nullable();
            $t->string('status', 16)->default('requested'); // requested | approved | processed | rejected
            $t->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $t->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('processed_at')->nullable();
            $t->timestamps();
        });

        Schema::create('payment_gateway_logs', function (Blueprint $t) {
            $t->id();
            $t->foreignId('payment_id')->nullable()->constrained()->nullOnDelete();
            $t->string('gateway', 24);
            $t->string('direction', 8); // out | in | ipn
            $t->string('endpoint')->nullable();
            $t->json('payload')->nullable();
            $t->unsignedSmallInteger('http_status')->nullable();
            $t->timestamp('created_at')->useCurrent();
        });

        Schema::create('saved_payment_methods', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('gateway', 24);
            $t->string('label');
            $t->string('masked', 48);
            $t->string('token_ref')->nullable();
            $t->boolean('is_default')->default(false);
            $t->timestamps();
        });

        Schema::create('wallet_transactions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('direction', 8); // credit | debit
            $t->decimal('amount', 12, 2);
            $t->decimal('balance_after', 12, 2)->nullable();
            $t->json('description');
            $t->string('icon', 24)->nullable();
            $t->nullableMorphs('source');
            $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
        });

        Schema::create('miles_transactions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->integer('miles');
            $t->json('description');
            $t->nullableMorphs('source');
            $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
        });

        Schema::create('referrals', function (Blueprint $t) {
            $t->id();
            $t->foreignId('referrer_id')->constrained('users')->cascadeOnDelete();
            $t->foreignId('referred_user_id')->nullable()->constrained('users')->nullOnDelete();
            $t->string('referred_name');
            $t->string('status', 16)->default('pending'); // pending | won
            $t->decimal('reward', 12, 2)->default(0);
            $t->timestamps();
        });

        Schema::create('wishlists', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->morphs('wishable');
            $t->timestamps();
            $t->unique(['user_id', 'wishable_type', 'wishable_id']);
        });

        Schema::create('trip_plans', function (Blueprint $t) {
            $t->id();
            $t->ulid('ulid')->unique();
            $t->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $t->json('name');
            $t->json('data'); // {destinations:[slugs], days, adults, children, style, month}
            $t->decimal('estimate', 12, 2)->default(0);
            $t->string('share_token', 40)->nullable()->unique();
            $t->timestamps();
        });

        Schema::create('reviews', function (Blueprint $t) {
            $t->id();
            $t->nullableMorphs('reviewable');
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('booking_id')->nullable()->constrained()->nullOnDelete();
            $t->json('author_name');
            $t->json('author_city')->nullable();
            $t->string('initials', 4)->nullable();
            $t->json('trip_title')->nullable();
            $t->unsignedTinyInteger('rating');
            $t->json('category_scores')->nullable();
            $t->json('title')->nullable();
            $t->json('body');
            $t->string('status', 16)->default('review')->index(); // review | published | hidden
            $t->json('reply')->nullable();
            $t->foreignId('replied_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('replied_at')->nullable();
            $t->date('travelled_on')->nullable();
            $t->timestamps();
        });
        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE reviews ADD CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5)');
        }

        Schema::create('visa_applications', function (Blueprint $t) {
            $t->id();
            $t->ulid('ulid')->unique();
            $t->string('ref', 20)->unique(); // VSA-26-1182
            $t->foreignId('visa_product_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('traveller_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('booking_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('assignee_id')->nullable()->constrained('users')->nullOnDelete();
            $t->string('applicant_name');
            $t->string('stage', 16)->default('submitted')->index(); // submitted | docs | verified | embassy | approved | rejected | delivered
            $t->unsignedTinyInteger('stage_no')->default(1);
            $t->date('eta')->nullable();
            $t->text('notes')->nullable();
            $t->timestamps();
        });

        Schema::create('visa_application_events', function (Blueprint $t) {
            $t->id();
            $t->foreignId('visa_application_id')->constrained()->cascadeOnDelete();
            $t->json('label');
            $t->string('state', 12)->default('done'); // done | current | todo
            $t->date('happened_on')->nullable();
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->timestamps();
        });

        Schema::create('documents', function (Blueprint $t) {
            $t->id();
            $t->morphs('owner');
            $t->string('kind', 32); // passport | photo | bank_statement | noc | ...
            $t->string('label')->nullable();
            $t->string('disk', 16)->default('local');
            $t->string('path')->nullable();
            $t->string('mime', 96)->nullable();
            $t->unsignedInteger('size')->nullable();
            $t->string('status', 16)->default('pending'); // pending | verified | rejected
            $t->string('rejected_reason')->nullable();
            $t->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
        });

        Schema::create('gift_cards', function (Blueprint $t) {
            $t->id();
            $t->string('code', 24)->unique();
            $t->foreignId('gift_card_design_id')->nullable()->constrained()->nullOnDelete();
            $t->decimal('amount', 12, 2);
            $t->decimal('balance', 12, 2);
            $t->foreignId('buyer_id')->nullable()->constrained('users')->nullOnDelete();
            $t->string('recipient_name')->nullable();
            $t->string('recipient_email')->nullable();
            $t->text('message')->nullable();
            $t->date('expires_at')->nullable();
            $t->string('status', 16)->default('active');
            $t->timestamps();
        });

        Schema::create('coupon_redemptions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('coupon_id')->constrained()->cascadeOnDelete();
            $t->foreignId('booking_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->decimal('discount', 12, 2);
            $t->timestamps();
        });

        Schema::create('commissions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('agent_id')->constrained()->cascadeOnDelete();
            $t->foreignId('booking_id')->nullable()->constrained()->nullOnDelete();
            $t->decimal('amount', 12, 2);
            $t->string('status', 16)->default('pending'); // pending | approved | paid
            $t->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['commissions', 'coupon_redemptions', 'gift_cards', 'documents', 'visa_application_events', 'visa_applications', 'reviews', 'trip_plans', 'wishlists',
            'referrals', 'miles_transactions', 'wallet_transactions', 'saved_payment_methods', 'payment_gateway_logs', 'refunds', 'instalments', 'payments',
            'booking_documents', 'booking_activities', 'booking_travellers', 'booking_items', 'bookings', 'travellers', 'agent_users', 'agents'] as $table) {
            Schema::dropIfExists($table);
        }
        Schema::table('users', function (Blueprint $t) {
            $t->dropForeign(['tier_id']);
            $t->dropForeign(['referred_by']);
            $t->dropColumn(['code', 'segment']);
        });
        Schema::dropIfExists('loyalty_tiers');
    }
};
