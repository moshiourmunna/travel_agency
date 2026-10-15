<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Currency;
use App\Models\Language;
use App\Models\Licence;
use App\Models\Module;
use App\Models\Setting;
use App\Models\TeamMember;
use App\Support\SiteConfig;
use Illuminate\Database\Seeder;

class PlatformSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([['en', 'English', 'English', 'EN', 'ltr', true], ['bn', 'Bangla', 'বাংলা', 'বাং', 'ltr', false], ['ar', 'Arabic', 'العربية', 'ع', 'rtl', false]] as $i => [$c, $n, $nn, $l, $d, $def]) {
            Language::updateOrCreate(['code' => $c], ['name' => $n, 'native_name' => $nn, 'label' => $l, 'dir' => $d, 'enabled' => true, 'is_default' => $def, 'sort' => $i]);
        }
        $i = 0;
        foreach (SiteConfig::MODULES as $k => $label) {
            Module::updateOrCreate(['key' => $k], ['label' => $label, 'enabled' => true, 'sort' => $i++]);
        }
        foreach (SiteConfig::SETTING_DEFAULTS as $k => $v) {
            Setting::updateOrCreate(['key' => $k], ['value' => $v]);
        }
        // Dummy licence numbers – replace with the real ones in Admin → Settings. Empty number = badge hidden.
        $lic = [
            ['mora', 'MoRA Hajj Licence', 'No. 1234', 'Ministry of Religious Affairs, Bangladesh'],
            ['haab', 'HAAB Member', '#0567', 'Hajj Agencies Association of Bangladesh'],
            ['iata', 'IATA', '42-3 1234 5', 'International Air Transport Association'],
            ['caab', 'Civil Aviation (Travel Agency)', 'Reg. 0890', 'CAAB / Ministry of Civil Aviation & Tourism'],
            ['atab', 'ATAB Member', '#4321', 'Association of Travel Agents of Bangladesh'],
            ['trade', 'Trade Licence', '', 'Dhaka South City Corporation'],
        ];
        foreach ($lic as $s => [$type, $label, $num, $issuer]) {
            Licence::updateOrCreate(['type' => $type], ['label' => $label, 'number' => $num, 'issuer' => $issuer, 'valid_until' => now()->addYear()->endOfYear(), 'show_on_site' => true, 'sort' => $s]);
        }
        foreach ([['BDT', '৳', 1], ['SAR', '﷼', 32.4], ['USD', '$', 121.5]] as [$c, $s, $r]) {
            Currency::updateOrCreate(['code' => $c], ['symbol' => $s, 'rate_to_bdt' => $r, 'enabled' => true]);
        }
        $br = [
            [['en' => 'Head Office – Dhaka', 'bn' => 'প্রধান কার্যালয় – ঢাকা', 'ar' => 'المكتب الرئيسي – دكا'], 'House 12, Road 5, Naya Paltan, Dhaka 1000', '+880 1700-000000', true, 23.7337, 90.4141],
            [['en' => 'Chattogram Branch', 'bn' => 'চট্টগ্রাম শাখা', 'ar' => 'فرع شيتاغونغ'], 'CDA Avenue, GEC Circle, Chattogram', '+880 1700-000001', false, 22.3590, 91.8215],
            [['en' => 'Sylhet Branch', 'bn' => 'সিলেট শাখা', 'ar' => 'فرع سيلهيت'], 'Zindabazar, Sylhet 3100', '+880 1700-000002', false, 24.8949, 91.8687],
            [['en' => 'Makkah Office', 'bn' => 'মক্কা অফিস', 'ar' => 'مكتب مكة'], 'Aziziyah, Makkah, KSA', '+966 50 000 0000', false, 21.4120, 39.8730],
        ];
        foreach ($br as $s => [$n, $a, $p, $h, $lat, $lng]) {
            Branch::create(['name' => $n, 'address' => $a, 'phone' => $p, 'is_head_office' => $h, 'lat' => $lat, 'lng' => $lng, 'sort' => $s]);
        }
        $team = [
            ['guide', 'Mufti Abdullah Al Mamun', 'মুফতি আবদুল্লাহ আল মামুন', 'Lead Hajj Guide, 18 Hajj', 'প্রধান হজ্জ গাইড, ১৮ বার হজ্জ'],
            ['guide', 'Maulana Rafiqul Islam', 'মাওলানা রফিকুল ইসলাম', 'Umrah Group Leader', 'উমরাহ গ্রুপ লিডার'],
            ['guide', 'Dr. Hafiz Ahmad Kabir', 'ড. হাফেজ আহমদ কবির', 'Shariah Advisor', 'শরীয়াহ উপদেষ্টা'],
            ['guide', 'Ustazah Fatema Begum', 'উস্তাযা ফাতেমা বেগম', 'Female Pilgrims Guide', 'মহিলা হাজীদের গাইড'],
            ['leader', 'Alhaj M. Shafiqul Islam', 'আলহাজ্ব এম. শফিকুল ইসলাম', 'Managing Director', 'ব্যবস্থাপনা পরিচালক'],
            ['leader', 'Nusrat Jahan', 'নুসরাত জাহান', 'Head of Operations', 'অপারেশন প্রধান'],
            ['leader', 'Mufti Abdullah Al Mamun', 'মুফতি আবদুল্লাহ আল মামুন', 'Chief Hajj Guide', 'প্রধান হজ্জ গাইড'],
            ['leader', 'Tanvir Ahmed', 'তানভীর আহমেদ', 'Visa & Ticketing Lead', 'ভিসা ও টিকেটিং প্রধান'],
        ];
        foreach ($team as $s => [$g, $n, $nb, $r, $rb]) {
            TeamMember::create(['group' => $g, 'name' => ['en' => $n, 'bn' => $nb], 'role' => ['en' => $r, 'bn' => $rb], 'sort' => $s]);
        }
    }
}
