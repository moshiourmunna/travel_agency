#!/usr/bin/env python3
"""Generates backend/app/Models/*.php from a compact spec (run once; files are then edited by hand where needed).
Existing files listed in KEEP are never overwritten."""
import os
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'backend', 'app', 'Models')
KEEP = {'User', 'MediaAsset'}

# name: dict(table, tr=[translatable], casts={}, pub=bool, soft=bool, ulid=bool, rel=[(method, type, Model, extra)], search=[fields], extra='php')
M = {
 'Setting': dict(casts={'value': 'array', 'is_public': 'boolean'}),
 'Language': dict(casts={'is_default': 'boolean', 'is_active': 'boolean'}),
 'Translation': dict(casts={'value': 'array'}),
 'OtpCode': dict(casts={'expires_at': 'datetime', 'consumed_at': 'datetime'}, hidden=['code_hash']),
 'LoginActivity': dict(ts=False, casts={'success': 'boolean', 'created_at': 'datetime'}, rel=[('user', 'belongsTo', 'User')]),
 'MediaFolder': dict(rel=[('parent', 'belongsTo', 'MediaFolder', "'parent_id'"), ('children', 'hasMany', 'MediaFolder', "'parent_id'"), ('assets', 'hasMany', 'MediaAsset', "'folder_id'")]),
 'Page': dict(tr=['title', 'subtitle', 'body'], pub=True, soft=True, casts={'data': 'array', 'published_at': 'datetime'}, rel=[('sections', 'hasMany', 'PageSection', None, "->orderBy('sort')")], search=['title', 'body']),
 'PageSection': dict(casts={'data': 'array', 'is_active': 'boolean'}, rel=[('page', 'belongsTo', 'Page')]),
 'Menu': dict(tr=['name'], rel=[('items', 'hasMany', 'MenuItem', None, "->whereNull('parent_id')->orderBy('sort')"), ('allItems', 'hasMany', 'MenuItem')]),
 'MenuItem': dict(tr=['label', 'badge', 'description'], casts={'is_active': 'boolean', 'new_tab': 'boolean', 'meta': 'array'}, rel=[('menu', 'belongsTo', 'Menu'), ('parent', 'belongsTo', 'MenuItem', "'parent_id'"), ('children', 'hasMany', 'MenuItem', "'parent_id'", "->orderBy('sort')"), ('linkable', 'morphTo', None)]),
 'Banner': dict(tr=['title', 'subtitle', 'cta'], casts={'starts_at': 'datetime', 'ends_at': 'datetime', 'is_active': 'boolean'}, img=True),
 'FaqCategory': dict(tr=['name'], rel=[('faqs', 'hasMany', 'Faq', None, "->orderBy('sort')")]),
 'Faq': dict(tr=['question', 'answer'], casts={'show_on': 'array', 'is_active': 'boolean'}, rel=[('category', 'belongsTo', 'FaqCategory', "'faq_category_id'")]),
 'Testimonial': dict(tr=['name', 'city', 'trip', 'text'], casts={'is_featured': 'boolean', 'is_active': 'boolean', 'travelled_on': 'date'}, rel=[('avatar', 'belongsTo', 'MediaAsset', "'avatar_id'")]),
 'TeamMember': dict(tr=['name', 'role', 'bio'], casts={'socials': 'array', 'is_active': 'boolean'}, rel=[('photo', 'belongsTo', 'MediaAsset', "'photo_id'")]),
 'Stat': dict(tr=['label'], casts={'is_active': 'boolean', 'value': 'integer'}),
 'Partner': dict(casts={'is_active': 'boolean'}, rel=[('logo', 'belongsTo', 'MediaAsset', "'logo_id'")]),
 'BlogCategory': dict(tr=['name'], rel=[('posts', 'hasMany', 'BlogPost')]),
 'BlogPost': dict(tr=['title', 'excerpt', 'body', 'author_name'], pub=True, soft=True, ulid=True, casts={'published_at': 'datetime', 'is_featured': 'boolean'}, rel=[('category', 'belongsTo', 'BlogCategory', "'blog_category_id'"), ('author', 'belongsTo', 'User', "'author_id'"), ('tags', 'morphToMany', 'Tag', "'taggable'")], search=['title', 'excerpt']),
 'Tag': dict(tr=['name']),
 'SeoMeta': dict(table='seo_meta', tr=['meta_title', 'meta_description', 'og_title', 'keywords'], casts={'json_ld_override': 'array', 'in_sitemap': 'boolean', 'sitemap_priority': 'float'}, rel=[('seoable', 'morphTo', None), ('ogImage', 'belongsTo', 'MediaAsset', "'og_image_id'")]),
 'Redirect': dict(casts={'is_active': 'boolean', 'last_hit_at': 'datetime'}),
 'GalleryAlbum': dict(tr=['title'], casts={'is_active': 'boolean'}, rel=[('items', 'hasMany', 'GalleryItem', None, "->orderBy('sort')")]),
 'GalleryItem': dict(tr=['caption'], rel=[('album', 'belongsTo', 'GalleryAlbum', "'gallery_album_id'"), ('asset', 'belongsTo', 'MediaAsset', "'media_asset_id'")]),
 # catalogue
 'Region': dict(tr=['name']),
 'Country': dict(tr=['name', 'visa_note'], rel=[('region', 'belongsTo', 'Region')]),
 'Category': dict(tr=['name'], casts={'is_active': 'boolean'}, rel=[('tours', 'morphedByMany', 'Tour', "'categorizable'")]),
 'Destination': dict(tr=['name', 'country_name', 'tagline', 'description', 'best_time', 'visa_info', 'flight_time'], pub=True, soft=True, ulid=True,
     casts={'things_to_do': 'array', 'gallery': 'array', 'lat': 'float', 'lng': 'float', 'published_at': 'datetime', 'is_featured': 'boolean'},
     rel=[('country', 'belongsTo', 'Country'), ('tours', 'hasMany', 'Tour'), ('activities', 'hasMany', 'Activity'), ('hotels', 'hasMany', 'Hotel'), ('plannerCost', 'hasOne', 'PlannerCost')], search=['name', 'country_name', 'description', 'things_to_do']),
 'Theme': dict(tr=['name', 'tagline', 'description'], pub=True, soft=True, casts={'perks': 'array', 'published_at': 'datetime', 'is_featured': 'boolean'}, search=['name', 'tagline']),
 'CancellationPolicy': dict(tr=['name', 'description'], casts={'rules': 'array'}),
 'Tour': dict(tr=['title', 'location', 'country_name', 'summary', 'description', 'badge'], pub=True, soft=True, ulid=True,
     casts={'highlights': 'array', 'inclusions': 'array', 'exclusions': 'array', 'route_stops': 'array', 'gallery': 'array', 'includes_flight': 'boolean', 'includes_visa': 'boolean',
            'price_from': 'decimal:2', 'price_was': 'decimal:2', 'rating': 'float', 'published_at': 'datetime', 'is_featured': 'boolean'},
     rel=[('destination', 'belongsTo', 'Destination'), ('cancellationPolicy', 'belongsTo', 'CancellationPolicy'), ('itinerary', 'hasMany', 'TourItineraryDay', None, "->orderBy('day_no')"),
          ('departures', 'hasMany', 'TourDeparture', None, "->orderBy('date')"), ('priceTiers', 'hasMany', 'TourPriceTier', None, "->orderBy('sort')"), ('addons', 'hasMany', 'TourAddon'),
          ('categories', 'morphToMany', 'Category', "'categorizable'"), ('reviews', 'morphMany', 'Review', "'reviewable'")], search=['title', 'location', 'country_name', 'summary', 'highlights']),
 'TourItineraryDay': dict(tr=['title', 'body', 'stay'], casts={'meals': 'array'}, rel=[('tour', 'belongsTo', 'Tour')]),
 'TourDeparture': dict(casts={'date': 'date', 'return_date': 'date', 'price': 'decimal:2'}, rel=[('tour', 'belongsTo', 'Tour')],
     extra="""    public function seatsLeft(): int
    {
        return max(0, $this->seats_total - $this->seats_held);
    }
"""),
 'TourPriceTier': dict(tr=['label'], casts={'price': 'decimal:2', 'factor': 'float'}, rel=[('tour', 'belongsTo', 'Tour')]),
 'TourAddon': dict(tr=['label'], casts={'price': 'decimal:2', 'is_active': 'boolean'}, rel=[('tour', 'belongsTo', 'Tour')]),
 'CruiseLine': dict(rel=[('ships', 'hasMany', 'Ship')]),
 'Ship': dict(casts={'facts': 'array'}, rel=[('line', 'belongsTo', 'CruiseLine', "'cruise_line_id'"), ('cruises', 'hasMany', 'Cruise')]),
 'Cruise': dict(tr=['title', 'description', 'depart_port', 'cabin_from', 'badge'], pub=True, soft=True, ulid=True,
     casts={'route': 'array', 'highlights': 'array', 'gallery': 'array', 'price_from': 'decimal:2', 'price_was': 'decimal:2', 'rating': 'float', 'next_departure': 'date', 'published_at': 'datetime', 'is_featured': 'boolean'},
     rel=[('ship', 'belongsTo', 'Ship'), ('cancellationPolicy', 'belongsTo', 'CancellationPolicy'), ('sailings', 'hasMany', 'CruiseSailing', None, "->orderBy('date')"), ('cabins', 'hasMany', 'CruiseCabin', None, "->orderBy('sort')"),
          ('portsOfCall', 'hasMany', 'CruisePortOfCall', None, "->orderBy('day_no')"), ('reviews', 'morphMany', 'Review', "'reviewable'")], search=['title', 'depart_port', 'route', 'highlights']),
 'CruiseSailing': dict(casts={'date': 'date', 'return_date': 'date', 'price': 'decimal:2'}, rel=[('cruise', 'belongsTo', 'Cruise')]),
 'CruiseCabin': dict(tr=['name', 'description'], casts={'price': 'decimal:2'}, rel=[('cruise', 'belongsTo', 'Cruise')]),
 'CruisePortOfCall': dict(table='cruise_ports_of_call', tr=['port', 'body'], rel=[('cruise', 'belongsTo', 'Cruise')]),
 'Activity': dict(table='activities', tr=['title', 'city', 'description', 'duration_text', 'meeting_point', 'badge'], pub=True, soft=True, ulid=True,
     casts={'languages': 'array', 'highlights': 'array', 'inclusions': 'array', 'gallery': 'array', 'pickup': 'boolean', 'instant_confirm': 'boolean', 'price': 'decimal:2', 'price_was': 'decimal:2', 'rating': 'float', 'published_at': 'datetime', 'is_featured': 'boolean'},
     rel=[('destination', 'belongsTo', 'Destination'), ('cancellationPolicy', 'belongsTo', 'CancellationPolicy'), ('options', 'hasMany', 'ActivityOption', None, "->orderBy('sort')"), ('slots', 'hasMany', 'ActivitySlot', None, "->orderBy('starts_at')"), ('reviews', 'morphMany', 'Review', "'reviewable'")],
     search=['title', 'city', 'highlights']),
 'ActivityOption': dict(tr=['name', 'description'], casts={'price': 'decimal:2', 'child_price': 'decimal:2'}, rel=[('activity', 'belongsTo', 'Activity')]),
 'ActivitySlot': dict(casts={'starts_at': 'datetime', 'price': 'decimal:2'}, rel=[('activity', 'belongsTo', 'Activity')]),
 'Amenity': dict(table='amenities', tr=['name']),
 'Hotel': dict(tr=['name', 'city', 'address', 'description', 'distance_text'], pub=True, soft=True, ulid=True,
     casts={'amenities': 'array', 'gallery': 'array', 'refundable': 'boolean', 'breakfast': 'boolean', 'price_from': 'decimal:2', 'price_was': 'decimal:2', 'guest_score': 'float', 'lat': 'float', 'lng': 'float', 'published_at': 'datetime', 'is_featured': 'boolean'},
     rel=[('destination', 'belongsTo', 'Destination'), ('roomTypes', 'hasMany', 'HotelRoomType', None, "->orderBy('sort')"), ('reviews', 'morphMany', 'Review', "'reviewable'")], search=['name', 'city', 'address']),
 'HotelRoomType': dict(tr=['name', 'description', 'bed'], casts={'features': 'array', 'price': 'decimal:2', 'refundable': 'boolean', 'breakfast': 'boolean'}, rel=[('hotel', 'belongsTo', 'Hotel'), ('rates', 'hasMany', 'HotelRate')]),
 'HotelRate': dict(casts={'starts_on': 'date', 'ends_on': 'date', 'price': 'decimal:2'}, rel=[('roomType', 'belongsTo', 'HotelRoomType', "'hotel_room_type_id'")]),
 'Airline': dict(casts={'is_active': 'boolean'}, rel=[('logo', 'belongsTo', 'MediaAsset', "'logo_id'"), ('offers', 'hasMany', 'FlightOffer')]),
 'Airport': dict(tr=['name', 'city'], casts={'is_popular': 'boolean'}, rel=[('country', 'belongsTo', 'Country')]),
 'FlightOffer': dict(casts={'via': 'array', 'fare': 'decimal:2', 'refundable': 'boolean', 'is_active': 'boolean'}, rel=[('airline', 'belongsTo', 'Airline')]),
 'VisaDocumentSet': dict(tr=['name'], casts={'items': 'array'}),
 'VisaProduct': dict(tr=['country_name', 'type', 'processing', 'validity', 'stay', 'entry', 'description'], pub=True, soft=True, ulid=True,
     casts={'extra_documents': 'array', 'fee': 'decimal:2', 'published_at': 'datetime', 'is_featured': 'boolean'},
     rel=[('country', 'belongsTo', 'Country'), ('requirements', 'hasMany', 'VisaRequirement', None, "->orderBy('sort')"), ('applications', 'hasMany', 'VisaApplication')], search=['country_name', 'type']),
 'VisaRequirement': dict(tr=['item'], casts={'required': 'boolean'}, rel=[('product', 'belongsTo', 'VisaProduct', "'visa_product_id'")]),
 'InsurancePlan': dict(tr=['name', 'price_note'], casts={'coverage': 'array', 'price': 'decimal:2', 'is_popular': 'boolean', 'is_active': 'boolean'}),
 'GiftCardDesign': dict(tr=['name'], casts={'amounts': 'array', 'is_active': 'boolean'}, img=True),
 'Offer': dict(tr=['title', 'description', 'discount_text', 'tag'], casts={'starts_at': 'datetime', 'ends_at': 'datetime', 'is_flash': 'boolean', 'is_active': 'boolean'}, img=True),
 'Coupon': dict(tr=['name'], soft=True, casts={'value': 'decimal:2', 'max_discount': 'decimal:2', 'min_spend': 'decimal:2', 'scope': 'array', 'valid_from': 'datetime', 'valid_to': 'datetime'}, rel=[('redemptions', 'hasMany', 'CouponRedemption')]),
 'PlannerCost': dict(casts={'cost_per_day_standard': 'decimal:2', 'cost_per_day_premium': 'decimal:2', 'flight_estimate': 'decimal:2'}, rel=[('destination', 'belongsTo', 'Destination')]),
 'Currency': dict(table='currencies', casts={'rate_to_bdt': 'float', 'is_active': 'boolean'}),
 # commerce
 'LoyaltyTier': dict(tr=['name'], casts={'perks': 'array', 'miles_multiplier': 'float'}, rel=[('users', 'hasMany', 'User', "'tier_id'")]),
 'Agent': dict(tr=['company', 'city'], soft=True, casts={'commission_pct': 'float', 'credit_limit': 'decimal:2', 'balance': 'decimal:2'}, rel=[('users', 'belongsToMany', 'User', "'agent_users'"), ('bookings', 'hasMany', 'Booking'), ('commissions', 'hasMany', 'Commission'), ('apiClients', 'hasMany', 'ApiClient')]),
 'Traveller': dict(tr=['relation'], soft=True, casts={'dob': 'date', 'passport_expiry': 'date', 'passport_no_enc': 'encrypted', 'is_self': 'boolean'}, hidden=['passport_no_enc'], rel=[('user', 'belongsTo', 'User')]),
 'Booking': dict(tr=['title', 'subtitle'], soft=True, ulid=True,
     casts={'contact': 'array', 'pax': 'array', 'travel_start': 'date', 'travel_end': 'date', 'subtotal': 'decimal:2', 'discount': 'decimal:2', 'tax': 'decimal:2', 'total': 'decimal:2', 'paid': 'decimal:2', 'cost': 'decimal:2', 'cancelled_at': 'datetime', 'hold_expires_at': 'datetime'},
     rel=[('user', 'belongsTo', 'User'), ('agent', 'belongsTo', 'Agent'), ('owner', 'belongsTo', 'User', "'owner_staff_id'"), ('coupon', 'belongsTo', 'Coupon'), ('product', 'morphTo', None),
          ('items', 'hasMany', 'BookingItem'), ('travellers', 'hasMany', 'BookingTraveller'), ('activities', 'hasMany', 'BookingActivity', None, "->latest()"), ('documents', 'hasMany', 'BookingDocument'),
          ('payments', 'hasMany', 'Payment'), ('instalments', 'hasMany', 'Instalment', None, "->orderBy('seq')"), ('refunds', 'hasMany', 'Refund')],
     extra="""    public function getRouteKeyName(): string
    {
        return 'ref';
    }

    public function balance(): float
    {
        return max(0, (float) $this->total - (float) $this->paid);
    }

    public function isUpcoming(): bool
    {
        return $this->travel_start && $this->travel_start->isFuture() && ! in_array($this->status, ['cancelled', 'refunded'], true);
    }
"""),
 'BookingItem': dict(tr=['label'], casts={'unit_price': 'decimal:2', 'line_total': 'decimal:2', 'cost': 'decimal:2', 'meta': 'array'}, rel=[('booking', 'belongsTo', 'Booking'), ('bookable', 'morphTo', None)]),
 'BookingTraveller': dict(rel=[('booking', 'belongsTo', 'Booking'), ('traveller', 'belongsTo', 'Traveller')]),
 'BookingActivity': dict(tr=['body'], casts={'internal': 'boolean'}, rel=[('booking', 'belongsTo', 'Booking'), ('user', 'belongsTo', 'User')]),
 'BookingDocument': dict(tr=['title'], rel=[('booking', 'belongsTo', 'Booking')]),
 'Payment': dict(ulid=True, casts={'amount': 'decimal:2', 'fee': 'decimal:2', 'raw': 'array', 'paid_at': 'datetime'}, hidden=['raw'], rel=[('booking', 'belongsTo', 'Booking'), ('user', 'belongsTo', 'User'), ('refunds', 'hasMany', 'Refund'), ('logs', 'hasMany', 'PaymentGatewayLog')]),
 'Instalment': dict(casts={'due_date': 'date', 'amount': 'decimal:2'}, rel=[('booking', 'belongsTo', 'Booking'), ('payment', 'belongsTo', 'Payment')]),
 'Refund': dict(casts={'amount': 'decimal:2', 'processed_at': 'datetime'}, rel=[('payment', 'belongsTo', 'Payment'), ('booking', 'belongsTo', 'Booking'), ('requester', 'belongsTo', 'User', "'requested_by'"), ('approver', 'belongsTo', 'User', "'approved_by'")]),
 'PaymentGatewayLog': dict(ts=False, casts={'payload': 'array', 'created_at': 'datetime'}, rel=[('payment', 'belongsTo', 'Payment')]),
 'SavedPaymentMethod': dict(casts={'is_default': 'boolean'}, hidden=['token_ref'], rel=[('user', 'belongsTo', 'User')]),
 'WalletTransaction': dict(tr=['description'], casts={'amount': 'decimal:2', 'balance_after': 'decimal:2'}, rel=[('user', 'belongsTo', 'User'), ('source', 'morphTo', None)]),
 'MilesTransaction': dict(tr=['description'], casts={'miles': 'integer'}, rel=[('user', 'belongsTo', 'User'), ('source', 'morphTo', None)]),
 'Referral': dict(casts={'reward': 'decimal:2'}, rel=[('referrer', 'belongsTo', 'User', "'referrer_id'"), ('referred', 'belongsTo', 'User', "'referred_user_id'")]),
 'Wishlist': dict(rel=[('user', 'belongsTo', 'User'), ('wishable', 'morphTo', None)]),
 'TripPlan': dict(tr=['name'], ulid=True, casts={'data': 'array', 'estimate': 'decimal:2'}, rel=[('user', 'belongsTo', 'User')]),
 'Review': dict(tr=['author_name', 'author_city', 'trip_title', 'title', 'body', 'reply'], casts={'category_scores': 'array', 'replied_at': 'datetime', 'travelled_on': 'date'}, rel=[('reviewable', 'morphTo', None), ('user', 'belongsTo', 'User'), ('booking', 'belongsTo', 'Booking'), ('replier', 'belongsTo', 'User', "'replied_by'")]),
 'VisaApplication': dict(ulid=True, casts={'eta': 'date'}, rel=[('product', 'belongsTo', 'VisaProduct', "'visa_product_id'"), ('user', 'belongsTo', 'User'), ('traveller', 'belongsTo', 'Traveller'), ('booking', 'belongsTo', 'Booking'), ('assignee', 'belongsTo', 'User', "'assignee_id'"), ('events', 'hasMany', 'VisaApplicationEvent', None, "->orderBy('id')"), ('documents', 'morphMany', 'Document', "'owner'")]),
 'VisaApplicationEvent': dict(tr=['label'], casts={'happened_on': 'date'}, rel=[('application', 'belongsTo', 'VisaApplication', "'visa_application_id'"), ('user', 'belongsTo', 'User')]),
 'Document': dict(rel=[('owner', 'morphTo', None), ('uploader', 'belongsTo', 'User', "'uploaded_by'")]),
 'GiftCard': dict(casts={'amount': 'decimal:2', 'balance': 'decimal:2', 'expires_at': 'date'}, rel=[('design', 'belongsTo', 'GiftCardDesign', "'gift_card_design_id'"), ('buyer', 'belongsTo', 'User', "'buyer_id'")]),
 'CouponRedemption': dict(casts={'discount': 'decimal:2'}, rel=[('coupon', 'belongsTo', 'Coupon'), ('booking', 'belongsTo', 'Booking'), ('user', 'belongsTo', 'User')]),
 'Commission': dict(casts={'amount': 'decimal:2'}, rel=[('agent', 'belongsTo', 'Agent'), ('booking', 'belongsTo', 'Booking')]),
 # crm
 'Lead': dict(tr=['need', 'source'], soft=True, casts={'value': 'decimal:2', 'meta': 'array'}, rel=[('owner', 'belongsTo', 'User', "'owner_id'"), ('tripPlan', 'belongsTo', 'TripPlan'), ('booking', 'belongsTo', 'Booking'), ('activities', 'hasMany', 'LeadActivity', None, "->latest()")]),
 'LeadActivity': dict(rel=[('lead', 'belongsTo', 'Lead'), ('user', 'belongsTo', 'User')]),
 'Inquiry': dict(table='inquiries', casts={'payload': 'array'}, rel=[('lead', 'belongsTo', 'Lead')]),
 'NewsletterSubscriber': dict(casts={'confirmed_at': 'datetime'}),
 'SupportTicket': dict(tr=['subject'], casts={'last_activity_at': 'datetime'}, rel=[('user', 'belongsTo', 'User'), ('booking', 'belongsTo', 'Booking'), ('assignee', 'belongsTo', 'User', "'assignee_id'"), ('messages', 'hasMany', 'TicketMessage', None, "->orderBy('id')")]),
 'TicketMessage': dict(tr=['body'], casts={'internal': 'boolean', 'attachments': 'array'}, rel=[('ticket', 'belongsTo', 'SupportTicket', "'support_ticket_id'"), ('user', 'belongsTo', 'User')]),
 'ApiClient': dict(casts={'scopes': 'array', 'last_used_at': 'datetime', 'is_active': 'boolean'}, hidden=['key_hash'], rel=[('agent', 'belongsTo', 'Agent')]),
 'IntegrationLog': dict(ts=False, casts={'payload': 'array', 'success': 'boolean', 'created_at': 'datetime'}),
 'NotificationTemplate': dict(tr=['name', 'subject', 'body'], casts={'variables': 'array', 'is_active': 'boolean'}),
 'Campaign': dict(casts={'segment': 'array', 'subject': 'array', 'body': 'array', 'scheduled_at': 'datetime', 'sent_at': 'datetime'}, rel=[('recipients', 'hasMany', 'CampaignRecipient'), ('creator', 'belongsTo', 'User', "'created_by'")]),
 'CampaignRecipient': dict(casts={'sent_at': 'datetime'}, rel=[('campaign', 'belongsTo', 'Campaign'), ('user', 'belongsTo', 'User')]),
 'SmsLog': dict(casts={'response': 'array'}),
 'JobPost': dict(tr=['title', 'department', 'location', 'employment_type', 'experience', 'description'], soft=True, casts={'closes_on': 'date'}, rel=[('applications', 'hasMany', 'JobApplication')]),
 'JobApplication': dict(rel=[('job', 'belongsTo', 'JobPost', "'job_post_id'")]),
}

REL_IMPORT = {'belongsTo': 'BelongsTo', 'hasMany': 'HasMany', 'hasOne': 'HasOne', 'morphTo': 'MorphTo', 'morphMany': 'MorphMany', 'morphToMany': 'MorphToMany', 'morphedByMany': 'MorphToMany', 'belongsToMany': 'BelongsToMany'}

for name, s in M.items():
    if name in KEEP: continue
    uses, traits = ['Illuminate\\Database\\Eloquent\\Model'], []
    if s.get('tr'): uses.append('App\\Models\\Concerns\\HasTr'); traits.append('HasTr')
    if s.get('pub'): uses.append('App\\Models\\Concerns\\Publishable'); traits.append('Publishable')
    if s.get('soft'): uses.append('Illuminate\\Database\\Eloquent\\SoftDeletes'); traits.append('SoftDeletes')
    if s.get('ulid'): uses.append('App\\Models\\Concerns\\HasPublicUlid'); traits.append('HasPublicUlid')
    rels = s.get('rel', [])
    if s.get('img'): rels = [('image', 'belongsTo', 'MediaAsset', "'image_id'")] + rels
    for r in rels: uses.append('Illuminate\\Database\\Eloquent\\Relations\\' + REL_IMPORT[r[1]])
    body = []
    if traits: body.append('    use ' + ', '.join(traits) + ';\n')
    if s.get('table'): body.append(f"    protected $table = '{s['table']}';\n")
    if s.get('ts') is False: body.append('    public $timestamps = false;\n')
    body.append("    protected $guarded = ['id'];\n")
    if s.get('tr'): body.append('    /** @var list<string> */\n    public array $translatable = [' + ', '.join(f"'{x}'" for x in s['tr']) + '];\n')
    if s.get('search'): body.append('    /** @var list<string> fields indexed into search_text (EN + BN) */\n    protected array $searchable = [' + ', '.join(f"'{x}'" for x in s['search']) + '];\n')
    if s.get('hidden'): body.append('    protected $hidden = [' + ', '.join(f"'{x}'" for x in s['hidden']) + '];\n')
    casts = s.get('casts', {})
    if casts:
        body.append('    protected function casts(): array\n    {\n        return [\n' + ''.join(f"            '{k}' => '{v}',\n" for k, v in casts.items()) + '        ];\n    }\n')
    for r in rels:
        meth, typ, model = r[0], r[1], r[2]
        arg = r[3] if len(r) > 3 and r[3] else None
        tail = r[4] if len(r) > 4 else ''
        rt = REL_IMPORT[typ]
        if typ == 'morphTo': call = 'return $this->morphTo();'
        else: call = f"return $this->{typ}({model}::class" + (f', {arg}' if arg else '') + f'){tail};'
        body.append(f'    public function {meth}(): {rt}\n    {{\n        {call}\n    }}\n')
    if s.get('extra'): body.append(s['extra'])
    php = '<?php\n\nnamespace App\\Models;\n\n' + ''.join(f'use {u};\n' for u in sorted(set(uses))) + f'\nclass {name} extends Model\n{{\n' + '\n'.join(body) + '}\n'
    open(os.path.join(OUT, name + '.php'), 'w').write(php)
print(len(M), 'models')
