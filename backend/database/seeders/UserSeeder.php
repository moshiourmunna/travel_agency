<?php

namespace Database\Seeders;

use App\Models\LoyaltyTier;
use App\Models\User;
use Database\Seeders\Support\SeedData as S;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/** Staff (mockup STAFF with demo logins), the demo traveller (USER) and customers (CUSTOMERS). Password for every demo account: "password". */
class UserSeeder extends Seeder
{
    /** Staff name => login email (documented in docs/LOCAL_SETUP.md). */
    public const STAFF_EMAILS = [
        'Ahmed Zubair' => 'admin@musafir.test', 'Nadia Islam' => 'sales@musafir.test', 'Rafi Ahmed' => 'reservations@musafir.test', 'Sohel Rana' => 'visa@musafir.test',
        'Mitu Akter' => 'support@musafir.test', 'Kazi Fahim' => 'accounts@musafir.test', 'Tania Sultana' => 'content@musafir.test',
    ];

    public function run(): void
    {
        $password = Hash::make('password');
        $tiers = LoyaltyTier::pluck('id', 'code');

        foreach (S::app('STAFF') as $i => [$name, $ini, $title, $role, $branch]) {
            $u = User::updateOrCreate(['email' => self::STAFF_EMAILS[$name] ?? Str::slug($name).'@musafir.test'], [
                'name' => $name, 'password' => $password, 'type' => 'staff', 'initials' => $ini, 'title' => $title['en'], 'branch' => $branch['en'],
                'code' => sprintf('ST-%03d', $i + 1), 'phone' => sprintf('+8801700%06d', 100 + $i), 'email_verified_at' => now(), 'phone_verified_at' => now(),
                'last_login_at' => now()->subMinutes([2, 5, 12, 60, 180, 1440, 2880][$i] ?? 60),
                'preferences' => ['title_bn' => $title['bn'], 'branch_bn' => $branch['bn']],
            ]);
            $u->syncRoles([$role]);
        }

        $me = S::app('USER');
        $farhana = User::updateOrCreate(['email' => 'farhana@example.com'], [
            'name' => $me['name']['en'], 'password' => $password, 'type' => 'customer', 'initials' => $me['ini'], 'code' => 'CU-10240',
            'phone' => '+8801712345678', 'city' => $me['city']['en'], 'segment' => 'Couple', 'dob' => $me['dob'], 'gender' => 'female',
            'tier_id' => $tiers['gold'] ?? null, 'miles' => $me['miles'], 'wallet_balance' => $me['wallet'], 'referral_code' => $me['referral'],
            'email_verified_at' => now(), 'phone_verified_at' => now(), 'nid_enc' => '1991 2694 8214 821',
            'preferences' => ['name_bn' => $me['name']['bn'], 'city_bn' => $me['city']['bn'], 'meal' => 'halal', 'seat' => 'window', 'newsletter' => true,
                'notify' => ['email' => true, 'sms' => true, 'whatsapp' => true, 'push' => false], 'member_since' => $me['since']],
        ]);
        $farhana->forceFill(['created_at' => $me['since'].' 10:00:00'])->save();
        $farhana->syncRoles(['traveller']);

        $seen = [];
        foreach (S::app('CUSTOMERS') as $i => $c) {
            if ($c['id'] === 'CU-10240') {
                continue;
            }
            $email = $c['email'];
            if (isset($seen[$email])) { // the mockup reuses a few generated addresses
                $email = Str::replaceFirst('@', ($seen[$email] + 1).'@', $email);
            }
            $seen[$c['email']] = ($seen[$c['email']] ?? 0) + 1;
            $u = User::updateOrCreate(['code' => $c['id']], ['email' => $email,
                'name' => $c['name']['en'], 'password' => $password, 'type' => 'customer', 'initials' => $c['ini'], 'code' => $c['id'],
                'phone' => self::normalisePhone($c['phone'], $i), 'city' => $c['city']['en'], 'segment' => $c['seg'] ?? null,
                'tier_id' => $tiers[strtolower($c['tier']['en'])] ?? null, 'miles' => (int) round($c['spend'] / 45), 'status' => $c['status'],
                'referral_code' => strtoupper(Str::before($c['name']['en'], ' ')).(500 + $i), 'email_verified_at' => now(),
                'preferences' => ['name_bn' => $c['name']['bn'], 'city_bn' => $c['city']['bn'], 'seed_trips' => $c['trips'], 'seed_spend' => $c['spend']],
            ]);
            $u->forceFill(['created_at' => $c['since'].' 10:00:00'])->save();
            $u->syncRoles(['traveller']);
        }

        $agent = User::updateOrCreate(['email' => 'agent@example.com'], [
            'name' => 'Sky Route Travels', 'password' => $password, 'type' => 'agent', 'initials' => 'SR', 'phone' => '+8801811000118', 'city' => 'Chattogram', 'email_verified_at' => now(),
        ]);
        $agent->syncRoles(['b2b_agent']);
    }

    public static function normalisePhone(string $p, int $i): string
    {
        $digits = preg_replace('/\D+/', '', $p);
        if (str_starts_with($digits, '880')) {
            return '+'.$digits;
        }
        if (str_starts_with($digits, '0')) {
            return '+88'.$digits;
        }

        return sprintf('+8801900%06d', $i);
    }
}
