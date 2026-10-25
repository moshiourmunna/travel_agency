<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Visa fee components shown on the visa page ([{label{en,bn}, amount}]); they should add up to `fee`. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('visa_products', fn (Blueprint $t) => $t->json('fee_breakdown')->nullable()->after('fee'));
    }

    public function down(): void
    {
        Schema::table('visa_products', fn (Blueprint $t) => $t->dropColumn('fee_breakdown'));
    }
};
