# Musafir: database design (PostgreSQL 16)

**Conventions:**
- Primary keys are `uuid` (generated with `gen_random_uuid()`), plus a human-readable `ref` where customers see it (e.g. `MSF-26-48213`).
- Every table has `created_at` and `updated_at` (`timestamptz`); soft delete uses `deleted_at` where needed.
- Money is stored as `numeric(12,2)` in **BDT**. Display currencies come from `fx_rates`.
- **Bilingual text** uses paired columns `*_en` / `*_bn` (for example `title_en`, `title_bn`), which is the same `B(en, bn)` pairs pattern used in the mock data.
- Long rich content goes in `jsonb` (itinerary days, SEO, inclusions).
- Enums are Postgres enums or check constraints.

## ER diagram

```mermaid
erDiagram
  users ||--o{ travellers : "saves"
  users ||--o{ bookings : "places"
  users ||--o{ wallet_tx : "has"
  users ||--o{ miles_tx : "earns"
  users ||--o{ reviews : "writes"
  users ||--o{ tickets : "opens"
  users ||--o{ saved_trips : "plans"
  users ||--o{ wishlist_items : "saves"
  users ||--o{ notifications : "receives"
  users ||--o{ referrals : "refers"
  users }o--o| agents : "belongs to (B2B)"

  destinations ||--o{ tours : "hosts"
  destinations ||--o{ activities : "hosts"
  destinations ||--o{ hotels : "hosts"
  destinations ||--o{ visa_products : "country"
  themes ||--o{ tour_themes : ""
  tours ||--o{ tour_themes : ""
  tours ||--o{ tour_departures : "runs"
  tours ||--o{ itinerary_days : "has"
  cruises ||--o{ cruise_sailings : "runs"
  cruises ||--o{ cruise_cabins : "offers"
  activities ||--o{ activity_slots : "offers"

  bookings ||--|{ booking_items : "contains"
  booking_items }o--o| tour_departures : "tour"
  booking_items }o--o| cruise_sailings : "cruise"
  booking_items }o--o| activity_slots : "activity"
  booking_items }o--o| hotels : "hotel"
  booking_items }o--o| flight_segments : "flight"
  booking_items }o--o| visa_applications : "visa"
  bookings ||--o{ booking_travellers : "for"
  travellers ||--o{ booking_travellers : ""
  bookings ||--o{ payments : "paid by"
  bookings ||--o{ instalments : "scheduled"
  payments ||--o{ refunds : "refunded"
  bookings }o--o| coupons : "uses"
  bookings }o--o| agents : "sold by"
  bookings }o--o| staff : "owned by"
  bookings ||--o{ booking_notes : "timeline"
  visa_products ||--o{ visa_applications : ""
  visa_applications ||--o{ documents : "requires"
  travellers ||--o{ documents : "owns"
  reviews }o--|| bookings : "verified by"

  leads }o--o| users : "converts to"
  leads }o--o| staff : "assigned"
  leads }o--o| saved_trips : "from planner"
  tickets ||--o{ ticket_messages : ""
  staff }o--|| roles : ""
  roles ||--o{ role_permissions : ""
  permissions ||--o{ role_permissions : ""
  staff ||--o{ audit_logs : "acts"
  cms_pages ||--o{ cms_blocks : ""
  blog_posts }o--|| staff : "author"
  media ||--o{ media_usages : ""

  users { uuid id PK; text email UK; text phone UK; text name_en; text name_bn; text tier "blue|silver|gold|platinum"; int miles; numeric wallet_balance; text referral_code UK; text locale "en|bn"; text theme_pref; timestamptz last_login_at }
  travellers { uuid id PK; uuid user_id FK; text full_name; date dob; text gender; text nationality; bytea passport_no_enc; date passport_expiry; text meal_pref; text seat_pref }
  destinations { uuid id PK; text slug UK; text name_en; text name_bn; text country_code; text scope "domestic|intl"; text currency; text visa_type; jsonb best_time; jsonb seo }
  themes { uuid id PK; text slug UK; text name_en; text name_bn; text icon; int sort }
  tours { uuid id PK; text slug UK; uuid destination_id FK; text title_en; text title_bn; int nights; numeric price_from; numeric price_was; text cancel_policy "free24|free72|free7|free30|partial|none"; bool flight_incl; bool visa_incl; numeric rating; int review_count; text status "draft|published|archived"; jsonb inclusions; jsonb seo }
  tour_departures { uuid id PK; uuid tour_id FK; date start_date; int seats_total; int seats_held; numeric price; text status }
  itinerary_days { uuid id PK; uuid tour_id FK; int day_no; text title_en; text title_bn; text body_en; text body_bn; jsonb meals }
  cruises { uuid id PK; text slug UK; text ship; text line; text region; int nights; numeric price_from; jsonb route }
  cruise_sailings { uuid id PK; uuid cruise_id FK; date depart; int cabins_left }
  cruise_cabins { uuid id PK; uuid cruise_id FK; text tier "inside|ocean|balcony|suite"; numeric price }
  activities { uuid id PK; text slug UK; uuid destination_id FK; text category; text title_en; text title_bn; int duration_min; numeric price; bool instant_confirm; text cancel_policy; jsonb languages; text meeting_point }
  activity_slots { uuid id PK; uuid activity_id FK; timestamptz starts_at; int capacity; int booked }
  hotels { uuid id PK; text slug UK; uuid destination_id FK; int stars; numeric guest_score; text supplier; text supplier_code }
  flight_segments { uuid id PK; text pnr; text carrier; text flight_no; text from_iata; text to_iata; timestamptz dep; timestamptz arr; text cabin; text fare_basis }
  visa_products { uuid id PK; uuid destination_id FK; text code UK; text type_en; text type_bn; numeric fee; text processing; jsonb doc_checklist }
  visa_applications { uuid id PK; uuid visa_product_id FK; uuid traveller_id FK; text stage "docs|review|submitted|embassy|approved|rejected"; date eta; uuid assignee FK }
  documents { uuid id PK; uuid traveller_id FK; uuid visa_application_id FK; text kind; text storage_key; text status "pending|ok|rejected" }
  bookings { uuid id PK; text ref UK; uuid user_id FK; uuid agent_id FK; uuid owner_staff_id FK; uuid coupon_id FK; text kind "tour|cruise|activity|hotel|flight|visa|custom"; text status "pending|confirmed|part_paid|paid|ticketed|travelling|completed|cancelled|refunded"; text channel "web|app|phone|whatsapp|agent|walk_in"; date travel_start; date travel_end; int pax_adults; int pax_children; numeric subtotal; numeric discount; numeric tax; numeric total; numeric paid; numeric cost "supplier cost for margin" }
  booking_items { uuid id PK; uuid booking_id FK; text item_type; uuid item_ref; text label; int qty; numeric unit_price; numeric cost }
  booking_travellers { uuid booking_id FK; uuid traveller_id FK; text ticket_no }
  booking_notes { uuid id PK; uuid booking_id FK; uuid staff_id FK; text body; bool internal }
  payments { uuid id PK; uuid booking_id FK; text method "card|bkash|nagad|bank|emi|wallet|miles|cash"; text gateway; text gateway_txn UK; numeric amount; text status "pending|success|failed"; jsonb raw }
  instalments { uuid id PK; uuid booking_id FK; int seq; date due_date; numeric amount; uuid payment_id FK }
  refunds { uuid id PK; uuid payment_id FK; numeric amount; text reason; text status; uuid approved_by FK }
  coupons { uuid id PK; text code UK; text kind "percent|flat"; numeric value; numeric min_spend; int max_uses; int used; date valid_from; date valid_to; text scope }
  wallet_tx { uuid id PK; uuid user_id FK; numeric amount; text kind "topup|spend|refund|cashback"; text ref }
  miles_tx { uuid id PK; uuid user_id FK; int miles; text reason; uuid booking_id FK }
  referrals { uuid id PK; uuid referrer_id FK; uuid referee_id FK; text status; numeric reward }
  saved_trips { uuid id PK; uuid user_id FK; jsonb plan "destinations, days, tier, activities"; numeric estimate }
  wishlist_items { uuid user_id FK; text item_type; uuid item_id }
  reviews { uuid id PK; uuid user_id FK; uuid booking_id FK; text item_type; uuid item_id; int rating; jsonb category_scores; text body; text status "pending|published|hidden"; text reply }
  leads { uuid id PK; text name; text phone; text email; text source; text stage "new|contacted|quoted|won|lost"; numeric value; uuid assignee FK; uuid saved_trip_id FK }
  tickets { uuid id PK; text ref UK; uuid user_id FK; uuid booking_id FK; text subject; text priority; text status; uuid assignee FK }
  ticket_messages { uuid id PK; uuid ticket_id FK; text author_type "user|staff"; uuid author_id; text body }
  agents { uuid id PK; text company; text licence_no; numeric commission_pct; numeric credit_limit; numeric balance; text status }
  staff { uuid id PK; text name; text email UK; uuid role_id FK; bool mfa_enabled; text status }
  roles { uuid id PK; text name UK }
  permissions { uuid id PK; text key UK "e.g. bookings.refund" }
  role_permissions { uuid role_id FK; uuid permission_id FK }
  audit_logs { bigserial id PK; uuid staff_id FK; text action; text entity; uuid entity_id; jsonb diff; inet ip; timestamptz at }
  notifications { uuid id PK; uuid user_id FK; text category; text title_en; text title_bn; bool read }
  notification_templates { uuid id PK; text key UK; text channel "email|sms|whatsapp|push"; text body_en; text body_bn }
  cms_pages { uuid id PK; text slug UK; text title_en; text title_bn; jsonb seo; text status }
  cms_blocks { uuid id PK; uuid page_id FK; text type; int sort; jsonb data }
  blog_posts { uuid id PK; text slug UK; uuid author_id FK; text title_en; text title_bn; text body_en; text body_bn; timestamptz published_at }
  media { uuid id PK; text storage_key; text alt_en; text alt_bn; text credit; int width; int height }
  media_usages { uuid media_id FK; text entity; uuid entity_id }
  fx_rates { text currency PK; numeric bdt_per_unit; timestamptz as_of }
```

## Key indexes and constraints
- `bookings(ref)` unique; `bookings(user_id, travel_start desc)`; `bookings(status, travel_start)` for the admin queues.
- `payments(gateway_txn)` unique, which makes webhooks idempotent.
- `tours`, `activities` and `cruises`: a GIN index on `to_tsvector('simple', title_en || ' ' || title_bn)` plus a `pg_trgm` index for typo-tolerant search.
- `tour_departures(tour_id, start_date)`; `activity_slots(activity_id, starts_at)`.
- Check constraints: `paid <= total`, `seats_held <= seats_total`, and `rating between 1 and 5`.
- `audit_logs` is partitioned by month. `travellers.passport_no_enc` is encrypted with pgcrypto and its key lives in KMS.

## Mock data → table mapping

| Mock (src/) | Table(s) |
|---|---|
| `data_public.TOURS`, `DESTINATIONS`, `THEMES`, `CRUISES`, `ACTIVITIES`, `HOTELS`, `VISAS`, `FAQS`, `BLOG` | tours, destinations, themes, cruises, activities, hotels, visa_products, cms_*, blog_posts |
| `data_app.USER`, `TRAVELLERS`, `MY_BOOKINGS`, `INSTALMENTS`, `WALLET_TX`, `MILES_TX`, `VISA_APPS`, `NOTIFS`, `TICKETS` | users, travellers, bookings (+ items), instalments, wallet_tx, miles_tx, visa_applications, notifications, tickets |
| `data_app.ADMIN_BOOKINGS`, `CUSTOMERS`, `LEADS`, `PAYMENTS`, `COUPONS`, `AGENTS`, `STAFF`, `ROLES`, `PERMS`, `LOGS` | bookings, users, leads, payments, coupons, agents, staff, roles/permissions, audit_logs |
