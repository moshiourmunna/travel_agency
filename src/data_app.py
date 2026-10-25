"""Dummy data for the traveller portal and the admin console (deterministic)."""
import random
from core import B
import data_public as P

R = random.Random(26)

USER = dict(name=B('Farhana Rahman', 'ফারহানা রহমান'), first=B('Farhana', 'ফারহানা'), ini='FR', email='farhana.rahman@gmail.com', phone='+880 1712-345678',
            city=B('Dhanmondi, Dhaka', 'ধানমন্ডি, ঢাকা'), since='2021-03-14', tier=B('Gold', 'গোল্ড'), miles=18450, next_tier=25000, wallet=6800, dob='1991-07-22',
            nid='•••• •••• 4821', passport='EH0•••••7', passport_exp='2031-02-18', gender=B('Female', 'নারী'), referral='FARHANA500')

ST = {  # status key -> (label, badge classes)
 'confirmed': (B('Confirmed', 'নিশ্চিত'), 'bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-300'),
 'pending':   (B('Pending payment', 'পেমেন্ট বাকি'), 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300'),
 'partial':   (B('Part-paid', 'আংশিক পরিশোধিত'), 'bg-sky-50 text-sky-800 ring-sky-600/20 dark:bg-sky-900/30 dark:text-sky-300'),
 'completed': (B('Completed', 'সম্পন্ন'), 'bg-ink-100 text-ink-700 ring-ink-500/20 dark:bg-ink-800 dark:text-ink-200'),
 'cancelled': (B('Cancelled', 'বাতিল'), 'bg-rose-50 text-rose-800 ring-rose-600/20 dark:bg-rose-900/30 dark:text-rose-300'),
 'refunded':  (B('Refunded', 'রিফান্ড হয়েছে'), 'bg-violet-50 text-violet-800 ring-violet-600/20 dark:bg-violet-900/30 dark:text-violet-300'),
 'new':       (B('New', 'নতুন'), 'bg-sky-50 text-sky-800 ring-sky-600/20 dark:bg-sky-900/30 dark:text-sky-300'),
 'contacted': (B('Contacted', 'যোগাযোগ হয়েছে'), 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300'),
 'quoted':    (B('Quoted', 'কোটেশন পাঠানো'), 'bg-violet-50 text-violet-800 ring-violet-600/20 dark:bg-violet-900/30 dark:text-violet-300'),
 'won':       (B('Won', 'সফল'), 'bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-300'),
 'lost':      (B('Lost', 'হাতছাড়া'), 'bg-rose-50 text-rose-800 ring-rose-600/20 dark:bg-rose-900/30 dark:text-rose-300'),
 'published': (B('Published', 'প্রকাশিত'), 'bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-300'),
 'draft':     (B('Draft', 'খসড়া'), 'bg-ink-100 text-ink-700 ring-ink-500/20 dark:bg-ink-800 dark:text-ink-200'),
 'active':    (B('Active', 'সক্রিয়'), 'bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-300'),
 'expired':   (B('Expired', 'মেয়াদোত্তীর্ণ'), 'bg-ink-100 text-ink-700 ring-ink-500/20 dark:bg-ink-800 dark:text-ink-200'),
 'scheduled': (B('Scheduled', 'নির্ধারিত'), 'bg-sky-50 text-sky-800 ring-sky-600/20 dark:bg-sky-900/30 dark:text-sky-300'),
 'open':      (B('Open', 'খোলা'), 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300'),
 'resolved':  (B('Resolved', 'সমাধান হয়েছে'), 'bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-300'),
 'awaiting':  (B('Awaiting reply', 'উত্তরের অপেক্ষায়'), 'bg-sky-50 text-sky-800 ring-sky-600/20 dark:bg-sky-900/30 dark:text-sky-300'),
 'success':   (B('Successful', 'সফল'), 'bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-300'),
 'failed':    (B('Failed', 'ব্যর্থ'), 'bg-rose-50 text-rose-800 ring-rose-600/20 dark:bg-rose-900/30 dark:text-rose-300'),
 'review':    (B('In review', 'পর্যালোচনায়'), 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300'),
 'approved':  (B('Approved', 'অনুমোদিত'), 'bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-300'),
 'hidden':    (B('Hidden', 'লুকানো'), 'bg-rose-50 text-rose-800 ring-rose-600/20 dark:bg-rose-900/30 dark:text-rose-300'),
 'suspended': (B('Suspended', 'স্থগিত'), 'bg-rose-50 text-rose-800 ring-rose-600/20 dark:bg-rose-900/30 dark:text-rose-300'),
 'submitted': (B('Submitted', 'জমা হয়েছে'), 'bg-sky-50 text-sky-800 ring-sky-600/20 dark:bg-sky-900/30 dark:text-sky-300'),
 'docs':      (B('Documents needed', 'কাগজ প্রয়োজন'), 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300'),
 'embassy':   (B('At embassy', 'দূতাবাসে'), 'bg-violet-50 text-violet-800 ring-violet-600/20 dark:bg-violet-900/30 dark:text-violet-300'),
}
KIND = {'tour': ('map', B('Holiday package', 'হলিডে প্যাকেজ')), 'cruise': ('ship', B('Cruise', 'ক্রুজ')), 'flight': ('plane', B('Flight', 'ফ্লাইট')),
        'hotel': ('hotel', B('Hotel', 'হোটেল')), 'visa': ('stamp', B('Visa', 'ভিসা')), 'activity': ('ticket', B('Activity', 'অ্যাক্টিভিটি'))}

T, CR, AC, HO, VI = P.TOUR, P.CRUISE, P.ACTIVITY, P.HOTEL, P.VISA

# ---------------- traveller bookings ----------------
MY_BOOKINGS = [
 dict(ref='MSF-26-48213', kind='tour', slug='maldives-honeymoon', title=T['maldives-honeymoon']['title'], img='maldives', start='2026-12-12', end='2026-12-16', pax=2, total=289000, paid=86700, status='partial',
      sub=B('Water villa · 4 nights · 2 adults', 'ওয়াটার ভিলা · ৪ রাত · ২ প্রাপ্তবয়স্ক'), booked='2026-09-28', upcoming=True),
 dict(ref='MSF-26-48377', kind='flight', slug=None, title=B('Dhaka → Malé (BS 341)', 'ঢাকা → মালে (BS 341)'), img='maldives', start='2026-12-12', end='2026-12-12', pax=2, total=76900, paid=76900, status='confirmed',
      sub=B('US-Bangla · 09:15 → 12:35 · PNR K7Q2ZM', 'ইউএস-বাংলা · ০৯:১৫ → ১২:৩৫ · পিএনআর K7Q2ZM'), booked='2026-09-28', upcoming=True),
 dict(ref='MSF-26-49102', kind='cruise', slug='singapore-penang-phuket', title=CR['singapore-penang-phuket']['title'], img='cruise', start='2027-02-14', end='2027-02-18', pax=3, total=205500, paid=61650, status='partial',
      sub=B('Ocean-view cabin · 4 nights · 2 adults, 1 child', 'সমুদ্রমুখী কেবিন · ৪ রাত · ২ প্রাপ্তবয়স্ক, ১ শিশু'), booked='2026-10-11', upcoming=True),
 dict(ref='MSF-26-49388', kind='visa', slug='thailand', title=B('Thailand tourist e-Visa', 'থাইল্যান্ড ট্যুরিস্ট ই-ভিসা'), img='phuket', start='2026-11-02', end='2026-11-14', pax=2, total=13000, paid=13000, status='confirmed',
      sub=B('2 applicants · Stage 3 of 5 — at embassy', '২ জন আবেদনকারী · ধাপ ৩/৫ — দূতাবাসে'), booked='2026-10-20', upcoming=True),
 dict(ref='MSF-26-49415', kind='activity', slug='saint-martin-day-cruise', title=AC['saint-martin-day-cruise']['title'], img=AC['saint-martin-day-cruise']['img'], start='2026-11-21', end='2026-11-21', pax=4, total=AC['saint-martin-day-cruise']['price']*4, paid=0, status='pending',
      sub=B('4 travellers · Free cancellation until 20 Nov', '৪ জন · ২০ নভেম্বর পর্যন্ত ফ্রি বাতিল'), booked='2026-10-24', upcoming=True),
 dict(ref='MSF-26-41020', kind='tour', slug='sajek-rangamati', title=T['sajek-rangamati']['title'], img=T['sajek-rangamati']['img'], start='2026-07-18', end='2026-07-21', pax=2, total=2*T['sajek-rangamati']['price'], paid=2*T['sajek-rangamati']['price'], status='completed',
      sub=B('3 nights · 2 adults', '৩ রাত · ২ প্রাপ্তবয়স্ক'), booked='2026-06-02', upcoming=False),
 dict(ref='MSF-26-39811', kind='hotel', slug='ocean-pearl-resort', title=HO['ocean-pearl-resort']['name'], img='resort', start='2026-04-10', end='2026-04-13', pax=2, total=43500, paid=43500, status='completed',
      sub=B('Deluxe sea view · 3 nights · breakfast', 'ডিলাক্স সি-ভিউ · ৩ রাত · নাশতা'), booked='2026-03-01', upcoming=False),
 dict(ref='MSF-25-31207', kind='tour', slug='bali-highlights', title=T['bali-highlights']['title'], img=T['bali-highlights']['img'], start='2025-12-20', end='2025-12-25', pax=2, total=2*T['bali-highlights']['price'], paid=2*T['bali-highlights']['price'], status='completed',
      sub=B('5 nights · 2 adults', '৫ রাত · ২ প্রাপ্তবয়স্ক'), booked='2025-10-04', upcoming=False),
 dict(ref='MSF-26-44590', kind='flight', slug=None, title=B('Dhaka → Kathmandu (BG 701)', 'ঢাকা → কাঠমান্ডু (BG 701)'), img='nepal', start='2026-08-30', end='2026-08-30', pax=1, total=21400, paid=21400, status='refunded',
      sub=B('Cancelled by traveller · refunded to bKash', 'ভ্রমণকারী বাতিল করেছেন · বিকাশে রিফান্ড'), booked='2026-07-12', upcoming=False),
 dict(ref='MSF-26-45102', kind='activity', slug='dubai-desert-safari', title=AC['dubai-desert-safari']['title'], img=AC['dubai-desert-safari']['img'], start='2026-09-05', end='2026-09-05', pax=2, total=2*AC['dubai-desert-safari']['price'], paid=0, status='cancelled',
      sub=B('Cancelled within free window — no charge', 'ফ্রি সময়ের মধ্যে বাতিল — কোনো চার্জ নেই'), booked='2026-08-10', upcoming=False),
]
MYB = {b['ref']: b for b in MY_BOOKINGS}
FEATURED = MY_BOOKINGS[0]
TRAVELLERS = [
 dict(name=B('Farhana Rahman', 'ফারহানা রহমান'), rel=B('You', 'আপনি'), dob='1991-07-22', passport='EH0•••••7', exp='2031-02-18', ini='FR', ok=True),
 dict(name=B('Shafiqul Islam', 'শফিকুল ইসলাম'), rel=B('Spouse', 'স্বামী'), dob='1988-01-09', passport='EG9•••••2', exp='2027-03-30', ini='SI', ok=True),
 dict(name=B('Ayaan Islam', 'আয়ান ইসলাম'), rel=B('Child (8)', 'সন্তান (৮)'), dob='2018-05-17', passport='EJ1•••••4', exp='2026-12-30', ini='AI', ok=False),
]
INSTALMENTS = [('2026-09-28', 86700, 'paid', 'bKash'), ('2026-10-28', 101150, 'due', None), ('2026-11-27', 101150, 'upcoming', None)]
VISA_STAGES = [(B('Application submitted', 'আবেদন জমা'), '2026-10-20', 'done'), (B('Documents verified', 'কাগজপত্র যাচাই'), '2026-10-22', 'done'),
               (B('Submitted to embassy', 'দূতাবাসে জমা'), '2026-10-24', 'current'), (B('Decision', 'সিদ্ধান্ত'), None, 'todo'), (B('Passport / e-Visa delivered', 'পাসপোর্ট / ই-ভিসা হস্তান্তর'), None, 'todo')]
VISA_APPS = [
 dict(ref='VSA-26-1182', country=B('Thailand', 'থাইল্যান্ড'), flag='🇹🇭', vtype=B('Tourist e-Visa', 'ট্যুরিস্ট ই-ভিসা'), who=B('Farhana Rahman', 'ফারহানা রহমান'), status='embassy', eta='2026-11-04', stage=3),
 dict(ref='VSA-26-1183', country=B('Thailand', 'থাইল্যান্ড'), flag='🇹🇭', vtype=B('Tourist e-Visa', 'ট্যুরিস্ট ই-ভিসা'), who=B('Shafiqul Islam', 'শফিকুল ইসলাম'), status='docs', eta='2026-11-06', stage=2),
 dict(ref='VSA-26-0874', country=B('Malaysia', 'মালয়েশিয়া'), flag='🇲🇾', vtype=B('eVISA (tourist)', 'ই-ভিসা (ট্যুরিস্ট)'), who=B('Farhana Rahman', 'ফারহানা রহমান'), status='approved', eta='2026-06-12', stage=5),
]
WALLET_TX = [
 ('2026-10-24', B('Referral bonus — Nabila joined', 'রেফারেল বোনাস — নাবিলা যোগ দিয়েছেন'), 500, 'credit', 'gift'),
 ('2026-09-28', B('Paid toward MSF-26-48213', 'MSF-26-48213-এ পরিশোধ'), -2000, 'debit', 'wallet'),
 ('2026-09-02', B('Refund — MSF-26-44590 (flight)', 'রিফান্ড — MSF-26-44590 (ফ্লাইট)'), 4200, 'credit', 'rotate-ccw'),
 ('2026-07-25', B('Cashback — Sajek tour review', 'ক্যাশব্যাক — সাজেক ট্যুর রিভিউ'), 300, 'credit', 'star'),
 ('2026-04-14', B('Gift card redeemed GC-7781', 'গিফট কার্ড রিডিম GC-7781'), 3000, 'credit', 'gift'),
 ('2026-03-01', B('Paid toward MSF-26-39811', 'MSF-26-39811-এ পরিশোধ'), -1200, 'debit', 'wallet'),
]
MILES_TX = [('2026-10-11', B('Cruise booking MSF-26-49102', 'ক্রুজ বুকিং MSF-26-49102'), 2055), ('2026-09-28', B('Maldives honeymoon MSF-26-48213', 'মালদ্বীপ হানিমুন MSF-26-48213'), 2890),
            ('2026-07-21', B('Sajek & Rangamati trip completed', 'সাজেক ও রাঙামাটি ট্রিপ সম্পন্ন'), 1240), ('2026-07-21', B('Review bonus', 'রিভিউ বোনাস'), 250), ('2026-04-13', B('Ocean Pearl Resort stay', 'ওশান পার্ল রিসোর্টে অবস্থান'), 435)]
TIERS = [(B('Blue', 'ব্লু'), 0, B('Member prices, Miles on every booking', 'সদস্য মূল্য, প্রতিটি বুকিংয়ে মাইলস')), (B('Silver', 'সিলভার'), 8000, B('+2% extra Miles, priority WhatsApp', '+২% অতিরিক্ত মাইলস, অগ্রাধিকার হোয়াটসঅ্যাপ')),
         (B('Gold', 'গোল্ড'), 15000, B('Free date change once per trip, lounge deals', 'প্রতি ট্রিপে একবার ফ্রি তারিখ পরিবর্তন, লাউঞ্জ অফার')), (B('Platinum', 'প্লাটিনাম'), 25000, B('Dedicated travel manager, room upgrades', 'ডেডিকেটেড ট্রাভেল ম্যানেজার, রুম আপগ্রেড'))]
SAVED_PAY = [('bkash', 'bKash', '017••••5678', True), ('visa', 'Visa · City Bank', '•••• 4421 · 08/28', False), ('nagad', 'Nagad', '018••••9012', False)]
NOTIFS = [
 ('wallet', B('Instalment 2 of 3 due on 28 Oct', 'কিস্তি ২/৩ — ২৮ অক্টোবর পরিশোধযোগ্য'), B('৳ 1,01,150 for Maldives Water-Villa Honeymoon. Pay with bKash, Nagad or card.', 'মালদ্বীপ ওয়াটার-ভিলা হানিমুনের জন্য ৳ ১,০১,১৫০। বিকাশ, নগদ বা কার্ডে পরিশোধ করুন।'), '2 h', True, 'booking'),
 ('stamp', B('Thailand visa reached the embassy', 'থাইল্যান্ড ভিসা দূতাবাসে পৌঁছেছে'), B('Farhana Rahman · VSA-26-1182 · expected decision 4 Nov', 'ফারহানা রহমান · VSA-26-1182 · সম্ভাব্য সিদ্ধান্ত ৪ নভেম্বর'), '1 d', True, 'visa'),
 ('file-warning', B('Shafiqul’s bank statement is needed', 'শফিকুলের ব্যাংক স্টেটমেন্ট প্রয়োজন'), B('Upload a 6-month statement with seal to keep VSA-26-1183 on schedule.', 'VSA-26-1183 সময়মতো রাখতে সিলসহ ৬ মাসের স্টেটমেন্ট আপলোড করুন।'), '1 d', True, 'visa'),
 ('passport', B('Ayaan’s passport expires in 2 months', 'আয়ানের পাসপোর্টের মেয়াদ ২ মাসে শেষ'), B('Most countries need 6 months’ validity. Renew before the February cruise.', 'বেশিরভাগ দেশে ৬ মাস মেয়াদ লাগে। ফেব্রুয়ারির ক্রুজের আগে নবায়ন করুন।'), '3 d', False, 'traveller'),
 ('tag', B('Members-only: 12% off Nepal & Bhutan', 'শুধু সদস্যদের জন্য: নেপাল ও ভুটানে ১২% ছাড়'), B('Gold members get an extra 2,000 Miles until 30 Nov.', 'গোল্ড সদস্যরা ৩০ নভেম্বর পর্যন্ত অতিরিক্ত ২,০০০ মাইলস পাবেন।'), '5 d', False, 'offer'),
 ('star', B('How was Sajek & Rangamati?', 'সাজেক ও রাঙামাটি কেমন লেগেছে?'), B('Thanks — your review earned 250 Miles.', 'ধন্যবাদ — আপনার রিভিউ থেকে ২৫০ মাইলস পেয়েছেন।'), '3 mo', False, 'review'),
]
TICKETS = [
 dict(ref='TKT-8812', subj=B('Change Maldives villa to overwater sunset villa', 'মালদ্বীপের ভিলা সানসেট ওভারওয়াটার ভিলায় পরিবর্তন'), status='awaiting', upd='2026-10-24', agent=B('Nadia Islam', 'নাদিয়া ইসলাম')),
 dict(ref='TKT-8650', subj=B('Seat selection for BS 341', 'BS 341-এর সিট নির্বাচন'), status='resolved', upd='2026-10-02', agent=B('Rafi Ahmed', 'রাফি আহমেদ')),
 dict(ref='TKT-8104', subj=B('Refund status — Kathmandu flight', 'রিফান্ড স্ট্যাটাস — কাঠমান্ডু ফ্লাইট'), status='resolved', upd='2026-09-02', agent=B('Rafi Ahmed', 'রাফি আহমেদ')),
]
CHAT = [('agent', B('Hi Farhana! I have checked the resort: a sunset overwater villa is available for 12–16 Dec for ৳ 18,000 extra in total. Shall I hold it for 24 hours?', 'হাই ফারহানা! রিসোর্টে দেখেছি: ১২–১৬ ডিসেম্বর সানসেট ওভারওয়াটার ভিলা পাওয়া যাচ্ছে, মোট ৳ ১৮,০০০ অতিরিক্ত। ২৪ ঘণ্টার জন্য হোল্ড করব?'), '24 Oct, 4:12 PM'),
        ('me', B('Yes please, hold it. Can the extra be added to the next instalment?', 'হ্যাঁ, হোল্ড করুন। অতিরিক্ত টাকা কি পরের কিস্তিতে যোগ করা যাবে?'), '24 Oct, 4:20 PM'),
        ('agent', B('Done — held until 25 Oct, 4:20 PM. I will send the revised invoice in a moment.', 'হয়ে গেছে — ২৫ অক্টোবর বিকেল ৪:২০ পর্যন্ত হোল্ড। সংশোধিত ইনভয়েস এখনই পাঠাচ্ছি।'), '24 Oct, 4:23 PM')]
MY_REVIEWS = [dict(ref='MSF-26-41020', title=T['sajek-rangamati']['title'], rating=5, date='2026-07-25', text=B('Cottage above the clouds, great guide, perfectly timed jeep rides.', 'মেঘের ওপর কটেজ, দারুণ গাইড, জিপ যাত্রার সময় একদম ঠিকঠাক।')),
              dict(ref='MSF-26-39811', title=HO['ocean-pearl-resort']['name'], rating=4, date='2026-04-15', text=B('Lovely pool and breakfast; check-in took a while.', 'চমৎকার পুল ও নাশতা; চেক-ইনে একটু সময় লেগেছে।'))]
REFERRALS = [(B('Nabila Chowdhury', 'নাবিলা চৌধুরী'), '2026-10-24', 'won', 500), (B('Imran Hossain', 'ইমরান হোসেন'), '2026-09-18', 'won', 500), (B('Sadia Akter', 'সাদিয়া আক্তার'), '2026-10-21', 'pending', 0)]
SAVED_TRIPS = [dict(name=B('Nepal + Bhutan, 9 days', 'নেপাল + ভুটান, ৯ দিন'), dests=['nepal', 'bhutan'], days=9, pax=B('2 adults', '২ প্রাপ্তবয়স্ক'), est=212000, upd='2026-10-19'),
               dict(name=B('Family Bali escape, 6 days', 'পরিবার নিয়ে বালি, ৬ দিন'), dests=['bali'], days=6, pax=B('2 adults, 1 child', '২ প্রাপ্তবয়স্ক, ১ শিশু'), est=231500, upd='2026-09-30')]

# ---------------- admin ----------------
FIRST = ['Tanvir', 'Nusrat', 'Rakib', 'Sumaiya', 'Mahmud', 'Farzana', 'Arif', 'Tasnim', 'Shakil', 'Mehjabin', 'Imran', 'Rumana', 'Sabbir', 'Lamia', 'Kamrul', 'Nabila', 'Zahid', 'Ishrat', 'Rezaul', 'Anika']
FIRST_BN = ['তানভীর', 'নুসরাত', 'রাকিব', 'সুমাইয়া', 'মাহমুদ', 'ফারজানা', 'আরিফ', 'তাসনিম', 'শাকিল', 'মেহজাবিন', 'ইমরান', 'রুমানা', 'সাব্বির', 'লামিয়া', 'কামরুল', 'নাবিলা', 'জাহিদ', 'ইশরাত', 'রেজাউল', 'আনিকা']
LAST = [('Ahmed', 'আহমেদ'), ('Hossain', 'হোসেন'), ('Chowdhury', 'চৌধুরী'), ('Rahman', 'রহমান'), ('Islam', 'ইসলাম'), ('Khan', 'খান'), ('Sarker', 'সরকার'), ('Akter', 'আক্তার'), ('Mollah', 'মোল্লা'), ('Talukder', 'তালুকদার')]
CITIES = [B('Dhaka', 'ঢাকা'), B('Chattogram', 'চট্টগ্রাম'), B('Sylhet', 'সিলেট'), B('Khulna', 'খুলনা'), B('Rajshahi', 'রাজশাহী'), B('Gazipur', 'গাজীপুর'), B('Cumilla', 'কুমিল্লা')]
CHANNELS = [('web', B('Website', 'ওয়েবসাইট')), ('app', B('App', 'অ্যাপ')), ('wa', B('WhatsApp', 'হোয়াটসঅ্যাপ')), ('agent', B('B2B agent', 'বিটুবি এজেন্ট')), ('walkin', B('Branch', 'শাখা'))]
METHODS = ['bKash', 'Nagad', 'Card · SSLCommerz', 'Bank transfer', 'Rocket', 'EMI · City Bank']

def person(i):
    f = i % len(FIRST); l = LAST[(i * 7 + 3) % len(LAST)]
    return B(f'{FIRST[f]} {l[0]}', f'{FIRST_BN[f]} {l[1]}'), FIRST[f][0] + l[0][0]

PRODUCTS = ([('tour', x['slug'], x['title'], x['price'], x['img']) for x in P.TOURS] + [('cruise', c['slug'], c['title'], c['price'], c['img']) for c in P.CRUISES] +
            [('activity', a['slug'], a['title'], a['price'], a['img']) for a in P.ACTIVITIES] + [('hotel', h['slug'], h['name'], h['price'] * 3, h['img']) for h in P.HOTELS] +
            [('visa', v['slug'], B(v['country']['en'] + ' visa', v['country']['bn'] + ' ভিসা'), v['fee'], v['img']) for v in P.VISAS])
ADMIN_BOOKINGS = []
_sts = ['confirmed'] * 6 + ['pending'] * 3 + ['partial'] * 4 + ['completed'] * 3 + ['cancelled', 'refunded']
for i in range(36):
    k, slug, title, price, im = PRODUCTS[(i * 5 + 2) % len(PRODUCTS)]
    pax = R.choice([1, 2, 2, 2, 3, 4, 5]) if k not in ('hotel',) else R.choice([1, 2])
    total = price * pax; st = _sts[i % len(_sts)]
    paid = total if st in ('confirmed', 'completed') else (round(total * 0.3) if st == 'partial' else (total if st == 'refunded' else 0))
    nm, ini = person(i)
    d = 24 - (i % 24); m = 10 if i < 24 else 9
    trav = f'2026-{11 + (i % 2):02d}-{(i * 3) % 27 + 1:02d}' if st not in ('completed',) else f'2026-0{(i % 8) + 1}-{(i * 3) % 27 + 1:02d}'
    ADMIN_BOOKINGS.append(dict(ref=f'MSF-26-{49450 - i * 37}', kind=k, slug=slug, title=title, img=im, cust=nm, ini=ini, phone=f'+880 17{(i*37)%90+10:02d}-{(i*7919)%900000+100000}',
        city=CITIES[i % len(CITIES)], pax=pax, total=total, paid=paid, status=st, created=f'2026-{m:02d}-{d:02d}', travel=trav, channel=CHANNELS[i % len(CHANNELS)], method=METHODS[i % len(METHODS)],
        agent=['Nadia Islam', 'Rafi Ahmed', 'Sohel Rana', 'Mitu Akter'][i % 4]))
ADMIN_BOOKINGS[0].update(cust=B('Farhana Rahman', 'ফারহানা রহমান'), ini='FR', ref='MSF-26-48213', kind='tour', slug='maldives-honeymoon', title=T['maldives-honeymoon']['title'], img='maldives',
                         pax=2, total=289000, paid=86700, status='partial', travel='2026-12-12', created='2026-09-28', city=CITIES[0], method='bKash', channel=CHANNELS[0], agent='Nadia Islam')
CUSTOMERS = []
for i in range(24):
    nm, ini = person(i + 3)
    CUSTOMERS.append(dict(id=f'CU-{10240 + i * 13}', name=nm, ini=ini, email=f"{FIRST[(i+3) % 20].lower()}.{LAST[((i+3)*7+3) % 10][0].lower()}@{['gmail.com','yahoo.com','outlook.com','musafir.test'][i % 4]}",
        phone=f'+880 1{[7,8,9,5,6,3][i % 6]}{(i*53)%90+10:02d}-{(i*7213)%900000+100000}', city=CITIES[i % len(CITIES)], trips=(i * 7) % 9 + 1, spend=((i * 37) % 40 + 4) * 9500,
        tier=TIERS[min(3, (i * 5) % 4)][0], since=f'20{20 + i % 6}-0{i % 9 + 1}-1{i % 9}', status='suspended' if i == 11 else 'active', seg=['Family', 'Couple', 'Solo', 'Corporate', 'Group'][i % 5]))
CUSTOMERS[0].update(name=B('Farhana Rahman', 'ফারহানা রহমান'), ini='FR', email='farhana.rahman@gmail.com', phone='+880 1712-345678', trips=9, spend=812400, tier=B('Gold', 'গোল্ড'), since='2021-03-14', seg='Couple')
LEADS = []
_lsrc = [B('Website enquiry', 'ওয়েবসাইট অনুসন্ধান'), B('Trip planner', 'ট্রিপ প্ল্যানার'), B('WhatsApp', 'হোয়াটসঅ্যাপ'), B('Facebook ad', 'ফেসবুক বিজ্ঞাপন'), B('Walk-in', 'সরাসরি'), B('Corporate RFQ', 'কর্পোরেট আরএফকিউ')]
_lneed = [B('Maldives honeymoon, Dec, 2 pax', 'মালদ্বীপ হানিমুন, ডিসেম্বর, ২ জন'), B('Bhutan family trip, 4 pax', 'ভুটান পারিবারিক ট্রিপ, ৪ জন'), B('Corporate retreat Cox’s Bazar, 40 pax', 'কর্পোরেট রিট্রিট কক্সবাজার, ৪০ জন'),
          B('Singapore cruise, Feb, 3 pax', 'সিঙ্গাপুর ক্রুজ, ফেব্রুয়ারি, ৩ জন'), B('Japan sakura tour, Apr, 2 pax', 'জাপান সাকুরা ট্যুর, এপ্রিল, ২ জন'), B('Schengen visa + Europe tour', 'শেনজেন ভিসা + ইউরোপ ট্যুর'),
          B('Nepal trekking, 6 pax', 'নেপাল ট্রেকিং, ৬ জন'), B('Thailand visa only, 2 pax', 'শুধু থাইল্যান্ড ভিসা, ২ জন'), B('Sundarbans school trip, 55 pax', 'সুন্দরবন স্কুল ট্রিপ, ৫৫ জন'), B('Dubai shopping trip, 5 pax', 'দুবাই শপিং ট্রিপ, ৫ জন')]
for i in range(15):
    nm, ini = person(i + 9)
    LEADS.append(dict(id=f'LD-{3301 + i}', name=nm, ini=ini, need=_lneed[i % len(_lneed)], src=_lsrc[i % len(_lsrc)], value=[289000, 196000, 720000, 205500, 398000, 455000, 168000, 13000, 247500, 320000][i % 10],
                      stage=['new', 'new', 'contacted', 'quoted', 'contacted', 'quoted', 'won', 'new', 'lost', 'quoted', 'contacted', 'won', 'new', 'quoted', 'contacted'][i], owner=['Nadia', 'Rafi', 'Sohel', 'Mitu'][i % 4], age=['12 m', '1 h', '3 h', '1 d', '2 d', '3 d', '4 d', '6 d'][i % 8]))
PAYMENTS = []
for i, b in enumerate(ADMIN_BOOKINGS[:28]):
    if b['paid'] == 0 and b['status'] != 'pending': continue
    PAYMENTS.append(dict(txn=f'TXN{88412060 - i * 7331}', ref=b['ref'], cust=b['cust'], amount=b['paid'] or round(b['total'] * 0.3), method=b['method'], date=b['created'],
                         status='failed' if i == 5 else ('refunded' if b['status'] == 'refunded' else ('pending' if b['status'] == 'pending' else 'success')), fee=round((b['paid'] or b['total'] * 0.3) * 0.0185)))
COUPONS = [('WINTER26', B('Winter beach sale', 'শীতের সৈকত সেল'), '20%', 412, 1000, '2026-11-30', 'active'), ('MUSAFIR10', B('Welcome — first booking', 'স্বাগত — প্রথম বুকিং'), '10%', 2860, None, '2026-12-31', 'active'),
           ('CRUISE10', B('Cruise season', 'ক্রুজ সিজন'), '10%', 133, 500, '2026-12-15', 'active'), ('BKASH1500', B('bKash cashback', 'বিকাশ ক্যাশব্যাক'), '৳ 1,500', 980, 2000, '2026-11-15', 'active'),
           ('MONSOON26', B('Monsoon flash sale', 'বর্ষার ফ্ল্যাশ সেল'), '12%', 1500, 1500, '2026-06-20', 'expired'), ('NEWYEAR27', B('New Year 2027', 'নববর্ষ ২০২৭'), '15%', 0, 800, '2027-01-05', 'scheduled'),
           ('CORP8', B('Corporate partners', 'কর্পোরেট পার্টনার'), '8%', 76, None, '2027-06-30', 'active')]
ADMIN_REVIEWS = [(r['name'], r['trip'], r['rating'], r['date'], r['text'], ['published', 'published', 'review', 'published', 'review', 'hidden'][i], r['ini']) for i, r in enumerate(P.REVIEWS)]
AGENTS = [('AG-118', B('Sky Route Travels', 'স্কাই রুট ট্রাভেলস'), B('Chattogram', 'চট্টগ্রাম'), 182, 4210000, '7%', 'active', 85000), ('AG-121', B('Green Valley Tours', 'গ্রিন ভ্যালি ট্যুরস'), B('Sylhet', 'সিলেট'), 96, 1980000, '6%', 'active', 12000),
          ('AG-133', B('Padma Holidays', 'পদ্মা হলিডেজ'), B('Rajshahi', 'রাজশাহী'), 54, 1120000, '6%', 'active', 4500), ('AG-140', B('Blue Bay Travel Desk', 'ব্লু বে ট্রাভেল ডেস্ক'), B('Khulna', 'খুলনা'), 31, 640000, '5%', 'review', 0),
          ('AG-145', B('Metro Trip Point', 'মেট্রো ট্রিপ পয়েন্ট'), B('Dhaka', 'ঢাকা'), 12, 210000, '5%', 'suspended', -6500)]
STAFF = [('Ahmed Zubair', 'AZ', B('Owner', 'মালিক'), 'owner', B('Head office', 'প্রধান কার্যালয়'), '2 min'), ('Nadia Islam', 'NI', B('Sales manager', 'সেলস ম্যানেজার'), 'manager', B('Banani', 'বনানী'), '5 min'),
         ('Rafi Ahmed', 'RA', B('Reservations', 'রিজারভেশন'), 'agent', B('Banani', 'বনানী'), '12 min'), ('Sohel Rana', 'SR', B('Visa officer', 'ভিসা অফিসার'), 'visa', B('Banani', 'বনানী'), '1 h'),
         ('Mitu Akter', 'MA', B('Customer care', 'কাস্টমার কেয়ার'), 'support', B('Chattogram', 'চট্টগ্রাম'), '3 h'), ('Kazi Fahim', 'KF', B('Accounts', 'হিসাব'), 'finance', B('Head office', 'প্রধান কার্যালয়'), '1 d'),
         ('Tania Sultana', 'TS', B('Content editor', 'কনটেন্ট এডিটর'), 'editor', B('Remote', 'রিমোট'), '2 d')]
ROLES = [('owner', B('Owner', 'মালিক')), ('manager', B('Manager', 'ম্যানেজার')), ('agent', B('Reservations', 'রিজারভেশন')), ('visa', B('Visa officer', 'ভিসা অফিসার')), ('support', B('Support', 'সাপোর্ট')), ('finance', B('Finance', 'ফাইন্যান্স')), ('editor', B('Editor', 'এডিটর'))]
PERMS = [(B('Bookings', 'বুকিং'), 'owner manager agent support finance'), (B('Refunds & payments', 'রিফান্ড ও পেমেন্ট'), 'owner manager finance'), (B('Catalog (tours, cruises, activities)', 'ক্যাটালগ (ট্যুর, ক্রুজ, অ্যাক্টিভিটি)'), 'owner manager editor'),
         (B('Visa applications', 'ভিসা আবেদন'), 'owner manager visa'), (B('Customers & PII', 'গ্রাহক ও ব্যক্তিগত তথ্য'), 'owner manager agent support'), (B('Content & media', 'কনটেন্ট ও মিডিয়া'), 'owner editor'),
         (B('Coupons & pricing', 'কুপন ও মূল্য'), 'owner manager'), (B('Reports', 'রিপোর্ট'), 'owner manager finance'), (B('Staff & settings', 'স্টাফ ও সেটিংস'), 'owner')]
LOGS = [('10:42', 'Nadia Islam', B('changed status of MSF-26-48213 to Part-paid', 'MSF-26-48213-এর স্ট্যাটাস আংশিক পরিশোধিত করেছেন'), 'booking', '103.112.x.x'),
        ('10:31', 'Kazi Fahim', B('issued refund ৳ 21,400 for MSF-26-44590', 'MSF-26-44590-এর জন্য ৳ ২১,৪০০ রিফান্ড দিয়েছেন'), 'payment', '103.112.x.x'),
        ('10:05', 'Tania Sultana', B('published blog post “Your first cruise from Bangladesh”', 'ব্লগ পোস্ট “বাংলাদেশ থেকে প্রথম ক্রুজ” প্রকাশ করেছেন'), 'cms', '37.111.x.x'),
        ('09:58', 'Ahmed Zubair', B('created coupon NEWYEAR27 (15%)', 'কুপন NEWYEAR27 (১৫%) তৈরি করেছেন'), 'coupon', '103.112.x.x'),
        ('09:40', 'Sohel Rana', B('moved VSA-26-1182 to “At embassy”', 'VSA-26-1182 “দূতাবাসে” ধাপে নিয়েছেন'), 'visa', '103.112.x.x'),
        ('09:12', 'System', B('nightly backup completed (2.4 GB)', 'রাতের ব্যাকআপ সম্পন্ন (২.৪ জিবি)'), 'system', '—'),
        ('08:55', 'Rafi Ahmed', B('signed in with 2FA', '২এফএ দিয়ে সাইন ইন করেছেন'), 'auth', '103.112.x.x'),
        ('Yesterday', 'Mitu Akter', B('replied to ticket TKT-8812', 'টিকিট TKT-8812-এর উত্তর দিয়েছেন'), 'support', '45.248.x.x'),
        ('Yesterday', 'System', B('5 failed sign-in attempts blocked for ops@… (rate limit)', 'ops@…-এর ৫টি ব্যর্থ সাইন-ইন প্রচেষ্টা আটকানো হয়েছে (রেট লিমিট)'), 'security', '182.160.x.x')]
ADMIN_TICKETS = [('TKT-8812', B('Farhana Rahman', 'ফারহানা রহমান'), B('Change Maldives villa type', 'মালদ্বীপের ভিলার ধরন পরিবর্তন'), 'high', 'awaiting', 'Nadia Islam', '2 h'),
                 ('TKT-8820', B('Rakib Chowdhury', 'রাকিব চৌধুরী'), B('Refund for cancelled Dubai safari', 'বাতিল দুবাই সাফারির রিফান্ড'), 'normal', 'open', 'Mitu Akter', '35 m'),
                 ('TKT-8819', B('Sumaiya Rahman', 'সুমাইয়া রহমান'), B('Name spelling on e-ticket', 'ই-টিকিটে নামের বানান'), 'urgent', 'open', 'Rafi Ahmed', '50 m'),
                 ('TKT-8815', B('Imran Khan', 'ইমরান খান'), B('Schengen appointment date', 'শেনজেন অ্যাপয়েন্টমেন্টের তারিখ'), 'normal', 'awaiting', 'Sohel Rana', '5 h'),
                 ('TKT-8801', B('Lamia Akter', 'লামিয়া আক্তার'), B('Invoice with company BIN', 'কোম্পানির বিআইএনসহ ইনভয়েস'), 'low', 'resolved', 'Kazi Fahim', '1 d')]
VISA_QUEUE = [('VSA-26-1182', B('Farhana Rahman', 'ফারহানা রহমান'), '🇹🇭', B('Thailand', 'থাইল্যান্ড'), 'embassy', '2026-11-04', 'Sohel Rana'),
              ('VSA-26-1183', B('Shafiqul Islam', 'শফিকুল ইসলাম'), '🇹🇭', B('Thailand', 'থাইল্যান্ড'), 'docs', '2026-11-06', 'Sohel Rana'),
              ('VSA-26-1190', B('Tasnim Hossain', 'তাসনিম হোসেন'), '🇪🇺', B('Schengen (France)', 'শেনজেন (ফ্রান্স)'), 'submitted', '2026-11-20', 'Sohel Rana'),
              ('VSA-26-1176', B('Kamrul Sarker', 'কামরুল সরকার'), '🇯🇵', B('Japan', 'জাপান'), 'embassy', '2026-11-02', 'Sohel Rana'),
              ('VSA-26-1171', B('Anika Talukder', 'আনিকা তালুকদার'), '🇲🇾', B('Malaysia', 'মালয়েশিয়া'), 'approved', '2026-10-23', 'Mitu Akter'),
              ('VSA-26-1168', B('Zahid Khan', 'জাহিদ খান'), '🇦🇪', B('UAE', 'সংযুক্ত আরব আমিরাত'), 'approved', '2026-10-22', 'Mitu Akter'),
              ('VSA-26-1160', B('Ishrat Mollah', 'ইশরাত মোল্লা'), '🇬🇧', B('United Kingdom', 'যুক্তরাজ্য'), 'failed', '2026-10-18', 'Sohel Rana')]
MONTHS_EN = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']
MONTHS_BN = ['নভে', 'ডিসে', 'জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলা', 'আগ', 'সেপ্টে', 'অক্টো']
REV = [182, 246, 231, 168, 152, 139, 171, 158, 149, 176, 214, 238]          # lakh BDT
REV_LY = [151, 205, 198, 150, 131, 122, 140, 133, 128, 147, 181, 196]
MIX = [(B('Holidays', 'হলিডে'), 46, '#0D6B65'), (B('Cruises', 'ক্রুজ'), 14, '#14A497'), (B('Flights', 'ফ্লাইট'), 21, '#F6A33B'), (B('Hotels', 'হোটেল'), 9, '#6366F1'), (B('Visa', 'ভিসা'), 6, '#E11D48'), (B('Activities', 'অ্যাক্টিভিটি'), 4, '#64748B')]
TOP_DEST = [('maldives', 412), ('coxs-bazar', 388), ('bali', 265), ('thailand', 241), ('nepal', 198), ('dubai', 176)]
MEDIA = ['maldives', 'coxsbazar', 'bali', 'cruise', 'sajek', 'resort', 'cappadocia', 'nepal', 'stmartin', 'kuakata', 'japan', 'santorini']
