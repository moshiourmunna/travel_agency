<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Headline medical cover shown on plan cards (e.g. "US$ 50,000"), separate from the feature list. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('insurance_plans', fn (Blueprint $t) => $t->string('medical_cover', 40)->nullable()->after('name'));
    }

    public function down(): void
    {
        Schema::table('insurance_plans', fn (Blueprint $t) => $t->dropColumn('medical_cover'));
    }
};
