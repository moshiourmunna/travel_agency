<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** E. CRM, support, B2B, notifications, careers. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leads', function (Blueprint $t) {
            $t->id();
            $t->string('code', 16)->unique(); // LD-3301
            $t->string('name');
            $t->string('phone', 32)->nullable();
            $t->string('email')->nullable();
            $t->json('need');
            $t->json('source')->nullable();
            $t->string('source_key', 24)->default('web');
            $t->decimal('value', 12, 2)->default(0);
            $t->string('stage', 16)->default('new')->index(); // new | contacted | quoted | negotiating | won | lost
            $t->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $t->foreignId('trip_plan_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('booking_id')->nullable()->constrained()->nullOnDelete();
            $t->json('meta')->nullable();
            $t->unsignedSmallInteger('sort')->default(0);
            $t->timestamps();
            $t->softDeletes();
        });

        Schema::create('lead_activities', function (Blueprint $t) {
            $t->id();
            $t->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->string('type', 16); // note | call | email | stage
            $t->text('body');
            $t->timestamps();
        });

        Schema::create('inquiries', function (Blueprint $t) {
            $t->id();
            $t->string('type', 24)->index(); // contact | custom-tour | group-tour | insurance | careers | quote | visa | hotel | flight
            $t->string('name')->nullable();
            $t->string('email')->nullable();
            $t->string('phone', 32)->nullable();
            $t->json('payload');
            $t->string('status', 16)->default('new')->index(); // new | in_progress | closed | spam
            $t->string('locale', 5)->default('en');
            $t->string('ip', 45)->nullable();
            $t->foreignId('lead_id')->nullable()->constrained()->nullOnDelete();
            $t->timestamps();
        });

        Schema::create('newsletter_subscribers', function (Blueprint $t) {
            $t->id();
            $t->string('email')->unique();
            $t->string('locale', 5)->default('en');
            $t->string('status', 16)->default('subscribed');
            $t->timestamp('confirmed_at')->nullable();
            $t->timestamps();
        });

        Schema::create('support_tickets', function (Blueprint $t) {
            $t->id();
            $t->string('ref', 20)->unique(); // TKT-8812
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('booking_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('assignee_id')->nullable()->constrained('users')->nullOnDelete();
            $t->json('subject');
            $t->string('customer_name')->nullable();
            $t->string('priority', 12)->default('normal'); // low | normal | high | urgent
            $t->string('status', 16)->default('open')->index(); // open | awaiting | resolved | closed
            $t->timestamp('last_activity_at')->nullable();
            $t->timestamps();
        });

        Schema::create('ticket_messages', function (Blueprint $t) {
            $t->id();
            $t->foreignId('support_ticket_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->string('author_type', 12)->default('customer'); // customer | agent | system
            $t->json('body');
            $t->boolean('internal')->default(false);
            $t->json('attachments')->nullable();
            $t->timestamps();
        });

        Schema::create('api_clients', function (Blueprint $t) {
            $t->id();
            $t->foreignId('agent_id')->nullable()->constrained()->cascadeOnDelete();
            $t->string('name');
            $t->string('key_prefix', 12)->unique();
            $t->string('key_hash');
            $t->json('scopes')->nullable();
            $t->unsignedInteger('rate_limit')->default(60);
            $t->timestamp('last_used_at')->nullable();
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        Schema::create('integration_logs', function (Blueprint $t) {
            $t->id();
            $t->string('service', 32);
            $t->string('action', 64);
            $t->json('payload')->nullable();
            $t->boolean('success')->default(true);
            $t->timestamp('created_at')->useCurrent();
        });

        Schema::create('notification_templates', function (Blueprint $t) {
            $t->id();
            $t->string('key', 64);
            $t->string('channel', 12); // email | sms | whatsapp | push
            $t->json('name');
            $t->json('subject')->nullable();
            $t->json('body');
            $t->json('variables')->nullable();
            $t->boolean('is_active')->default(true);
            $t->timestamps();
            $t->unique(['key', 'channel']);
        });

        Schema::create('notifications', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->string('type');
            $t->morphs('notifiable');
            $t->json('data');
            $t->timestamp('read_at')->nullable();
            $t->timestamps();
        });

        Schema::create('campaigns', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('channel', 12);
            $t->json('segment')->nullable();
            $t->json('subject')->nullable();
            $t->json('body');
            $t->string('status', 16)->default('draft'); // draft | scheduled | sending | sent
            $t->timestamp('scheduled_at')->nullable();
            $t->timestamp('sent_at')->nullable();
            $t->unsignedInteger('recipients_count')->default(0);
            $t->unsignedInteger('opened_count')->default(0);
            $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
        });

        Schema::create('campaign_recipients', function (Blueprint $t) {
            $t->id();
            $t->foreignId('campaign_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->string('destination');
            $t->string('status', 16)->default('queued');
            $t->timestamp('sent_at')->nullable();
            $t->timestamps();
        });

        Schema::create('sms_logs', function (Blueprint $t) {
            $t->id();
            $t->string('to', 32)->index();
            $t->text('body');
            $t->string('driver', 24);
            $t->string('status', 16)->default('sent');
            $t->json('response')->nullable();
            $t->timestamps();
        });

        Schema::create('job_posts', function (Blueprint $t) {
            $t->id();
            $t->string('slug', 120)->unique();
            $t->json('title');
            $t->json('department')->nullable();
            $t->json('location')->nullable();
            $t->json('employment_type')->nullable();
            $t->json('experience')->nullable();
            $t->json('description')->nullable();
            $t->date('closes_on')->nullable();
            $t->string('status', 16)->default('published')->index();
            $t->unsignedSmallInteger('sort')->default(0);
            $t->timestamps();
            $t->softDeletes();
        });

        Schema::create('job_applications', function (Blueprint $t) {
            $t->id();
            $t->foreignId('job_post_id')->nullable()->constrained()->nullOnDelete();
            $t->string('name');
            $t->string('email');
            $t->string('phone', 32)->nullable();
            $t->string('cv_path')->nullable();
            $t->text('cover_letter')->nullable();
            $t->string('status', 16)->default('new');
            $t->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['job_applications', 'job_posts', 'sms_logs', 'campaign_recipients', 'campaigns', 'notifications', 'notification_templates', 'integration_logs',
            'api_clients', 'ticket_messages', 'support_tickets', 'newsletter_subscribers', 'inquiries', 'lead_activities', 'leads'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
