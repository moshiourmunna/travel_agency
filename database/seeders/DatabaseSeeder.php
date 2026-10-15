<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([PlatformSeeder::class, CatalogSeeder::class, ContentSeeder::class, PeopleSeeder::class]);
        \App\Support\SiteConfig::flush();
    }
}
