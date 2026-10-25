<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * php artisan migrate:fresh --seed  — builds the full demo: every content type from the approved mockup,
 * demo staff/traveller accounts (password "password"), bookings, payments, CRM data and SEO meta.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        mt_srand(26);
        $this->call([
            FoundationSeeder::class,
            UserSeeder::class,
            CatalogueSeeder::class,
            ContentSeeder::class,
            CmsSeeder::class,
            CommerceSeeder::class,
            CrmSeeder::class,
            SeoSeeder::class,
        ]);
    }
}
