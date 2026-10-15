<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Blessing Hajj Agency domain schema (see docs/database.md).
 * Translatable text is stored as JSON {"en":…, "bn":…, "ar":…} in the same row (HasTranslations trait);
 * money is stored as whole BDT in unsigned bigint + currency.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ---------- Settings / platform ----------
        Schema::create('settings', function (Blueprint $t) {
            $t->id(); $t->string('key')->unique(); $t->json('value')->nullable(); $t->string('group', 30)->default('site'); $t->timestamps();
        });
        Schema::create('languages', function (Blueprint $t) {
            $t->id(); $t->string('code', 5)->unique(); $t->string('name'); $t->string('native_name'); $t->string('label', 10);
            $t->string('dir', 3)->default('ltr'); $t->boolean('enabled')->default(true); $t->boolean('is_default')->default(false); $t->unsignedSmallInteger('sort')->default(0); $t->timestamps();
        });
        Schema::create('translations', function (Blueprint $t) {
            $t->id(); $t->string('locale', 5); $t->string('group', 40)->default('ui'); $t->string('key'); $t->text('value')->nullable(); $t->timestamps();
            $t->unique(['locale', 'group', 'key']);
        });
        Schema::create('modules', function (Blueprint $t) {
            $t->id(); $t->string('key', 40)->unique(); $t->string('label'); $t->boolean('enabled')->default(true); $t->json('settings')->nullable(); $t->unsignedSmallInteger('sort')->default(0); $t->timestamps();
        });
        Schema::create('licences', function (Blueprint $t) {
            $t->id(); $t->string('type', 20)->unique(); $t->string('label'); $t->string('number')->nullable(); $t->string('issuer')->nullable();
            $t->date('valid_until')->nullable(); $t->string('document_path')->nullable(); $t->boolean('show_on_site')->default(true); $t->unsignedSmallInteger('sort')->default(0); $t->timestamps();
        });
        Schema::create('currencies', function (Blueprint $t) {
            $t->string('code', 3)->primary(); $t->string('symbol', 5); $t->decimal('rate_to_bdt', 12, 4)->default(1); $t->boolean('enabled')->default(true); $t->timestamps();
        });
        Schema::create('branches', function (Blueprint $t) {
            $t->id(); $t->json('name'); $t->text('address'); $t->string('phone')->nullable(); $t->decimal('lat', 10, 7)->nullable(); $t->decimal('lng', 10, 7)->nullable();
            $t->boolean('is_head_office')->default(false); $t->unsignedSmallInteger('sort')->default(0); $t->timestamps();
        });
        Schema::create('team_members', function (Blueprint $t) {
            $t->id(); $t->json('name'); $t->json('role'); $t->string('group', 20)->default('guide'); $t->string('photo')->nullable(); $t->unsignedSmallInteger('sort')->default(0); $t->boolean('is_active')->default(true); $t->timestamps();
        });

        // ---------- Agents (B2B) ----------
        Schema::create('agents', function (Blueprint $t) {
            $t->id(); $t->foreignId('parent_id')->nullable()->constrained('agents')->nullOnDelete(); $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->string('code', 20)->unique(); $t->string('company_name'); $t->string('city')->nullable(); $t->string('licence_no')->nullable(); $t->string('tier', 20)->default('silver');
            $t->string('markup_type', 10)->default('percent'); $t->decimal('markup_value', 10, 2)->default(0); $t->decimal('commission_percent', 5, 2)->default(0);
            $t->unsignedBigInteger('credit_limit')->default(0); $t->bigInteger('wallet_balance')->default(0); $t->string('status', 20)->default('active');
            $t->unsignedTinyInteger('depth')->default(0); $t->string('path')->nullable(); $t->timestamps(); $t->softDeletes();
        });

        // ---------- Customers & travellers ----------
        Schema::create('customers', function (Blueprint $t) {
            $t->id(); $t->foreignId('user_id')->constrained()->cascadeOnDelete(); $t->text('nid_enc')->nullable(); $t->date('dob')->nullable(); $t->string('gender', 10)->nullable();
            $t->string('address')->nullable(); $t->string('district')->nullable(); $t->string('emergency_contact')->nullable();
            $t->foreignId('agent_id')->nullable()->constrained()->nullOnDelete(); $t->timestamps(); $t->softDeletes();
        });
        Schema::create('travellers', function (Blueprint $t) {
            $t->id(); $t->foreignId('customer_id')->constrained()->cascadeOnDelete(); $t->string('full_name'); $t->string('gender', 10)->default('male'); $t->date('dob')->nullable();
            $t->string('relation', 30)->nullable(); $t->foreignId('mahram_traveller_id')->nullable()->constrained('travellers')->nullOnDelete();
            $t->text('nid_enc')->nullable(); $t->string('phone')->nullable(); $t->string('photo_path')->nullable(); $t->timestamps(); $t->softDeletes();
        });
        Schema::create('passports', function (Blueprint $t) {
            $t->id(); $t->foreignId('traveller_id')->constrained()->cascadeOnDelete(); $t->text('number_enc'); $t->date('issue_date')->nullable(); $t->date('expiry_date')->nullable();
            $t->string('issue_place')->nullable(); $t->string('scan_path')->nullable(); $t->timestamp('verified_at')->nullable(); $t->timestamps();
        });

        // ---------- Catalog ----------
        Schema::create('hotels', function (Blueprint $t) {
            $t->id(); $t->string('city', 20)->index(); $t->string('name'); $t->unsignedTinyInteger('stars')->default(4); $t->unsignedInteger('distance_to_haram_m')->default(0);
            $t->string('address')->nullable(); $t->decimal('lat', 10, 7)->nullable(); $t->decimal('lng', 10, 7)->nullable(); $t->string('supplier')->nullable()->default('direct'); $t->string('supplier_code')->nullable();
            $t->json('amenities')->nullable(); $t->unsignedBigInteger('price_per_night')->default(0); $t->string('image')->nullable(); $t->boolean('is_active')->default(true); $t->timestamps(); $t->softDeletes();
        });
        Schema::create('flights', function (Blueprint $t) {
            $t->id(); $t->string('airline'); $t->string('airline_code', 3); $t->string('flight_no', 10); $t->string('from_iata', 3); $t->string('to_iata', 3); $t->string('via_iata', 3)->nullable();
            $t->dateTime('depart_at'); $t->dateTime('arrive_at'); $t->unsignedSmallInteger('duration_min'); $t->unsignedTinyInteger('stops')->default(0); $t->string('baggage')->nullable()->default('2×23 kg');
            $t->string('cabin', 20)->nullable()->default('Economy'); $t->unsignedBigInteger('fare')->default(0); $t->unsignedSmallInteger('seats_block')->default(0); $t->string('pnr_group')->nullable(); $t->string('supplier')->nullable()->default('stub');
            $t->boolean('is_active')->default(true); $t->timestamps(); $t->softDeletes();
            $t->index(['from_iata', 'to_iata', 'depart_at']);
        });
        Schema::create('packages', function (Blueprint $t) {
            $t->id(); $t->string('type', 20); $t->string('class', 20)->default('standard'); $t->string('slug')->unique();
            $t->json('title'); $t->json('summary')->nullable(); $t->json('description')->nullable(); $t->json('inclusions')->nullable(); $t->json('exclusions')->nullable(); $t->json('terms')->nullable();
            $t->unsignedSmallInteger('season_year')->nullable(); $t->string('hijri_year', 10)->nullable(); $t->unsignedSmallInteger('duration_days'); $t->string('departure_city', 40)->nullable()->default('Dhaka (DAC)');
            $t->date('departure_date')->nullable(); $t->date('return_date')->nullable(); $t->unsignedSmallInteger('seats_total')->default(0); $t->unsignedSmallInteger('seats_sold')->default(0);
            $t->unsignedInteger('makkah_distance_m')->nullable(); $t->unsignedInteger('madinah_distance_m')->nullable(); $t->string('airline')->nullable();
            $t->unsignedBigInteger('price_from')->default(0); $t->decimal('rating', 2, 1)->default(4.8); $t->unsignedInteger('reviews_count')->default(0);
            $t->string('image')->nullable(); $t->json('gallery')->nullable(); $t->boolean('is_featured')->default(false); $t->string('status', 20)->default('published'); $t->timestamp('published_at')->nullable();
            $t->timestamps(); $t->softDeletes();
            $t->index(['type', 'status', 'departure_date']); $t->index(['class', 'makkah_distance_m']);
        });
        Schema::create('package_prices', function (Blueprint $t) {
            $t->id(); $t->foreignId('package_id')->constrained()->cascadeOnDelete(); $t->string('room_type', 10); $t->unsignedBigInteger('price'); $t->char('currency', 3)->default('BDT');
            $t->unsignedBigInteger('b2b_price')->nullable(); $t->unsignedBigInteger('deposit_amount')->default(0); $t->json('installment_plan')->nullable();
            $t->date('valid_from')->nullable(); $t->date('valid_to')->nullable(); $t->timestamps();
        });
        Schema::create('itinerary_days', function (Blueprint $t) {
            $t->id(); $t->foreignId('package_id')->constrained()->cascadeOnDelete(); $t->unsignedSmallInteger('day_from'); $t->unsignedSmallInteger('day_to')->nullable();
            $t->json('title'); $t->json('body')->nullable(); $t->unsignedSmallInteger('sort')->default(0); $t->timestamps();
        });
        Schema::create('package_hotels', function (Blueprint $t) {
            $t->id(); $t->foreignId('package_id')->constrained()->cascadeOnDelete(); $t->foreignId('hotel_id')->constrained()->cascadeOnDelete();
            $t->unsignedSmallInteger('nights'); $t->unsignedSmallInteger('check_in_day')->default(1); $t->string('meal_plan')->nullable();
        });
        Schema::create('package_flights', function (Blueprint $t) {
            $t->id(); $t->foreignId('package_id')->constrained()->cascadeOnDelete(); $t->foreignId('flight_id')->constrained()->cascadeOnDelete(); $t->string('leg', 10)->default('outbound');
        });
        Schema::create('visa_types', function (Blueprint $t) {
            $t->id(); $t->string('country', 60); $t->string('flag', 10)->nullable(); $t->json('name'); $t->string('processing_time'); $t->unsignedBigInteger('fee');
            $t->string('provider', 20)->default('manual'); $t->json('requirements')->nullable(); $t->unsignedSmallInteger('sort')->default(0); $t->boolean('is_active')->default(true); $t->timestamps();
        });
        Schema::create('commission_rules', function (Blueprint $t) {
            $t->id(); $t->foreignId('package_id')->nullable()->constrained()->cascadeOnDelete(); $t->string('type', 20)->nullable(); $t->string('tier', 20)->nullable();
            $t->string('kind', 10)->default('percent'); $t->decimal('value', 12, 2); $t->timestamps();
        });

        // ---------- Booking & payments ----------
        Schema::create('bookings', function (Blueprint $t) {
            $t->id(); $t->string('ref', 20)->unique(); $t->string('type', 20); $t->foreignId('customer_id')->constrained(); $t->foreignId('package_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('agent_id')->nullable()->constrained()->nullOnDelete(); $t->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $t->string('room_type', 10)->nullable(); $t->unsignedSmallInteger('adults')->default(1); $t->unsignedSmallInteger('children')->default(0);
            $t->string('status', 20)->default('pending'); $t->string('payment_mode', 20)->default('full'); $t->string('payment_method', 20)->nullable();
            $t->unsignedBigInteger('subtotal'); $t->unsignedBigInteger('discount')->default(0); $t->unsignedBigInteger('total'); $t->unsignedBigInteger('paid')->default(0); $t->char('currency', 3)->default('BDT');
            $t->timestamp('hold_expires_at')->nullable(); $t->string('source', 10)->default('web'); $t->json('meta')->nullable(); $t->timestamps(); $t->softDeletes();
            $t->index(['customer_id', 'status']);
        });
        Schema::create('booking_travellers', function (Blueprint $t) {
            $t->id(); $t->foreignId('booking_id')->constrained()->cascadeOnDelete(); $t->foreignId('traveller_id')->constrained(); $t->string('room_type', 10)->nullable();
            $t->unsignedBigInteger('price')->default(0); $t->boolean('is_lead')->default(false); $t->string('ticket_no')->nullable(); $t->string('seat')->nullable(); $t->string('govt_tracking_no')->nullable(); $t->timestamps();
        });
        Schema::create('booking_items', function (Blueprint $t) {
            $t->id(); $t->foreignId('booking_id')->constrained()->cascadeOnDelete(); $t->string('kind', 20); $t->unsignedBigInteger('ref_id')->nullable(); $t->string('label');
            $t->string('supplier_ref')->nullable(); $t->unsignedBigInteger('price')->default(0); $t->string('status', 20)->default('pending'); $t->timestamps();
        });
        Schema::create('installments', function (Blueprint $t) {
            $t->id(); $t->foreignId('booking_id')->constrained()->cascadeOnDelete(); $t->unsignedTinyInteger('seq'); $t->string('label'); $t->date('due_date');
            $t->unsignedBigInteger('amount'); $t->string('status', 20)->default('upcoming'); $t->timestamp('paid_at')->nullable(); $t->timestamps();
            $t->index(['status', 'due_date']);
        });
        Schema::create('payments', function (Blueprint $t) {
            $t->id(); $t->foreignId('booking_id')->constrained()->cascadeOnDelete(); $t->foreignId('installment_id')->nullable()->constrained()->nullOnDelete();
            $t->string('method', 20); $t->string('gateway_txn_id')->nullable()->unique(); $t->unsignedBigInteger('amount'); $t->char('currency', 3)->default('BDT');
            $t->string('status', 20)->default('pending'); $t->json('payload')->nullable(); $t->string('slip_path')->nullable(); $t->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('paid_at')->nullable(); $t->timestamps();
        });
        Schema::create('refunds', function (Blueprint $t) {
            $t->id(); $t->foreignId('payment_id')->constrained()->cascadeOnDelete(); $t->unsignedBigInteger('amount'); $t->string('reason')->nullable(); $t->string('status', 20)->default('pending'); $t->timestamp('processed_at')->nullable(); $t->timestamps();
        });
        Schema::create('ledger_entries', function (Blueprint $t) {
            $t->id(); $t->string('account_type', 20); $t->unsignedBigInteger('account_id'); $t->unsignedBigInteger('debit')->default(0); $t->unsignedBigInteger('credit')->default(0);
            $t->bigInteger('balance_after')->default(0); $t->string('ref_type')->nullable(); $t->unsignedBigInteger('ref_id')->nullable(); $t->string('note')->nullable(); $t->timestamps();
            $t->index(['account_type', 'account_id']);
        });
        Schema::create('documents', function (Blueprint $t) {
            $t->id(); $t->foreignId('booking_traveller_id')->constrained()->cascadeOnDelete(); $t->string('type', 20); $t->string('path')->nullable(); $t->string('mime')->nullable(); $t->unsignedInteger('size')->default(0);
            $t->string('status', 20)->default('pending'); $t->foreignId('reviewer_id')->nullable()->constrained('users')->nullOnDelete(); $t->string('note')->nullable(); $t->timestamps();
        });
        Schema::create('visa_applications', function (Blueprint $t) {
            $t->id(); $t->string('ref', 20)->unique(); $t->foreignId('booking_traveller_id')->nullable()->constrained()->nullOnDelete(); $t->foreignId('visa_type_id')->nullable()->constrained()->nullOnDelete();
            $t->string('applicant_name'); $t->string('phone')->nullable(); $t->text('passport_enc')->nullable(); $t->unsignedSmallInteger('applicants')->default(1);
            $t->string('visa_type')->nullable(); $t->string('country')->default('Saudi Arabia'); $t->string('provider', 20)->default('manual'); $t->string('provider_ref')->nullable()->index();
            $t->string('status', 20)->default('submitted'); $t->json('status_history')->nullable(); $t->timestamp('issued_at')->nullable(); $t->string('visa_no')->nullable(); $t->string('file_path')->nullable(); $t->timestamps();
        });
        Schema::create('commissions', function (Blueprint $t) {
            $t->id(); $t->foreignId('agent_id')->constrained()->cascadeOnDelete(); $t->foreignId('booking_id')->constrained()->cascadeOnDelete(); $t->foreignId('rule_id')->nullable()->constrained('commission_rules')->nullOnDelete();
            $t->unsignedBigInteger('amount'); $t->string('status', 20)->default('pending'); $t->timestamp('paid_at')->nullable(); $t->timestamps();
        });

        // ---------- CMS ----------
        Schema::create('posts', function (Blueprint $t) {
            $t->id(); $t->string('slug')->unique(); $t->string('category', 40)->default('guide'); $t->json('title'); $t->json('excerpt')->nullable(); $t->json('body')->nullable();
            $t->string('image')->nullable(); $t->unsignedTinyInteger('read_minutes')->default(5); $t->timestamp('published_at')->nullable(); $t->timestamps(); $t->softDeletes();
        });
        Schema::create('faqs', function (Blueprint $t) {
            $t->id(); $t->string('category', 30)->default('hajj'); $t->json('question'); $t->json('answer'); $t->unsignedSmallInteger('sort')->default(0); $t->boolean('is_active')->default(true); $t->timestamps();
        });
        Schema::create('gallery_items', function (Blueprint $t) {
            $t->id(); $t->string('album', 40); $t->string('type', 10)->default('image'); $t->string('path'); $t->string('url')->nullable(); $t->json('caption')->nullable(); $t->unsignedSmallInteger('sort')->default(0); $t->timestamps();
        });
        Schema::create('reviews', function (Blueprint $t) {
            $t->id(); $t->foreignId('package_id')->nullable()->constrained()->nullOnDelete(); $t->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $t->string('name'); $t->string('city')->nullable(); $t->string('trip')->nullable(); $t->unsignedTinyInteger('rating')->default(5); $t->text('body'); $t->string('status', 20)->default('approved'); $t->timestamps();
        });
        Schema::create('inquiries', function (Blueprint $t) {
            $t->id(); $t->string('type', 20)->default('contact'); $t->string('name'); $t->string('phone'); $t->string('email')->nullable(); $t->json('payload')->nullable();
            $t->string('status', 20)->default('new'); $t->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete(); $t->timestamps();
        });
        Schema::create('pre_registrations', function (Blueprint $t) {
            $t->id(); $t->string('ref', 20)->unique(); $t->string('name'); $t->text('nid_enc'); $t->date('dob'); $t->string('phone'); $t->text('passport_enc')->nullable(); $t->string('district');
            $t->string('package_class', 20); $t->unsignedSmallInteger('pilgrims')->default(1); $t->string('govt_tracking_no')->nullable(); $t->string('status', 20)->default('received');
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete(); $t->timestamps();
        });

        // ---------- Audit / integrations / API ----------
        Schema::create('audit_logs', function (Blueprint $t) {
            $t->id(); $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete(); $t->string('action', 40); $t->string('auditable_type')->nullable(); $t->unsignedBigInteger('auditable_id')->nullable();
            $t->json('before')->nullable(); $t->json('after')->nullable(); $t->string('ip', 45)->nullable(); $t->string('user_agent')->nullable(); $t->timestamp('created_at')->useCurrent();
        });
        Schema::create('api_clients', function (Blueprint $t) {
            $t->id(); $t->string('name'); $t->string('type', 20)->default('partner'); $t->foreignId('agent_id')->nullable()->constrained()->nullOnDelete();
            $t->string('client_id')->unique(); $t->string('secret_hash'); $t->json('scopes')->nullable(); $t->unsignedInteger('rate_limit')->default(60); $t->boolean('active')->default(true); $t->timestamps();
        });
        Schema::create('integration_logs', function (Blueprint $t) {
            $t->id(); $t->string('provider', 40); $t->string('operation', 60); $t->string('status', 20); $t->unsignedInteger('duration_ms')->default(0);
            $t->json('request')->nullable(); $t->json('response')->nullable(); $t->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        foreach (['integration_logs', 'api_clients', 'audit_logs', 'pre_registrations', 'inquiries', 'reviews', 'gallery_items', 'faqs', 'posts', 'commissions', 'visa_applications', 'documents', 'ledger_entries', 'refunds', 'payments', 'installments', 'booking_items', 'booking_travellers', 'bookings', 'commission_rules', 'visa_types', 'package_flights', 'package_hotels', 'itinerary_days', 'package_prices', 'packages', 'flights', 'hotels', 'passports', 'travellers', 'customers', 'agents', 'team_members', 'branches', 'currencies', 'licences', 'modules', 'translations', 'languages', 'settings'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
