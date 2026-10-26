<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Remember the price when a traveller saved an item, so the portal can say "price dropped ৳ 4,500 since you saved it". */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('wishlists', 'saved_price')) {
            Schema::table('wishlists', fn (Blueprint $t) => $t->decimal('saved_price', 12, 2)->nullable()->after('wishable_id'));
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('wishlists', 'saved_price')) {
            Schema::table('wishlists', fn (Blueprint $t) => $t->dropColumn('saved_price'));
        }
    }
};
