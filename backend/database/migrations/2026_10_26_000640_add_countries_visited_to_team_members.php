<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** "Countries visited" shown on team cards (editable per member). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('team_members', fn (Blueprint $t) => $t->unsignedSmallInteger('countries_visited')->nullable()->after('gradient'));
    }

    public function down(): void
    {
        Schema::table('team_members', fn (Blueprint $t) => $t->dropColumn('countries_visited'));
    }
};
