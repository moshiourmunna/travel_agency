<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Per-hotel house rules override ([{icon, title{en,bn}, text{en,bn}}]); null = site default (settings catalog.hotel_house_rules). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hotels', fn (Blueprint $t) => $t->json('house_rules')->nullable()->after('gallery'));
    }

    public function down(): void
    {
        Schema::table('hotels', fn (Blueprint $t) => $t->dropColumn('house_rules'));
    }
};
