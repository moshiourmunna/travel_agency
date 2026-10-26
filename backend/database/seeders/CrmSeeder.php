<?php

namespace Database\Seeders;

use App\Models\Agent;
use App\Models\Booking;
use App\Models\Inquiry;
use App\Models\Lead;
use App\Models\NewsletterSubscriber;
use App\Models\NotificationTemplate;
use App\Models\SupportTicket;
use App\Models\User;
use Carbon\CarbonImmutable;
use Database\Seeders\Support\SeedData as S;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/** Leads, support tickets (+ chat), B2B agents, notification templates, in-app notifications, audit log, sample inquiries & subscribers. */
class CrmSeeder extends Seeder
{
    public function run(): void
    {
        $now = CarbonImmutable::parse('2026-10-25 11:00:00', 'Asia/Dhaka');
        $staff = User::where('type', 'staff')->get();
        $byFirst = $staff->keyBy(fn ($u) => Str::before($u->name, ' '));
        $byName = $staff->keyBy('name');
        $farhana = User::where('email', 'farhana@example.com')->first();
        $customers = User::where('type', 'customer')->get()->keyBy('name');

        Lead::query()->forceDelete();
        foreach (S::app('LEADS') as $i => $l) {
            Lead::create([
                'code' => $l['id'], 'name' => $l['name']['en'], 'phone' => sprintf('+88017%08d', 11000000 + $i * 7919), 'email' => Str::slug($l['name']['en'], '.').'@example.com',
                'need' => S::b($l['need']), 'source' => S::b($l['src']), 'source_key' => Str::slug($l['src']['en']), 'value' => $l['value'], 'stage' => $l['stage'],
                'owner_id' => $byFirst[$l['owner']]->id ?? null, 'meta' => ['initials' => $l['ini'], 'name_bn' => $l['name']['bn']], 'sort' => $i,
                'created_at' => $now->sub(self::age($l['age'])), 'updated_at' => $now->sub(self::age($l['age'])),
            ]);
        }

        SupportTicket::query()->delete();
        $bookings = Booking::pluck('id', 'ref');
        foreach (S::app('ADMIN_TICKETS') as [$ref, $cust, $subject, $priority, $status, $assignee, $age]) {
            $user = $customers[$cust['en']] ?? null;
            $t = SupportTicket::create(['ref' => $ref, 'user_id' => $user?->id, 'customer_name' => $cust['en'], 'subject' => S::b($subject), 'priority' => $priority, 'status' => $status,
                'assignee_id' => $byName[$assignee]->id ?? null, 'booking_id' => $ref === 'TKT-8812' ? ($bookings['MSF-26-48213'] ?? null) : null,
                'last_activity_at' => $now->sub(self::age($age)), 'created_at' => $now->sub(self::age($age))->subHours(3)]);
            $t->messages()->create(['user_id' => $user?->id, 'author_type' => 'customer', 'body' => S::b($subject), 'created_at' => $t->created_at]);
        }
        foreach (S::app('TICKETS') as $tk) {
            $t = SupportTicket::firstOrNew(['ref' => $tk['ref']]);
            $t->fill(['user_id' => $farhana->id, 'customer_name' => $farhana->name, 'subject' => S::b($tk['subj']), 'status' => $tk['status'], 'assignee_id' => $byName[$tk['agent']['en']]->id ?? null,
                'last_activity_at' => $tk['upd'].' 16:12:00'])->save();
            if ($t->messages()->count() === 0) {
                $t->messages()->create(['user_id' => $farhana->id, 'author_type' => 'customer', 'body' => S::b($tk['subj']), 'created_at' => $tk['upd'].' 10:00:00']);
            }
        }
        $chat = SupportTicket::where('ref', 'TKT-8812')->first();
        foreach (S::app('CHAT') as $k => [$who, $text, $when]) {
            $chat->messages()->create(['user_id' => $who === 'agent' ? ($byName['Nadia Islam']->id ?? null) : $farhana->id, 'author_type' => $who === 'agent' ? 'agent' : 'customer',
                'body' => S::b($text), 'created_at' => CarbonImmutable::parse('2026-10-24 16:12:00')->addMinutes($k * 6)]);
        }
        // The traveller's opening message comes before the chat replies.
        if ($chat && ($first = $chat->messages()->orderBy('id')->first())) {
            $first->forceFill(['created_at' => '2026-10-24 15:58:00'])->save();
            $chat->forceFill(['created_at' => '2026-10-24 15:58:00'])->save();
        }

        Agent::query()->forceDelete();
        foreach (S::app('AGENTS') as [$code, $company, $city, $bookingsCount, $sales, $commission, $status, $balance]) {
            $agent = Agent::create(['code' => $code, 'company' => S::b($company), 'city' => S::b($city), 'licence_no' => 'ATAB-'.substr($code, 3).'7', 'contact_name' => $company['en'],
                'email' => Str::slug($company['en']).'@example.com', 'commission_pct' => (float) $commission, 'credit_limit' => 500000, 'balance' => $balance, 'status' => $status]);
            DB::table('agents')->where('id', $agent->id)->update(['updated_at' => now()]);
            $agent->forceFill(['created_at' => '2025-01-15'])->save();
            if ($code === 'AG-118' && $u = User::where('email', 'agent@example.com')->first()) {
                $agent->users()->sync([$u->id => ['role' => 'owner']]);
            }
            // seed stats are kept as commissions so the admin table matches the mockup numbers
            $agent->commissions()->create(['amount' => round($sales * (float) $commission / 100), 'status' => 'approved']);
        }

        $templates = [
            ['booking_confirmed', 'Booking confirmed', 'বুকিং নিশ্চিত', 'Your booking {ref} is confirmed', 'আপনার বুকিং {ref} নিশ্চিত হয়েছে', 'Hi {name}, your booking {ref} for {title} is confirmed. Total ৳ {total}, paid ৳ {paid}.', 'হাই {name}, {title}-এর জন্য আপনার বুকিং {ref} নিশ্চিত। মোট ৳ {total}, পরিশোধিত ৳ {paid}।'],
            ['payment_received', 'Payment received', 'পেমেন্ট গৃহীত', 'Payment received for {ref}', '{ref}-এর পেমেন্ট গৃহীত', 'We received ৳ {amount} via {method} for {ref}. Thank you!', '{ref}-এর জন্য {method}-এ ৳ {amount} পেয়েছি। ধন্যবাদ!'],
            ['instalment_due', 'Instalment due', 'কিস্তি বাকি', 'Instalment {seq} due on {date}', 'কিস্তি {seq} — {date} পরিশোধযোগ্য', '৳ {amount} for {title} is due on {date}. Pay with bKash, Nagad or card.', '{title}-এর জন্য ৳ {amount} {date} তারিখে পরিশোধযোগ্য।'],
            ['visa_stage', 'Visa stage changed', 'ভিসার ধাপ পরিবর্তন', 'Visa {ref}: {stage}', 'ভিসা {ref}: {stage}', 'Your visa application {ref} moved to “{stage}”. Expected decision {eta}.', 'আপনার ভিসা আবেদন {ref} “{stage}” ধাপে। সম্ভাব্য সিদ্ধান্ত {eta}।'],
            ['otp', 'One-time password', 'ওয়ান-টাইম পাসওয়ার্ড', 'Your Musafir code', 'আপনার মুসাফির কোড', 'Your Musafir code is {code}. It expires in 5 minutes.', 'আপনার মুসাফির কোড {code}। ৫ মিনিটে মেয়াদ শেষ।'],
            ['booking_cancelled', 'Booking cancelled', 'বুকিং বাতিল', 'Booking {ref} cancelled', 'বুকিং {ref} বাতিল', 'Your booking {ref} was cancelled. Refund: ৳ {refund}.', 'আপনার বুকিং {ref} বাতিল হয়েছে। রিফান্ড: ৳ {refund}।'],
            ['inquiry_received', 'Inquiry received', 'অনুসন্ধান গৃহীত', 'We received your request', 'আপনার অনুরোধ পেয়েছি', 'Thanks {name}! A travel expert will reply within 2 working hours.', 'ধন্যবাদ {name}! একজন ট্রাভেল এক্সপার্ট ২ কর্মঘণ্টার মধ্যে উত্তর দেবেন।'],
        ];
        foreach ($templates as [$key, $nen, $nbn, $sen, $sbn, $ben, $bbn]) {
            preg_match_all('/\{(\w+)\}/', $ben.$sen, $m);
            foreach (['email', 'sms'] as $channel) {
                NotificationTemplate::updateOrCreate(['key' => $key, 'channel' => $channel], ['name' => ['en' => $nen, 'bn' => $nbn], 'subject' => $channel === 'email' ? ['en' => $sen, 'bn' => $sbn] : null,
                    'body' => ['en' => $ben, 'bn' => $bbn], 'variables' => array_values(array_unique($m[1]))]);
            }
        }

        DB::table('notifications')->where('notifiable_id', $farhana->id)->delete();
        foreach (S::app('NOTIFS') as $k => [$icon, $title, $body, $age, $unread, $kind]) {
            DB::table('notifications')->insert(['id' => (string) Str::uuid(), 'type' => 'App\\Notifications\\PortalNotification', 'notifiable_type' => User::class, 'notifiable_id' => $farhana->id,
                'data' => json_encode(['icon' => $icon, 'kind' => $kind, 'title' => S::b($title), 'body' => S::b($body)], JSON_UNESCAPED_UNICODE),
                'read_at' => $unread ? null : $now->sub(self::age($age)), 'created_at' => $now->sub(self::age($age)), 'updated_at' => $now->sub(self::age($age))]);
        }

        DB::table('activity_log')->delete();
        foreach (S::app('LOGS') as $k => [$time, $who, $text, $subject, $ip]) {
            $at = preg_match('/^\d{1,2}:\d{2}$/', $time) ? '2026-10-25 '.$time.':00' : '2026-10-24 '.sprintf('%02d', 18 - $k).':00:00';
            DB::table('activity_log')->insert(['log_name' => $subject, 'description' => $text['en'], 'event' => $subject, 'causer_type' => isset($byName[$who]) ? User::class : null,
                'causer_id' => $byName[$who]->id ?? null, 'properties' => json_encode(['ip' => $ip, 'description_bn' => $text['bn']], JSON_UNESCAPED_UNICODE),
                'created_at' => $at, 'updated_at' => $at]);
        }

        Inquiry::query()->delete();
        foreach ([['contact', 'Sabbir Hossain', 'Need a quote for a corporate retreat in Sylhet for 40 people.'], ['custom-tour', 'Lamia Akter', 'Japan cherry blossom trip, 7 days, April 2027, 2 adults.'], ['group-tour', 'Rumana Islam', 'Study tour to Malaysia for 25 students in January.']] as $k => [$type, $name, $msg]) {
            Inquiry::create(['type' => $type, 'name' => $name, 'email' => Str::slug($name, '.').'@example.com', 'phone' => '+8801711'.str_pad((string) (200000 + $k), 6, '0'), 'payload' => ['message' => $msg], 'status' => $k ? 'new' : 'in_progress',
                'created_at' => $now->subHours($k * 5 + 1)]);
        }
        foreach (['tanvir.ahmed@example.com', 'nusrat.h@example.com', 'farzana.k@example.com'] as $email) {
            NewsletterSubscriber::updateOrCreate(['email' => $email], ['status' => 'subscribed', 'confirmed_at' => now()]);
        }
    }

    /** "12 m" / "2 h" / "1 d" / "3 mo" -> interval string usable with sub(). */
    private static function age(string $age): \DateInterval
    {
        preg_match('/(\d+)\s*(mo|m|h|d|w)/', $age, $m);
        $n = (int) ($m[1] ?? 1);

        return match ($m[2] ?? 'h') {
            'm' => new \DateInterval("PT{$n}M"), 'h' => new \DateInterval("PT{$n}H"), 'd' => new \DateInterval("P{$n}D"), 'w' => new \DateInterval('P'.($n * 7).'D'), 'mo' => new \DateInterval("P{$n}M"),
        };
    }
}
