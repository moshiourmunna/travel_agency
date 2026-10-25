# Musafir: competitive research and design decisions

**Scope (revised on 25 Oct 2026):** Musafir is a general tour and travel agency based in Bangladesh. It sells holidays, cruises, activities, flights, hotels, visas and insurance. **Hajj and Umrah are out of scope**, and the site, data and images contain no religious imagery.

**Method:**
- A headless Chrome crawl (Playwright) on 25 Oct 2026 captured each site's title, navigation, headings, JSON-LD types, hreflang, Open Graph tags and screenshots. The raw data is in `research/extract2.json` and `research/shots/*.jpg`; contact sheets are in `research/shots/sheet*.jpg`.
- Where a site blocked the crawler, the notes below are marked **(blocked)**. Those notes rely on the public product pages as I know them, not on this crawl.

## 1. Sites reviewed

**Big tour and travel brands:**

| Site | What the crawl captured |
|---|---|
| GetYourGuide | Hero "Experiences worth traveling for"; "Things to do wherever you're going"; "Attractions you can't miss"; Organization + WebSite schema; **45 hreflang locales** |
| Viator | **(blocked)**. Known patterns: free cancellation and "reserve now, pay later" badges on cards; review histograms |
| Klook | **(blocked)**. Known patterns: activity categories, instant-confirmation badges, multi-currency, app-first deals |
| Intrepid | TravelAgency + ItemList schema; 61 hreflang; "Last minute deals", "New trips"; small-group trust messaging |
| G Adventures | Product + BreadcrumbList schema; "Where? / When?" search in the hero; deal grid; "Explore by interests" |
| Contiki | Product schema; 82 hreflang; "Explore by travel style"; "Trips under £800" (price-band browsing) |
| TUI | Holidays, flights and cruises in one IA; price bands (under £300/£500/£1000 pp); package deals |
| Kuoni | TravelAgency schema; "Holiday types"; inspiration content; award badges; expert/consultant positioning |
| Abercrombie & Kent | Luxury editorial hero; "Find your journey"; brochure request; "Speak to us" phone in the header |
| Expedia | **(blocked: bot wall)**. Known patterns: bundles (flight + hotel), member prices, price alerts |
| Booking.com | WebSite + Corporation schema; 46 hreflang; "Book now, pay at the property"; "300M+ reviews"; Genius-style loyalty |
| MakeMyTrip | **(crawl failed)**. Known patterns: holidays, flights and hotels with EMI, wallet, coupon codes, customisable packages |
| Thomas Cook India | "Trending destinations", forex services, sign-in prompts for a "bucket list" (wishlist) |
| ShareTrip (BD) | Organization + TravelAgency + BreadcrumbList schema; flights, hotels and packages; strong local payments (bKash/Nagad/cards, EMI) |
| GoZayaan (BD) | Client-rendered single-page app: the crawler only saw a spinner, so content is not crawlable without JavaScript (an SEO risk we avoid). Travel, extras and a rewards programme |

**The 13 original reference sites:**
- Five of them are Hajj/Umrah specialists: meherba, travelgateusa, adamtravel, dawntravels and obokash. We now use them only for general patterns (header phone/WhatsApp, offers strip, package cards, airline logos). Their religious content is ignored.
- envoyage, ciaobambino, explorateur, globaltravelconcepts, lozano and blondeatlas are bespoke or advisor-led agencies. They contributed: an "Inquire / Plan a trip" CTA, a team page, editorial photography and testimonials.
- talon.com.bd and travelnextbd: visa-consultancy flows by country, with document checklists.
- flightexpert.com: now a **parked domain**, so nothing to learn.

## 2. Feature matrix

✓ = present on the site · – = absent or not visible · ? = blocked or not verifiable

| Feature | GYG | Viator | Klook | Intrepid | G Adv | Contiki | TUI | Kuoni | A&K | Expedia | Booking | MMT | TC India | ShareTrip | GoZayaan | **Musafir** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Activities / things to do | ✓ | ✓ | ✓ | – | – | – | ✓ | – | – | ✓ | ✓ | ✓ | – | – | ✓ | **✓ 12 + category filters** |
| Themes / travel styles | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | – | ✓ | ✓ | ✓ | – | **✓ 6 themes** |
| Cruises | – | ✓ | ✓ | – | – | – | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | – | **✓ 6 sailings, cabin pricing** |
| Trip planner / tailor-made | – | – | – | – | – | – | – | ✓ | ✓ | – | – | ✓ | ✓ | – | – | **✓ interactive cost planner** |
| Deals with countdowns | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | – | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✓ live countdowns** |
| Free-cancellation badges | ✓ | ✓ | ✓ | – | – | – | – | – | – | ✓ | ✓ | ✓ | – | – | – | **✓ on cards, details, checkout** |
| Reserve now, pay later / instalments | ✓ | ✓ | – | ✓ (deposit) | ✓ | ✓ | ✓ | ✓ | – | ✓ | ✓ | ✓ (EMI) | ✓ | ✓ (EMI) | ✓ | **✓ 30% deposit + 3 instalments + EMI** |
| Reviews summary (histogram + categories) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | ✓ | ✓ | ✓ | – | – | – | **✓** |
| Currency switcher | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | – | ✓ | ✓ | ✓ | – | – | – | – | **✓ BDT/USD/EUR (pay in BDT)** |
| Multi-language + hreflang | ✓45 | ✓ | ✓ | ✓61 | – | ✓82 | – | – | ✓4 | ✓ | ✓46 | – | – | – | – | **✓ EN/BN + hreflang** |
| Trust and safety (licences, secure pay, 24/7) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (ATOL) | ✓ (ATOL) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✓ IATA/ATAB/TOAB/BTB, SSL, 24/7** |
| Wishlist / compare | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | – | ✓ | ✓ | – | ✓ | – | – | **✓ both** |
| Loyalty / wallet | – | – | ✓ | – | – | – | – | – | – | ✓ | ✓ | ✓ | – | ✓ | ✓ | **✓ Miles tiers + wallet** |
| Visa services | – | – | – | – | – | – | – | – | – | – | – | ✓ | ✓ | ✓ | ✓ | **✓ 10 countries + tracker** |
| Local payments (bKash/Nagad) | – | – | – | – | – | – | – | – | – | – | – | – | – | ✓ | ✓ | **✓** |
| Structured data | Org | ? | ? | TravelAgency+ItemList | Product | Product | Org | TravelAgency | Org | ? | Corp | ? | Org | TravelAgency | – | **TravelAgency, Product/TouristTrip, FAQPage, BlogPosting, JobPosting, Breadcrumb, ItemList** |
| Server-rendered, crawlable HTML | ✓ | ✓ | partly | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | partly | ✓ | ✓ | **✗ (SPA spinner)** | **✓ static now, Next.js SSG/ISR later** |

## 3. What we took and why (decisions)

1. **Information architecture combines TUI and Kuoni:** Holidays (themes) · Tours · Cruises · Activities · Flights · Hotels · Visa · Offers. Bangladeshi travellers buy packages and visas together, so the visa product sits in the main nav.
2. **Activities as their own catalogue, following GYG, Viator and Klook.** Each activity has duration, language, pickup, instant confirmation, a cancellation badge and time-slot selection. Domestic experiences (the Saint Martin day cruise, a Sundarbans safari) sit next to international ones.
3. **Cancellation clarity everywhere, following Viator and Booking.** There are six policy types (free 24 h, 72 h, 7 days or 30 days; partial refund; non-refundable). The same label appears on cards, detail pages, checkout and the traveller portal, and the portal shows a refund estimate before cancelling.
4. **A trip planner modelled on the Kuoni, A&K and MMT "customise" flow, but self-serve.** Travellers pick up to 4 destinations, days, tier and activities, and get a live cost estimate. They can save the plan (it appears in the portal) or request a quote, which becomes a lead in the admin pipeline.
5. **Deals with real urgency (Contiki, TUI, GYG):** live countdowns, price-band browsing and bank/wallet offers (bKash cashback, card EMI).
6. **Pricing transparency for the BD market:** prices are shown per person in BDT with lakh grouping (৳ 1,45,000). The currency switcher is display-only and says "you pay in BDT". The checkout supports a 30% deposit, instalments, EMI and wallet + Miles.
7. **Trust (A&K, Kuoni, local OTAs):**
   - licence numbers in the footer and on the About page
   - secure-payment badges
   - 24/7 hotline + WhatsApp in the header
   - a verified-review summary with category scores
   - an "Our team" page
8. **SEO beats the local SPAs.** GoZayaan's homepage renders nothing without JavaScript, so we chose static HTML now and Next.js SSG/ISR later. Each page has a canonical tag, EN/BN hreflang, OG/Twitter tags, rich JSON-LD and a sitemap with alternates.
9. **Bilingual by design.** Bangla uses Hind Siliguri, Bangla numerals and Bangla month names, so the Bangla pages are written in Bangla rather than just translated labels.
10. **Neutral, travel-only brand:** an "M + sun" mark in teal and amber. There is no crescent or religious symbolism, and the photography covers beaches, mountains, cities and cruises.

## 4. Features added after the scope change
- Activities (list + 12 detail pages with time slots, inclusions, meeting point and reviews)
- Themes: honeymoon, family, adventure, beach, culture, luxury
- Cruises (list + 6 detail pages with route map, cabin tiers and port days)
- Trip planner
- Offers page with countdowns
- Cancellation badges and filters
- Currency switcher
- Reviews summary (histogram + categories)
- Trust strip
- Gift cards, insurance, group tours, custom tour, compare and wishlist
- Traveller portal (Miles, wallet, visa tracker, instalments)
- Admin console (catalogue for all product types, leads pipeline, B2B agents, roles and permissions, audit log)

## 5. Open questions (need your decision; I did not guess)

*Decided 25 Oct: "Halal" stays as an airline-meal option on the profile page (user decision). Religious wording was removed everywhere else.*

1. **Currencies:** are USD 122 / EUR 132 acceptable as demo rates? In production, which rate source should we use (a Bangladesh Bank reference rate or a fixed daily rate)?
2. **Real licence numbers, address and hotline:** the IATA, ATAB, TOAB and BTB numbers and the office address are placeholders.
3. **Payment gateways:** SSLCommerz + bKash + Nagad assumed. Also add aamarPay, ShurjoPay or Stripe for USD cards?
4. **Domain:** `musafir.com.bd` is assumed in the canonicals, sitemap and JSON-LD.
5. **Photography:** the mock uses Wikimedia Commons CC images (credits page included). Do you have your own photo library, or should we budget for a stock licence?
6. **Supplier integrations** for phase 2: GDS (Sabre or Amadeus), a hotel bed-bank (Hotelbeds or TBO), a cruise-line API, or a manual inventory?
7. **Loyalty economics:** is 1 Mile per ৳ 100 and 10 Miles = ৳ 1 acceptable?
