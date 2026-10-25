<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** B. Settings, i18n, CMS, media library, SEO. Bilingual fields are JSON {"en": "...", "bn": "..."}. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('otp_codes', function (Blueprint $t) {
            $t->id();
            $t->string('channel', 8); // sms | email
            $t->string('destination', 191)->index();
            $t->string('purpose', 24); // login | register | reset | verify
            $t->string('code_hash');
            $t->unsignedTinyInteger('attempts')->default(0);
            $t->timestamp('expires_at');
            $t->timestamp('consumed_at')->nullable();
            $t->string('ip', 45)->nullable();
            $t->timestamps();
        });

        Schema::create('login_activities', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->string('identifier')->nullable();
            $t->string('guard', 16)->default('web');
            $t->string('ip', 45)->nullable();
            $t->string('user_agent', 512)->nullable();
            $t->boolean('success')->default(true);
            $t->timestamp('created_at')->useCurrent()->index();
        });

        Schema::create('settings', function (Blueprint $t) {
            $t->id();
            $t->string('group', 32)->index();
            $t->string('key', 64);
            $t->json('value')->nullable();
            $t->string('type', 16)->default('text'); // text | tr | number | bool | json | secret | image
            $t->boolean('is_public')->default(false);
            $t->timestamps();
            $t->unique(['group', 'key']);
        });

        Schema::create('languages', function (Blueprint $t) {
            $t->id();
            $t->string('code', 5)->unique();
            $t->string('name', 32);
            $t->string('native', 32);
            $t->string('dir', 3)->default('ltr');
            $t->boolean('is_default')->default(false);
            $t->boolean('is_active')->default(true);
            $t->unsignedSmallInteger('sort')->default(0);
            $t->timestamps();
        });

        Schema::create('translations', function (Blueprint $t) {
            $t->id();
            $t->string('group', 32)->default('ui')->index();
            $t->string('key', 191);
            $t->json('value');
            $t->timestamps();
            $t->unique(['group', 'key']);
        });

        Schema::create('media_folders', function (Blueprint $t) {
            $t->id();
            $t->foreignId('parent_id')->nullable()->constrained('media_folders')->nullOnDelete();
            $t->string('name');
            $t->timestamps();
        });

        // Central media library: one asset = one uploaded file (spatie media in collection "file").
        Schema::create('media_assets', function (Blueprint $t) {
            $t->id();
            $t->ulid('ulid')->unique();
            $t->foreignId('folder_id')->nullable()->constrained('media_folders')->nullOnDelete();
            $t->string('key', 64)->nullable()->unique(); // stable seed key, e.g. "maldives"
            $t->string('name');
            $t->json('alt')->nullable();
            $t->string('credit')->nullable();
            $t->string('credit_url', 512)->nullable();
            $t->string('license', 64)->nullable();
            $t->decimal('focal_x', 4, 3)->default(0.5);
            $t->decimal('focal_y', 4, 3)->default(0.5);
            $t->unsignedInteger('width')->nullable();
            $t->unsignedInteger('height')->nullable();
            $t->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
            $t->softDeletes();
        });

        Schema::create('pages', function (Blueprint $t) {
            $t->id();
            $t->string('slug', 120)->unique();
            $t->string('template', 32)->default('default'); // default | home | about | legal | form | landing
            $t->json('title');
            $t->json('subtitle')->nullable();
            $t->json('body')->nullable(); // rich text html per locale
            $t->foreignId('image_id')->nullable()->constrained('media_assets')->nullOnDelete();
            $t->json('data')->nullable();
            $t->string('status', 16)->default('published')->index();
            $t->timestamp('published_at')->nullable();
            $t->text('search_text')->nullable();
            $t->timestamps();
            $t->softDeletes();
        });

        Schema::create('page_sections', function (Blueprint $t) {
            $t->id();
            $t->foreignId('page_id')->constrained()->cascadeOnDelete();
            $t->string('type', 40);
            $t->unsignedSmallInteger('sort')->default(0);
            $t->boolean('is_active')->default(true);
            $t->json('data')->nullable();
            $t->timestamps();
            $t->index(['page_id', 'sort']);
        });

        Schema::create('menus', function (Blueprint $t) {
            $t->id();
            $t->string('location', 32)->unique(); // header, mega-tours, footer-1..4, mobile, legal
            $t->json('name');
            $t->timestamps();
        });

        Schema::create('menu_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('menu_id')->constrained()->cascadeOnDelete();
            $t->foreignId('parent_id')->nullable()->constrained('menu_items')->cascadeOnDelete();
            $t->json('label');
            $t->string('url', 512)->nullable(); // locale-less path, e.g. "/tours?region=bd"
            $t->nullableMorphs('linkable');
            $t->string('icon', 40)->nullable();
            $t->json('badge')->nullable();
            $t->json('description')->nullable();
            $t->unsignedSmallInteger('sort')->default(0);
            $t->boolean('is_active')->default(true);
            $t->boolean('new_tab')->default(false);
            $t->json('meta')->nullable(); // display hints: {"mega":"tours"}, {"show_from":"xl"}, {"dot":true}
            $t->timestamps();
        });

        Schema::create('banners', function (Blueprint $t) {
            $t->id();
            $t->string('placement', 40)->index();
            $t->json('title');
            $t->json('subtitle')->nullable();
            $t->json('cta')->nullable();
            $t->string('link', 512)->nullable();
            $t->foreignId('image_id')->nullable()->constrained('media_assets')->nullOnDelete();
            $t->timestamp('starts_at')->nullable();
            $t->timestamp('ends_at')->nullable();
            $t->unsignedSmallInteger('sort')->default(0);
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        Schema::create('faq_categories', function (Blueprint $t) {
            $t->id();
            $t->string('slug', 64)->unique();
            $t->json('name');
            $t->string('icon', 40)->nullable();
            $t->unsignedSmallInteger('sort')->default(0);
            $t->timestamps();
        });

        Schema::create('faqs', function (Blueprint $t) {
            $t->id();
            $t->foreignId('faq_category_id')->nullable()->constrained()->nullOnDelete();
            $t->json('question');
            $t->json('answer');
            $t->json('show_on')->nullable(); // ["home","visa","tour"]
            $t->unsignedSmallInteger('sort')->default(0);
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        Schema::create('testimonials', function (Blueprint $t) {
            $t->id();
            $t->json('name');
            $t->json('city')->nullable();
            $t->json('trip')->nullable();
            $t->unsignedTinyInteger('rating')->default(5);
            $t->json('text');
            $t->string('initials', 4)->nullable();
            $t->foreignId('avatar_id')->nullable()->constrained('media_assets')->nullOnDelete();
            $t->date('travelled_on')->nullable();
            $t->boolean('is_featured')->default(true);
            $t->unsignedSmallInteger('sort')->default(0);
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        Schema::create('team_members', function (Blueprint $t) {
            $t->id();
            $t->json('name');
            $t->json('role');
            $t->json('bio')->nullable();
            $t->string('initials', 4)->nullable();
            $t->string('gradient', 64)->nullable();
            $t->foreignId('photo_id')->nullable()->constrained('media_assets')->nullOnDelete();
            $t->json('socials')->nullable();
            $t->unsignedSmallInteger('sort')->default(0);
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        Schema::create('stats', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('value');
            $t->string('suffix', 8)->nullable();
            $t->json('label');
            $t->string('icon', 40)->nullable();
            $t->unsignedSmallInteger('sort')->default(0);
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        Schema::create('partners', function (Blueprint $t) {
            $t->id();
            $t->string('kind', 16)->default('airline'); // airline | hotel | payment | association
            $t->string('name');
            $t->string('code', 16)->nullable();
            $t->string('color', 16)->nullable();
            $t->foreignId('logo_id')->nullable()->constrained('media_assets')->nullOnDelete();
            $t->string('url', 512)->nullable();
            $t->unsignedSmallInteger('sort')->default(0);
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        Schema::create('blog_categories', function (Blueprint $t) {
            $t->id();
            $t->string('slug', 80)->unique();
            $t->json('name');
            $t->unsignedSmallInteger('sort')->default(0);
            $t->timestamps();
        });

        Schema::create('blog_posts', function (Blueprint $t) {
            $t->id();
            $t->ulid('ulid')->unique();
            $t->string('slug', 160)->unique();
            $t->foreignId('blog_category_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $t->json('author_name')->nullable();
            $t->json('title');
            $t->json('excerpt')->nullable();
            $t->json('body')->nullable();
            $t->foreignId('image_id')->nullable()->constrained('media_assets')->nullOnDelete();
            $t->unsignedSmallInteger('reading_mins')->default(5);
            $t->boolean('is_featured')->default(false);
            $t->string('status', 16)->default('published')->index();
            $t->timestamp('published_at')->nullable()->index();
            $t->text('search_text')->nullable();
            $t->timestamps();
            $t->softDeletes();
        });

        Schema::create('tags', function (Blueprint $t) {
            $t->id();
            $t->string('slug', 80)->unique();
            $t->json('name');
            $t->timestamps();
        });

        Schema::create('taggables', function (Blueprint $t) {
            $t->foreignId('tag_id')->constrained()->cascadeOnDelete();
            $t->morphs('taggable');
            $t->primary(['tag_id', 'taggable_id', 'taggable_type']);
        });

        Schema::create('seo_meta', function (Blueprint $t) {
            $t->id();
            $t->nullableMorphs('seoable');
            $t->string('path', 191)->nullable()->unique(); // for static routes: "/about", "/tours"
            $t->json('meta_title')->nullable();
            $t->json('meta_description')->nullable();
            $t->json('og_title')->nullable();
            $t->json('keywords')->nullable();
            $t->foreignId('og_image_id')->nullable()->constrained('media_assets')->nullOnDelete();
            $t->string('canonical', 512)->nullable();
            $t->string('robots', 64)->nullable(); // e.g. "noindex,follow"
            $t->json('json_ld_override')->nullable();
            $t->decimal('sitemap_priority', 2, 1)->nullable();
            $t->string('sitemap_changefreq', 10)->nullable();
            $t->boolean('in_sitemap')->default(true);
            $t->timestamps();
        });

        Schema::create('redirects', function (Blueprint $t) {
            $t->id();
            $t->string('from_path', 191)->unique();
            $t->string('to_path', 512);
            $t->unsignedSmallInteger('code')->default(301);
            $t->unsignedInteger('hits')->default(0);
            $t->timestamp('last_hit_at')->nullable();
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        Schema::create('gallery_albums', function (Blueprint $t) {
            $t->id();
            $t->string('slug', 80)->unique();
            $t->json('title');
            $t->unsignedSmallInteger('sort')->default(0);
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        Schema::create('gallery_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('gallery_album_id')->constrained()->cascadeOnDelete();
            $t->foreignId('media_asset_id')->constrained()->cascadeOnDelete();
            $t->json('caption')->nullable();
            $t->unsignedSmallInteger('sort')->default(0);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['gallery_items', 'gallery_albums', 'redirects', 'seo_meta', 'taggables', 'tags', 'blog_posts', 'blog_categories', 'partners', 'stats', 'team_members',
            'testimonials', 'faqs', 'faq_categories', 'banners', 'menu_items', 'menus', 'page_sections', 'pages', 'media_assets', 'media_folders', 'translations',
            'languages', 'settings', 'login_activities', 'otp_codes'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
