"""Traveller portal (My account) — noindex, dummy data from data_app."""
from core import B
import data_app as A

NAV = [
 (None, [('index', 'account/index.html', 'layout-dashboard', B('Dashboard', 'ড্যাশবোর্ড'), None),
         ('bookings', 'account/bookings.html', 'luggage', B('My bookings', 'আমার বুকিং'), 5),
         ('trips', 'account/trips.html', 'map', B('Saved trips & wishlist', 'সংরক্ষিত ট্রিপ ও উইশলিস্ট'), None),
         ('visa', 'account/visa.html', 'stamp', B('Visa tracker', 'ভিসা ট্র্যাকার'), 1)]),
 (B('Money', 'টাকা-পয়সা'), [('wallet', 'account/wallet.html', 'wallet', B('Wallet & Miles', 'ওয়ালেট ও মাইলস'), None),
         ('payments', 'account/payments.html', 'credit-card', B('Payments & instalments', 'পেমেন্ট ও কিস্তি'), 1),
         ('referrals', 'account/referrals.html', 'gift', B('Refer & earn', 'রেফার করে আয়'), None)]),
 (B('Account', 'অ্যাকাউন্ট'), [('travellers', 'account/travellers.html', 'users', B('Travellers & passports', 'ভ্রমণকারী ও পাসপোর্ট'), None),
         ('notifications', 'account/notifications.html', 'bell', B('Notifications', 'নোটিফিকেশন'), 3),
         ('support', 'account/support.html', 'life-buoy', B('Help & support', 'সাহায্য ও সাপোর্ট'), None),
         ('reviews', 'account/reviews.html', 'star', B('My reviews', 'আমার রিভিউ'), None),
         ('profile', 'account/profile.html', 'user-round', B('Profile', 'প্রোফাইল'), None),
         ('settings', 'account/settings.html', 'settings', B('Settings & security', 'সেটিংস ও নিরাপত্তা'), None)]),
]
PAGES = [
 ('index', B('My account', 'মাই অ্যাকাউন্ট'), B('Your trips, payments, visas and Miles in one place.', 'আপনার ট্রিপ, পেমেন্ট, ভিসা ও মাইলস এক জায়গায়।')),
 ('bookings', B('My bookings', 'আমার বুকিং'), B('Upcoming, completed and cancelled bookings.', 'আসন্ন, সম্পন্ন ও বাতিল বুকিং।')),
 ('booking', B('Booking MSF-26-48213', 'বুকিং MSF-26-48213'), B('Maldives Water-Villa Honeymoon — itinerary, travellers, payments and documents.', 'মালদ্বীপ ওয়াটার-ভিলা হানিমুন — ভ্রমণসূচি, ভ্রমণকারী, পেমেন্ট ও ডকুমেন্ট।')),
 ('e-ticket', B('E-ticket MSF-26-48377', 'ই-টিকিট MSF-26-48377'), B('Flight e-ticket and boarding information.', 'ফ্লাইট ই-টিকিট ও বোর্ডিং তথ্য।')),
 ('visa', B('Visa tracker', 'ভিসা ট্র্যাকার'), B('Track every visa application stage by stage.', 'প্রতিটি ভিসা আবেদনের ধাপ ট্র্যাক করুন।')),
 ('trips', B('Saved trips & wishlist', 'সংরক্ষিত ট্রিপ ও উইশলিস্ট'), B('Plans from the trip planner and saved packages.', 'ট্রিপ প্ল্যানারের পরিকল্পনা ও সংরক্ষিত প্যাকেজ।')),
 ('wallet', B('Wallet & Miles', 'ওয়ালেট ও মাইলস'), B('Wallet balance, Musafir Miles and membership tier.', 'ওয়ালেট ব্যালান্স, মুসাফির মাইলস ও সদস্য স্তর।')),
 ('payments', B('Payments & instalments', 'পেমেন্ট ও কিস্তি'), B('Instalment plans, receipts and saved payment methods.', 'কিস্তি পরিকল্পনা, রসিদ ও সংরক্ষিত পেমেন্ট মাধ্যম।')),
 ('referrals', B('Refer & earn', 'রেফার করে আয়'), B('Invite friends and earn wallet credit.', 'বন্ধুদের আমন্ত্রণ জানিয়ে ওয়ালেট ক্রেডিট পান।')),
 ('travellers', B('Travellers & passports', 'ভ্রমণকারী ও পাসপোর্ট'), B('Saved co-travellers and passport details.', 'সংরক্ষিত সহযাত্রী ও পাসপোর্টের তথ্য।')),
 ('notifications', B('Notifications', 'নোটিফিকেশন'), B('Trip alerts, payment reminders and offers.', 'ট্রিপ অ্যালার্ট, পেমেন্ট রিমাইন্ডার ও অফার।')),
 ('support', B('Help & support', 'সাহায্য ও সাপোর্ট'), B('Support tickets and chat with your travel expert.', 'সাপোর্ট টিকিট ও ট্রাভেল এক্সপার্টের সাথে চ্যাট।')),
 ('reviews', B('My reviews', 'আমার রিভিউ'), B('Reviews you wrote and trips waiting for a review.', 'আপনার লেখা রিভিউ ও রিভিউয়ের অপেক্ষায় থাকা ট্রিপ।')),
 ('profile', B('Profile', 'প্রোফাইল'), B('Personal details and contact information.', 'ব্যক্তিগত ও যোগাযোগের তথ্য।')),
 ('settings', B('Settings & security', 'সেটিংস ও নিরাপত্তা'), B('Password, two-step sign-in, preferences and privacy.', 'পাসওয়ার্ড, টু-স্টেপ সাইন-ইন, পছন্দ ও গোপনীয়তা।')),
]
ACTIVE = {'booking': 'bookings', 'e-ticket': 'bookings'}

def build(render, L):
    home = B('My account', 'মাই অ্যাকাউন্ট')
    for key, title, desc in PAGES:
        crumbs = [(home, 'account/index.html')] + ([] if key == 'index' else ([(B('My bookings', 'আমার বুকিং'), 'account/bookings.html')] if key in ACTIVE else []) + [(title, f'account/{key}.html')])
        render(f'account/{key}.html', f'account/{key}.html', title, desc, lang=L, noindex=True, area='account', nav=NAV, nav_active=ACTIVE.get(key, key),
               crumbs_ui=crumbs if key != 'index' else None, A=A)
