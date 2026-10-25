<?php

use App\Support\CheckoutDefaults;
use App\Support\Settings;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/** M4 checkout defaults for databases that were seeded before M4. Only inserts what is missing; never overwrites admin edits. */
return new class extends Migration
{
    public function up(): void
    {
        if (! DB::table('settings')->exists()) {
            return; // fresh install: the seeders add these
        }
        foreach (CheckoutDefaults::settings() as [$g, $k, $v, $type, $public]) {
            DB::table('settings')->insertOrIgnore(['group' => $g, 'key' => $k, 'value' => json_encode($v), 'type' => $type, 'is_public' => $public, 'created_at' => now(), 'updated_at' => now()]);
        }
        foreach (CheckoutDefaults::addons() as $a) {
            if (! DB::table('tour_addons')->whereNull('tour_id')->where('code', $a['code'])->exists()) {
                DB::table('tour_addons')->insert(['code' => $a['code'], 'label' => json_encode($a['label'], JSON_UNESCAPED_UNICODE), 'price' => $a['price'], 'per' => $a['per'], 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
            }
        }
        Cache::forget(Settings::CACHE_KEY);
    }

    public function down(): void
    {
        foreach (CheckoutDefaults::settings() as [$g, $k]) {
            DB::table('settings')->where('group', $g)->where('key', $k)->delete();
        }
        DB::table('tour_addons')->whereNull('tour_id')->whereIn('code', array_column(CheckoutDefaults::addons(), 'code'))->delete();
    }
};
