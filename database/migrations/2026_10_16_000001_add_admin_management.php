<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Admin back-office: booking timeline/status history, payment/refund audit fields, pre-registration conversion, pilgrim health/mahram fields. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_activities', function (Blueprint $t) {
            $t->id(); $t->foreignId('booking_id')->constrained()->cascadeOnDelete(); $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->string('type', 20)->default('note'); // status|payment|refund|document|visa|schedule|edit|note|system
            $t->string('from_status', 20)->nullable(); $t->string('to_status', 20)->nullable(); $t->text('message')->nullable(); $t->json('data')->nullable(); $t->timestamps();
            $t->index(['booking_id', 'type']);
        });
        Schema::table('payments', function (Blueprint $t) {
            $t->string('note')->nullable(); $t->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete(); $t->unsignedBigInteger('refunded')->default(0);
        });
        Schema::table('refunds', function (Blueprint $t) {
            $t->string('method', 20)->nullable(); $t->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
        });
        Schema::table('pre_registrations', function (Blueprint $t) {
            $t->foreignId('booking_id')->nullable()->constrained()->nullOnDelete(); $t->text('notes')->nullable(); $t->timestamp('converted_at')->nullable();
        });
        Schema::table('travellers', function (Blueprint $t) {
            $t->string('blood_group', 5)->nullable(); $t->text('medical_notes')->nullable(); $t->boolean('needs_wheelchair')->default(false);
        });
        Schema::table('commissions', function (Blueprint $t) {
            $t->string('note')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('commissions', fn (Blueprint $t) => $t->dropColumn('note'));
        Schema::table('travellers', fn (Blueprint $t) => $t->dropColumn(['blood_group', 'medical_notes', 'needs_wheelchair']));
        Schema::table('pre_registrations', function (Blueprint $t) { $t->dropConstrainedForeignId('booking_id'); $t->dropColumn(['notes', 'converted_at']); });
        Schema::table('refunds', function (Blueprint $t) { $t->dropConstrainedForeignId('processed_by'); $t->dropColumn('method'); });
        Schema::table('payments', function (Blueprint $t) { $t->dropConstrainedForeignId('recorded_by'); $t->dropColumn(['note', 'refunded']); });
        Schema::dropIfExists('booking_activities');
    }
};
