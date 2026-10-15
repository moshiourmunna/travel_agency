<?php

namespace Database\Seeders;

use App\Models\Faq;
use App\Models\GalleryItem;
use App\Models\Package;
use App\Models\Post;
use App\Models\Review;
use Illuminate\Database\Seeder;

class ContentSeeder extends Seeder
{
    public function run(): void
    {
        $posts = [
            ['hajj-2027-registration-deadlines-and-fees', 'news', 'Hajj 2027 registration: deadlines and fees explained', 'হজ্জ ২০২৭ নিবন্ধন: সময়সীমা ও ফি', 'تسجيل حج 2027: المواعيد والرسوم', 1, 3,
                '<p>Every year the Ministry of Religious Affairs announces the Hajj package and the registration schedule for private and government pilgrims. This article explains, step by step, what you need to do for Hajj 2027 (1448 AH).</p><h3>1. Pre-registration</h3><p>You need a valid NID and a mobile number. The pre-registration fee is paid through designated banks and you receive a tracking number.</p><h3>2. Final registration</h3><p>Once your serial is within the quota, you pay the remaining package price and submit your passport.</p><div class="dua">💡 <b>Tip:</b> keep your passport valid for at least 6 months beyond your return date.</div><h3>3. Visa and training</h3><p>Your agency submits your visa through Nusuk and invites you to pre-Hajj training sessions.</p>'],
            ['10-things-to-pack-for-umrah', 'umrah', '10 things to pack for Umrah', 'উমরাহর জন্য ১০টি প্রয়োজনীয় জিনিস', 'عشرة أشياء لحقيبة العمرة', 2, 9,
                '<p>Packing light but smart makes your Umrah easier. Here is our checklist after guiding thousands of pilgrims.</p><ol><li>Passport and printed visa</li><li>Two sets of Ihram</li><li>Comfortable sandals</li><li>Unscented soap</li><li>Personal medicine</li><li>Small backpack</li><li>Power bank</li><li>Foldable prayer mat</li><li>Dua book</li><li>Refillable water bottle</li></ol>'],
            ['ziyarah-in-madinah-places-not-to-miss', 'guide', 'Ziyarah in Madinah: the places you should not miss', 'মদিনার যিয়ারাহ: যে স্থানগুলো অবশ্যই দেখবেন', 'زيارة المدينة: أماكن لا تفوتها', 6, 15,
                '<p>Madinah is full of history from the life of the Prophet ﷺ. Our full-day Ziyarah covers Masjid Quba, Mount Uhud and the martyrs\' graveyard, Masjid al-Qiblatain and the Seven Mosques.</p><h3>Rawdah permit</h3><p>Book your Rawdah slot in the Nusuk app; our guides help every pilgrim do this.</p>'],
            ['women-and-hajj-mahram-rules-2027', 'guide', 'Women and Hajj: Mahram rules for 2027', 'নারী ও হজ্জ: ২০২৭ সালের মাহরাম নিয়ম', 'المرأة والحج: قواعد المحرم 2027', 4, 20,
                '<p>Saudi rules now allow women above 45 to travel in an organised group. We explain what documents you need and how our female guides support you.</p>'],
            ['installments-how-to-plan-hajj-budget', 'payment', 'Paying for Hajj in installments: how to plan your budget', 'কিস্তিতে হজ্জের খরচ: বাজেট পরিকল্পনা', 'دفع الحج بالتقسيط', 7, 26,
                '<p>With a deposit and up to four installments, most families can plan Hajj a year ahead. Use the installment calculator on any package page to see your schedule.</p>'],
            ['health-tips-for-hajj-heat', 'guide', 'Staying healthy in the Hajj heat', 'হজ্জের গরমে সুস্থ থাকার উপায়', 'الصحة في حر الحج', 5, 33,
                '<p>Drink water often, use an umbrella, rest between rites and carry oral saline. Our medical team travels with every Hajj group.</p>'],
        ];
        foreach ($posts as [$slug, $cat, $en, $bn, $ar, $img, $ago, $body]) {
            Post::create(['slug' => $slug, 'category' => $cat, 'title' => array_filter(['en' => $en, 'bn' => $bn, 'ar' => $ar]),
                'excerpt' => ['en' => strip_tags(explode('</p>', $body)[0])], 'body' => ['en' => $body], 'image' => "assets/img/img{$img}.jpg", 'read_minutes' => 5, 'published_at' => now()->subDays($ago)]);
        }

        $faqs = [
            ['hajj', 'Who can perform Hajj through your agency?', 'আপনাদের মাধ্যমে কারা হজ্জ করতে পারবেন?', 'من يمكنه الحج عبر وكالتكم؟', 'Any Bangladeshi Muslim with a passport valid for at least 6 months and completed pre-registration on the government Hajj portal. We handle registration for you.', '৬ মাস মেয়াদি পাসপোর্ট ও সরকারি পোর্টালে প্রাক-নিবন্ধন সম্পন্ন যেকোনো বাংলাদেশি মুসলিম। নিবন্ধন আমরাই করে দিই।'],
            ['payment', 'How do installments work?', 'কিস্তি কীভাবে কাজ করে?', 'كيف يعمل التقسيط؟', 'Pay a booking deposit (e.g. ৳ 50,000 for Hajj), then the balance in up to 4 scheduled installments before the final government payment deadline. Reminders come by SMS and WhatsApp.', 'বুকিং ডিপোজিট (যেমন হজ্জে ৳ ৫০,০০০) দিন, বাকিটা সর্বোচ্চ ৪ কিস্তিতে। এসএমএস ও হোয়াটসঅ্যাপে রিমাইন্ডার পাবেন।'],
            ['women', 'Is Mahram required for women?', 'নারীদের জন্য কি মাহরাম প্রয়োজন?', 'هل يشترط المحرم للنساء؟', 'Current Saudi rules allow women above 45 to travel in an organised group; we advise per the latest Ministry of Religious Affairs circular.', 'বর্তমান সৌদি নিয়মে ৪৫ বছরের বেশি নারীরা সংগঠিত গ্রুপে যেতে পারেন।'],
            ['visa', 'What documents are required?', 'কী কী কাগজপত্র লাগবে?', 'ما المستندات المطلوبة؟', 'Passport, NID, recent photo (white background), meningitis vaccine certificate, and for Umrah a return ticket. Upload them from your dashboard.', 'পাসপোর্ট, এনআইডি, সাদা ব্যাকগ্রাউন্ডের ছবি, মেনিনজাইটিস টিকা সনদ।'],
            ['payment', 'Can I get a refund if I cancel?', 'বাতিল করলে কি টাকা ফেরত পাব?', 'هل يمكن الاسترداد عند الإلغاء؟', 'Yes, as per our published refund policy; amounts already paid to airlines, Saudi Nusuk or government are deducted.', 'হ্যাঁ, রিফান্ড নীতিমালা অনুযায়ী; এয়ারলাইন, নুসুক বা সরকারকে প্রদত্ত অর্থ কেটে রাখা হয়।'],
            ['umrah', 'How long does an Umrah visa take?', 'উমরাহ ভিসা পেতে কত দিন লাগে?', 'كم تستغرق تأشيرة العمرة؟', 'Usually 5–7 working days after we receive a clear passport scan and photo.', 'সাধারণত ৫–৭ কর্মদিবস।'],
            ['payment', 'Which payment methods do you accept?', 'কোন কোন পেমেন্ট পদ্ধতি গ্রহণ করেন?', 'ما طرق الدفع المقبولة؟', 'bKash, Nagad, cards via SSLCommerz, bank transfer, and cash at our offices. You can also book now and pay later within the hold period.', 'বিকাশ, নগদ, কার্ড (SSLCommerz), ব্যাংক ট্রান্সফার ও অফিসে নগদ।'],
            ['hajj', 'Do you provide pre-Hajj training?', 'হজ্জ-পূর্ব প্রশিক্ষণ দেন কি?', 'هل تقدمون تدريباً قبل الحج؟', 'Yes, three sessions in Dhaka and online, led by our scholars, covering every rite step by step.', 'হ্যাঁ, ঢাকায় ও অনলাইনে তিনটি সেশন।'],
            ['umrah', 'Can I combine Umrah with a Dubai or Istanbul stopover?', 'উমরাহর সাথে দুবাই বা ইস্তাম্বুল যুক্ত করা যায়?', 'هل يمكن الجمع بين العمرة والتوقف في دبي؟', 'Yes, see our Tours & Ziyarah page for stopover packages.', 'হ্যাঁ, ট্যুর পেজ দেখুন।'],
            ['visa', 'Can I track my visa online?', 'অনলাইনে ভিসা ট্র্যাক করা যায়?', 'هل يمكن تتبع التأشيرة؟', 'Yes, use the tracker on the Visa page or your dashboard with your application ID.', 'হ্যাঁ, ভিসা পেজে বা ড্যাশবোর্ডে।'],
        ];
        foreach ($faqs as $i => [$cat, $q, $qb, $qa, $a, $ab]) {
            Faq::create(['category' => $cat, 'question' => ['en' => $q, 'bn' => $qb, 'ar' => $qa], 'answer' => ['en' => $a, 'bn' => $ab], 'sort' => $i]);
        }

        $gal = [[1, 'hajj-2025', 'Pilgrims at Masjid al-Haram'], [2, 'umrah', 'Masjid an-Nabawi at dusk'], [3, 'hajj-2025', 'Mina tents, Zone A'], [4, 'hajj-2025', 'Arafat – Day of Wuquf'], [5, 'umrah', 'Departure from Dhaka'],
            [6, 'ziyarah', 'Quba Mosque'], [7, 'ziyarah', 'Jabal al-Nour'], [8, 'umrah', 'Group photo, Makkah'], [9, 'hajj-2025', 'Pre-Hajj training'], [2, 'ziyarah', 'Mount Uhud'], [3, 'umrah', 'Rawdah visit']];
        foreach ($gal as $i => [$n, $album, $cap]) {
            GalleryItem::create(['album' => $album, 'type' => 'image', 'path' => "assets/img/img{$n}.jpg", 'caption' => ['en' => $cap], 'sort' => $i]);
        }
        GalleryItem::create(['album' => 'videos', 'type' => 'video', 'path' => 'assets/img/img4.jpg', 'url' => 'https://www.youtube.com/', 'caption' => ['en' => 'Hajj 2025 journey with our group'], 'sort' => 99]);

        $std = Package::where('slug', 'standard-hajj-2027')->first();
        $rev = [['Abdur Rahim', 'Dhaka', 'Hajj 2025', 'Everything from Mina tents to Madinah hotel was exactly as promised. The guide explained each ritual in Bangla.'],
            ['Nasrin Akter', 'Chattogram', 'Umrah 2026', 'I travelled with my mother. The team cared for us like family; dashboard showed visa status every day.'],
            ['Md. Kamal Hossain', 'Sylhet', 'Hajj 2024', 'Installment plan made Hajj possible for me. Transparent pricing, no hidden charges.'],
            ['Shirin Sultana', 'Rajshahi', 'Umrah 2025', 'Hotel was really 750 m from the Haram as written. Food was Bangladeshi and fresh.'],
            ['Habibur Rahman', 'Khulna', 'Hajj 2025', 'Mufti sahib was with us at every step in Arafat and Muzdalifah. Highly recommended.']];
        foreach ($rev as $i => [$n, $c, $trip, $body]) {
            Review::create(['package_id' => $i < 3 ? $std?->id : null, 'name' => $n, 'city' => $c, 'trip' => $trip, 'rating' => 5, 'body' => $body]);
        }
    }
}
