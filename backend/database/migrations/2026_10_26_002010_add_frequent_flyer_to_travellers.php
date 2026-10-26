<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Frequent-flyer number per saved traveller (shown masked in the portal, pre-filled at checkout). */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('travellers', 'frequent_flyer')) {
            Schema::table('travellers', fn (Blueprint $t) => $t->string('frequent_flyer', 32)->nullable()->after('seat_pref'));
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('travellers', 'frequent_flyer')) {
            Schema::table('travellers', fn (Blueprint $t) => $t->dropColumn('frequent_flyer'));
        }
    }
};
