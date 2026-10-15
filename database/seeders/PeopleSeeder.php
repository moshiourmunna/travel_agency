<?php

namespace Database\Seeders;

use App\Models\Agent;
use App\Models\ApiClient;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\CommissionRule;
use App\Models\Inquiry;
use App\Models\Package;
use App\Models\PreRegistration;
use App\Models\User;
use App\Models\VisaApplication;
use App\Models\VisaType;
use App\Services\BookingService;
use App\Services\PaymentService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class PeopleSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::create(['name' => 'Super Admin', 'email' => 'admin@blessinghajj.com', 'phone' => '01700000000', 'role' => 'admin', 'password' => 'password', 'email_verified_at' => now()]);
        User::create(['name' => 'Tanvir Ahmed (Visa desk)', 'email' => 'visa@blessinghajj.com', 'phone' => '01700000009', 'role' => 'staff', 'password' => 'password']);

        // ---------- Agents (B2B hierarchy) ----------
        $agentUser = User::create(['name' => 'Al Noor Travels', 'email' => 'agent@blessinghajj.com', 'phone' => '01712000142', 'role' => 'agent', 'password' => 'password']);
        $alNoor = Agent::create(['user_id' => $agentUser->id, 'code' => 'AG-0142', 'company_name' => 'Al Noor Travels', 'city' => 'Sylhet', 'licence_no' => 'HL-0911', 'tier' => 'gold',
            'commission_percent' => 4.7, 'credit_limit' => 2500000, 'wallet_balance' => 645000, 'path' => '/1/']);
        foreach ([['Madina Tours', 'Moulvibazar', 2], ['Zam Zam Travels', 'Habiganj', 2], ['Barakah Air', 'Sunamganj', 1.5]] as $i => [$n, $c, $pct]) {
            Agent::create(['parent_id' => $alNoor->id, 'code' => 'AG-0'.(143 + $i), 'company_name' => $n, 'city' => $c, 'tier' => 'silver', 'commission_percent' => $pct, 'credit_limit' => 500000, 'wallet_balance' => 50000 * ($i + 1), 'depth' => 1, 'path' => '/1/'.($i + 2).'/']);
        }
        Agent::create(['code' => 'AG-0098', 'company_name' => 'Rahmat Hajj Kafela', 'city' => 'Chattogram', 'tier' => 'platinum', 'commission_percent' => 5.5, 'credit_limit' => 5000000, 'wallet_balance' => 1210000]);
        Agent::create(['code' => 'AG-0177', 'company_name' => 'Safa Marwa Overseas', 'city' => 'Rajshahi', 'tier' => 'silver', 'commission_percent' => 3, 'credit_limit' => 300000, 'status' => 'suspended']);
        CommissionRule::create(['type' => 'hajj', 'tier' => 'gold', 'kind' => 'fixed', 'value' => 40000]);
        CommissionRule::create(['type' => 'umrah', 'tier' => 'gold', 'kind' => 'percent', 'value' => 6.3]);

        $svc = app(BookingService::class); $pay = app(PaymentService::class);
        $pk = fn ($slug) => Package::with('prices')->where('slug', $slug)->firstOrFail();

        // ---------- Demo customer (matches the dashboard mockup) ----------
        $rahim = User::create(['name' => 'Md. Rahim', 'email' => 'rahim@example.com', 'phone' => '01711111111', 'role' => 'customer', 'password' => 'password', 'phone_verified_at' => now()]);
        $c = $rahim->customerProfile(); $c->update(['district' => 'Dhaka', 'gender' => 'male', 'address' => 'Mirpur 10, Dhaka', 'nid_enc' => '1990123456789', 'dob' => '1972-03-14']);
        [$b] = $svc->create($c, $pk('standard-hajj-2027'), ['room_type' => 'quad', 'adults' => 2, 'children' => 0, 'payment_mode' => 'installment', 'payment_method' => 'bkash',
            'travellers' => [['full_name' => 'Md Abdur Rahim', 'gender' => 'male', 'dob' => '1972-03-14', 'passport_no' => 'A01234567'], ['full_name' => 'Ayesha Siddika', 'gender' => 'female', 'dob' => '1978-08-02', 'passport_no' => 'A07654321']]]);
        $this->payInstallments($b, 2, $pay, ['sslcommerz', 'bkash']);
        $b->update(['status' => 'docs_pending']);
        foreach ($b->travellers as $i => $bt) {
            $bt->update(['govt_tracking_no' => '2027-HJ-88451'.$i]);
            $bt->documents()->delete();
            foreach ([['passport', 'verified'], ['photo', 'verified'], ['vaccine', 'pending'], ['mahram', $i ? 'rejected' : 'verified']] as [$type, $st]) {
                $bt->documents()->create(['type' => $type, 'status' => $st, 'path' => $st === 'pending' ? null : 'demo/'.$type.'.pdf', 'note' => $st === 'rejected' ? 'Photo unclear – please re-upload' : null]);
            }
            VisaApplication::create(['ref' => 'VA-27-'.(1201 + $i), 'booking_traveller_id' => $bt->id, 'applicant_name' => $bt->traveller->full_name, 'visa_type' => 'Hajj visa', 'provider' => 'nusuk', 'status' => 'verified',
                'status_history' => [['status' => 'submitted', 'at' => now()->subDays(10)->toDateString()], ['status' => 'verified', 'at' => now()->subDays(4)->toDateString()]]]);
        }
        [$u] = $svc->create($c, $pk('14-days-group-umrah'), ['room_type' => 'triple', 'adults' => 1, 'payment_mode' => 'pay_later', 'payment_method' => 'bkash', 'travellers' => [['full_name' => 'Md Abdur Rahim', 'gender' => 'male']]]);

        // ---------- More customers with mixed payment modes ----------
        $people = [
            ['Salma Khatun', 'salma@example.com', '01711111112', 'Chattogram', 'premium-shifting-free-hajj', 'double', 2, 'full', 'sslcommerz', 'confirmed', null],
            ['Arif Hasan', 'arif@example.com', '01711111113', 'Dhaka', '14-days-group-umrah', 'quad', 1, 'pay_later', 'bkash', 'hold', null],
            ['Jamal Uddin', 'jamal@example.com', '01711111114', 'Sylhet', '7-days-express-umrah', 'quad', 3, 'full', 'nagad', 'ticketed', $alNoor->id],
            ['Rokeya Begum', 'rokeya@example.com', '01711111115', 'Moulvibazar', 'economy-hajj-2027', 'quad', 1, 'installment', 'bank', 'docs_pending', $alNoor->id],
            ['Abdul Karim', 'karim@example.com', '01711111116', 'Sylhet', 'standard-hajj-2027', 'triple', 3, 'installment', 'bkash', 'confirmed', $alNoor->id],
            ['Faruk Ahmed', 'faruk@example.com', '01711111117', 'Habiganj', 'ramadan-last-10-nights', 'double', 2, 'full', 'bank', 'visa', $alNoor->id],
            ['Nasrin Akter', 'nasrin@example.com', '01711111118', 'Chattogram', '21-days-family-umrah', 'quad', 4, 'installment', 'nagad', 'confirmed', null],
            ['Habibur Rahman', 'habib@example.com', '01711111119', 'Khulna', 'vip-hajj-clock-tower', 'double', 2, 'installment', 'sslcommerz', 'confirmed', null],
            ['Shirin Sultana', 'shirin@example.com', '01711111120', 'Rajshahi', 'istanbul-bursa-7-days', 'double', 2, 'full', 'cash', 'pending', null],
            ['Kamal Hossain', 'kamal@example.com', '01711111121', 'Sylhet', 'makkah-ziyarah-half-day', 'quad', 2, 'pay_later', 'cash', 'hold', null],
            ['Mizanur Rahman', 'mizan@example.com', '01711111122', 'Barishal', 'vip-umrah-5-haram-view', 'double', 2, 'full', 'bkash', 'cancelled', null],
        ];
        foreach ($people as $i => [$name, $email, $phone, $district, $slug, $room, $adults, $mode, $method, $status, $agentId]) {
            $usr = User::create(['name' => $name, 'email' => $email, 'phone' => $phone, 'role' => 'customer', 'password' => 'password']);
            $cu = $usr->customerProfile(); $cu->update(['district' => $district, 'agent_id' => $agentId]);
            $p = $pk($slug);
            $room = $p->prices->firstWhere('room_type', $room) ? $room : 'quad';
            $trav = []; for ($k = 0; $k < $adults; $k++) { $trav[] = ['full_name' => $k ? $name.' family '.$k : $name, 'gender' => $k % 2 ? 'female' : 'male', 'passport_no' => 'B'.random_int(1000000, 9999999)]; }
            [$bk, $due] = $svc->create($cu, $p, ['room_type' => $room, 'adults' => $adults, 'payment_mode' => $mode, 'payment_method' => $method, 'travellers' => $trav, 'addons' => $i % 3 === 0 && $p->type === 'hajj' ? ['qurbani'] : []], $agentId, $agentId ? 'agent' : 'web');
            if ($mode === 'full' && ! in_array($status, ['pending'], true)) {
                [$pm] = $pay->start($bk, $method, $due); $pay->markPaid($pm, strtoupper(Str::random(10)), ['seed' => true], in_array($method, ['bank', 'cash']) ? 1 : null);
            } elseif ($mode === 'full') {
                $pay->start($bk, $method, $due);
            } elseif ($mode === 'installment') {
                $this->payInstallments($bk, $i % 2 ? 1 : 2, $pay, [$method]);
            }
            $bk->update(['status' => $status, 'created_at' => now()->subDays(40 - $i * 3)]);
        }

        // ---------- Visa applications (public tracker demo) ----------
        $sv = VisaType::first();
        foreach ([['VA-26-0981', 'Faruk Ahmed', 'applied'], ['VA-26-0975', 'Lutfur Rahman', 'issued'], ['VA-26-0990', 'Selina Parvin', 'submitted']] as [$ref, $n, $st]) {
            VisaApplication::create(['ref' => $ref, 'visa_type_id' => $sv->id, 'visa_type' => 'Saudi Umrah Visa', 'applicant_name' => $n, 'phone' => '0171'.random_int(1000000, 9999999), 'passport_enc' => 'A'.random_int(1000000, 9999999),
                'provider' => 'nusuk', 'provider_ref' => 'NSK-'.Str::upper(Str::random(8)), 'status' => $st, 'visa_no' => $st === 'issued' ? '6012345678' : null, 'issued_at' => $st === 'issued' ? now()->subDay() : null,
                'status_history' => [['status' => 'submitted', 'at' => now()->subDays(6)->toDateString()]]]);
        }

        // ---------- Pre-registrations & enquiries ----------
        foreach ([['Md. Abul Kashem', 'Dhaka', 'standard', 2, 'tracked'], ['Hosneara Begum', 'Cumilla', 'economy', 1, 'received'], ['Rafiqul Alam', 'Sylhet', 'premium', 2, 'received'], ['Anwar Hossain', 'Bogura', 'economy', 3, 'contacted']] as $i => [$n, $d, $cls, $pil, $st]) {
            PreRegistration::create(['ref' => 'PR-27-'.str_pad((string) (101 + $i), 4, '0', STR_PAD_LEFT), 'name' => $n, 'nid_enc' => (string) random_int(1000000000, 9999999999), 'dob' => '1965-01-0'.($i + 1), 'phone' => '0181'.random_int(1000000, 9999999),
                'district' => $d, 'package_class' => $cls, 'pilgrims' => $pil, 'status' => $st, 'govt_tracking_no' => $st === 'tracked' ? '2027-HJ-77'.random_int(1000, 9999) : null]);
        }
        foreach ([['contact', 'Sohel Rana', 'Umrah', 'Is there a group in December with a female guide?'], ['package', 'Parvin Akter', 'Standard Hajj 2027', 'Can my 70-year-old father get wheelchair support?'], ['contact', 'Jahid Hasan', 'Air ticket', 'Need 4 tickets DAC–JED on 20 Dec.']] as [$t, $n, $int, $msg]) {
            Inquiry::create(['type' => $t, 'name' => $n, 'phone' => '0191'.random_int(1000000, 9999999), 'payload' => ['interest' => $int, 'message' => $msg]]);
        }

        ApiClient::create(['name' => 'Al Noor Travels portal', 'type' => 'agent', 'agent_id' => $alNoor->id, 'client_id' => 'bha_'.Str::lower(Str::random(16)), 'secret_hash' => Hash::make(Str::random(40)), 'scopes' => ['packages:read', 'bookings:write']]);
        AuditLog::create(['user_id' => $admin->id, 'action' => 'seed', 'auditable_type' => 'system', 'after' => ['note' => 'Demo data seeded'], 'ip' => '127.0.0.1']);
    }

    private function payInstallments(Booking $b, int $count, PaymentService $pay, array $methods): void
    {
        foreach ($b->installments()->orderBy('seq')->take($count)->get() as $k => $inst) {
            $m = $methods[$k % count($methods)];
            [$p] = $pay->start($b, $m, $inst->amount, $inst);
            $pay->markPaid($p, strtoupper(Str::random(10)), ['seed' => true]);
            $p->update(['paid_at' => now()->subDays(30 - $k * 20)]);
        }
    }
}
