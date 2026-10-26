<?php

use App\Models\Booking;
use App\Models\Document;
use App\Models\GiftCard;
use App\Models\MilesTransaction;
use App\Models\NewsletterSubscriber;
use App\Models\Payment;
use App\Models\Referral;
use App\Models\Review;
use App\Models\SupportTicket;
use App\Models\Tour;
use App\Models\Traveller;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Models\Wishlist;
use App\Services\ReviewService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/* Traveller portal API (/api/v1/me/*): ownership, validation and every write the account pages make. */

it('serves every portal read for the demo traveller', function () {
    $t = asTraveller();
    foreach (['dashboard', 'summary', 'bookings', 'payments', 'wallet', 'trips', 'travellers', 'visa', 'reviews', 'referrals', 'notifications', 'profile', 'settings', 'tickets'] as $p) {
        $t->getJson("/api/v1/me/$p?lang=bn")->assertOk()->assertHeader('Cache-Control')->assertJsonStructure(['data']);
    }
});

it('hides other travellers’ bookings, visas and tickets behind a 404', function () {
    $other = newTraveller();
    $t = asTraveller($other);
    $t->getJson('/api/v1/me/bookings/MSF-26-48213')->assertNotFound();
    $t->postJson('/api/v1/me/bookings/MSF-26-48213/request', ['type' => 'change', 'message' => 'Please change'])->assertNotFound();
    $t->postJson('/api/v1/me/visa/VSA-26-1182/documents', ['label' => 'x', 'file' => UploadedFile::fake()->create('a.pdf', 10, 'application/pdf')])->assertNotFound();
    $t->postJson('/api/v1/me/tickets/TKT-8812/messages', ['message' => 'hello there'])->assertNotFound();
    expect($t->getJson('/api/v1/me/bookings')->json('data.items'))->toBe([]);
});

it('returns a booking with its wallet option and next instalment', function () {
    $b = asTraveller()->getJson('/api/v1/me/bookings/MSF-26-48213')->assertOk()->json('data');
    expect($b['wallet']['enabled'])->toBeBool()->and($b['wallet']['balance'])->toBe(6800)
        ->and($b['next_due'])->not->toBeNull()->and($b['next_due']['amount'])->toBeGreaterThan(0);
});

it('turns change / cancel requests into support tickets and refuses to cancel finished trips', function () {
    $t = asTraveller();
    $before = SupportTicket::count();
    $t->postJson('/api/v1/me/bookings/MSF-26-48213/request', ['type' => 'cancel', 'message' => 'Family emergency, please cancel', 'refund_to' => 'wallet'])->assertCreated();
    $tk = SupportTicket::latest('id')->first();
    expect(SupportTicket::count())->toBe($before + 1)->and($tk->priority)->toBe('high')->and($tk->messages()->first()->tr('body'))->toContain('Refund to: Musafir wallet');
    $t->postJson('/api/v1/me/bookings/MSF-26-41020/request', ['type' => 'cancel', 'message' => 'Cancel this one'])->assertStatus(409);
    $t->postJson('/api/v1/me/bookings/MSF-26-48213/request', ['type' => 'refund', 'message' => 'x'])->assertUnprocessable()->assertJsonValidationErrors(['type', 'message']);
});

it('starts a wallet top-up through a gateway and validates the amount', function () {
    $t = asTraveller();
    $t->postJson('/api/v1/me/wallet/topup', ['amount' => 100, 'gateway' => 'mock'])->assertUnprocessable()->assertJsonValidationErrors('amount');
    $t->postJson('/api/v1/me/wallet/topup', ['amount' => 5000, 'gateway' => 'bank_transfer'])->assertUnprocessable()->assertJsonValidationErrors('gateway');
    $r = $t->postJson('/api/v1/me/wallet/topup', ['amount' => 5000, 'gateway' => 'mock'])->assertOk()->json('data');
    $p = Payment::where('ulid', $r['payment'])->firstOrFail();
    expect($r['redirect'])->toContain('/pay/mock/')->and($p->purpose)->toBe('wallet_topup')->and((float) $p->amount)->toBe(5000.0)->and($p->booking_id)->toBeNull();
});

it('redeems a gift card once into the wallet', function () {
    GiftCard::create(['code' => 'GC-PEST1', 'amount' => 2500, 'balance' => 2500, 'status' => 'active']);
    $t = asTraveller();
    $r = $t->postJson('/api/v1/me/wallet/redeem', ['code' => 'gc-pest1'])->assertOk()->json('data');
    expect($r['amount'])->toBe(2500)->and($r['balance'])->toBe(9300)
        ->and(WalletTransaction::where('user_id', farhana()->id)->where('source_type', GiftCard::class)->latest('id')->value('amount'))->toEqual(2500);
    $t->postJson('/api/v1/me/wallet/redeem', ['code' => 'GC-PEST1'])->assertUnprocessable()->assertJsonValidationErrors('code');
    $t->postJson('/api/v1/me/wallet/redeem', ['code' => 'GC-7781'])->assertUnprocessable(); // seeded, already redeemed
});

it('keeps the wishlist as kind:slug keys, merging device saves and removing', function () {
    $t = asTraveller(newTraveller());
    $r = $t->postJson('/api/v1/me/wishlist', ['items' => [['kind' => 'tour', 'slug' => 'maldives-honeymoon'], ['kind' => 'tour', 'slug' => 'no-such-tour']]])->assertOk()->json('data');
    expect($r['keys'])->toBe(['tour:maldives-honeymoon'])->and($r['count'])->toBe(1);
    $r = $t->postJson('/api/v1/me/wishlist', ['items' => [['kind' => 'tour', 'slug' => 'maldives-honeymoon']]])->json('data');
    expect($r['count'])->toBe(1); // idempotent
    $r = $t->postJson('/api/v1/me/wishlist', ['remove' => ['kind' => 'tour', 'slug' => 'maldives-honeymoon']])->json('data');
    expect($r['keys'])->toBe([]);
    $t->postJson('/api/v1/me/wishlist', ['items' => [['kind' => 'flight', 'slug' => 'x']]])->assertUnprocessable();
});

it('adds, edits and deletes travellers (given name + surname, masked passport kept on blank edit)', function () {
    $t = asTraveller();
    $r = $t->postJson('/api/v1/me/travellers', ['given_name' => 'Ayaan', 'surname' => 'Rahman', 'relation' => 'Child', 'dob' => '2016-05-02', 'gender' => 'male', 'nationality' => 'BD',
        'passport_no' => 'B1234567', 'passport_expiry' => today()->addMonths(3)->toDateString(), 'frequent_flyer' => 'BG 1234'])->assertCreated()->json('data');
    $tr = Traveller::findOrFail($r['id']);
    expect($tr->name)->toBe('Ayaan Rahman')->and($r['expires_soon'])->toBeTrue()->and(json_encode($r))->not->toContain('B1234567');
    $t->putJson("/api/v1/me/travellers/{$tr->id}", ['given_name' => 'Ayaan', 'surname' => 'Rahman', 'relation' => 'Child', 'passport_no' => null, 'frequent_flyer' => null, 'passport_expiry' => today()->addYears(5)->toDateString()])->assertOk();
    $tr->refresh();
    expect($tr->frequent_flyer)->toBe('BG 1234')->and($tr->passport_no_enc)->toBe('B1234567');
    $t->postJson('/api/v1/me/travellers', ['given_name' => 'X', 'passport_no' => 'bad!', 'passport_expiry' => '2000-01-01', 'nationality' => 'BGD'])->assertUnprocessable()
        ->assertJsonValidationErrors(['passport_no', 'passport_expiry', 'nationality']);
    $t->deleteJson("/api/v1/me/travellers/{$tr->id}")->assertOk();
    expect(Traveller::find($tr->id))->toBeNull();
    $mine = Traveller::where('user_id', farhana()->id)->first();
    asTraveller(newTraveller())->deleteJson("/api/v1/me/travellers/{$mine->id}")->assertNotFound();
});

it('uploads visa documents privately and lists the checklist', function () {
    Storage::fake('local');
    $t = asTraveller();
    $v = collect($t->getJson('/api/v1/me/visa')->json('data.items'))->firstWhere('ref', 'VSA-26-1183') ?? collect($t->getJson('/api/v1/me/visa')->json('data.items'))->first();
    expect($v['checklist'])->not->toBeEmpty()->and($v['checklist'][0])->toHaveKeys(['label', 'key', 'done', 'status']);
    $t->postJson("/api/v1/me/visa/{$v['ref']}/documents", ['label' => 'Bank statement', 'file' => UploadedFile::fake()->create('x.exe', 10, 'application/octet-stream')])->assertUnprocessable()->assertJsonValidationErrors('file');
    $t->postJson("/api/v1/me/visa/{$v['ref']}/documents", ['label' => 'Bank statement', 'file' => UploadedFile::fake()->create('statement.pdf', 300, 'application/pdf')])->assertCreated();
    $d = Document::latest('id')->first();
    expect($d->disk)->toBe('local')->and($d->status)->toBe('pending');
    Storage::disk('local')->assertExists($d->path);
});

it('creates support tickets, replies with an attachment and serves it only to the owner', function () {
    Storage::fake('local');
    $t = asTraveller();
    $t->postJson('/api/v1/me/tickets', ['topic' => 'payment', 'message' => 'short'])->assertUnprocessable()->assertJsonValidationErrors('message');
    $ref = $t->postJson('/api/v1/me/tickets', ['booking' => 'MSF-26-48213', 'topic' => 'visa', 'message' => 'Which bank statement format do you need?'])->assertCreated()->json('data.ref');
    $t->post("/api/v1/me/tickets/$ref/messages", ['message' => 'Here it is', 'file' => UploadedFile::fake()->create('slip.pdf', 50, 'application/pdf')], ['Accept' => 'application/json'])->assertCreated();
    $open = $t->getJson("/api/v1/me/tickets?ticket=$ref")->json('data.open');
    expect($open['ref'])->toBe($ref)->and(end($open['messages'])['attachments'][0]['name'])->toBe('slip.pdf');
    $url = end($open['messages'])['attachments'][0]['url'];
    $t->get("/api/v1/me/$url")->assertOk();
    asTraveller(newTraveller())->get("/api/v1/me/$url")->assertNotFound();
    // replying to a resolved ticket reopens it
    SupportTicket::where('ref', 'TKT-8650')->update(['status' => 'resolved']);
    asTraveller()->postJson('/api/v1/me/tickets/TKT-8650/messages', ['message' => 'One more question'])->assertCreated();
    expect(SupportTicket::where('ref', 'TKT-8650')->value('status'))->toBe('open');
});

it('uploads and removes a profile photo', function () {
    Storage::fake('public');
    $t = asTraveller();
    $t->post('/api/v1/me/avatar', ['photo' => UploadedFile::fake()->image('me.jpg', 50, 50)], ['Accept' => 'application/json'])->assertUnprocessable(); // too small
    $t->post('/api/v1/me/avatar', ['photo' => UploadedFile::fake()->create('me.pdf', 10, 'application/pdf')], ['Accept' => 'application/json'])->assertUnprocessable();
    $r = $t->post('/api/v1/me/avatar', ['photo' => UploadedFile::fake()->image('me.jpg', 400, 400)], ['Accept' => 'application/json'])->assertOk()->json('data');
    expect($r['avatar'])->toBeString();
    $path = farhana()->avatar_path;
    Storage::disk('public')->assertExists($path);
    $t->deleteJson('/api/v1/me/avatar')->assertOk();
    Storage::disk('public')->assertMissing($path);
    expect(farhana()->avatar_path)->toBeNull();
});

it('reports profile completeness with the next missing item and saves the profile', function () {
    $me = farhana();
    $t = asTraveller($me);
    $p = $t->getJson('/api/v1/me/profile')->json('data');
    expect($p['completeness'])->toBe(80)->and($p['missing'])->toBe(['emergency', 'photo'])->and($p['travel']['interests'])->toContain('beaches')->and($p['nid_masked'])->toEndWith('0821');
    $t->putJson('/api/v1/me/profile', ['name' => 'Farhana Rahman', 'email' => 'farhana@example.com', 'phone' => '01712345678', 'nid' => '123'])->assertUnprocessable()->assertJsonValidationErrors('nid');
    $p = $t->putJson('/api/v1/me/profile', ['name' => 'Farhana Rahman', 'email' => 'farhana@example.com', 'phone' => '01712345678', 'dob' => '1991-07-22', 'gender' => 'female',
        'address' => 'House 12, Road 7, Dhanmondi', 'emergency' => ['name' => 'Kamal Rahman', 'phone' => '01811111111'], 'travel' => ['interests' => ['food'], 'seat' => 'aisle', 'meal' => 'vegetarian', 'room' => 'twin']])->assertOk()->json('data');
    expect($p['completeness'])->toBe(90)->and($p['missing'])->toBe(['photo'])->and($p['travel']['seat'])->toBe('aisle')->and($p['phone_verified'])->toBeTrue();
    expect(farhana()->preferences['meal'])->toBe('vegetarian');
    $p = $t->putJson('/api/v1/me/profile', ['name' => 'Farhana Rahman', 'email' => 'farhana.new@example.com', 'phone' => '01712345678'])->json('data');
    expect($p['email_verified'])->toBeFalse();
    $t->putJson('/api/v1/me/profile', ['name' => 'F', 'email' => User::where('type', 'customer')->where('id', '!=', $me->id)->value('email'), 'phone' => '01712345678'])->assertJsonValidationErrors(['name', 'email']);
});

it('saves notification switches without losing the others and mirrors the newsletter list', function () {
    $t = asTraveller();
    $t->putJson('/api/v1/me/settings', ['notify' => ['deals' => false]])->assertOk();
    $s = $t->putJson('/api/v1/me/settings', ['notify' => ['newsletter' => true, 'alerts' => false]])->assertOk()->json('data');
    expect($s['notify']['deals'])->toBeFalse()->and($s['notify']['newsletter'])->toBeTrue()->and($s['notify']['alerts'])->toBeTrue()
        ->and(NewsletterSubscriber::where('email', 'farhana@example.com')->value('status'))->toBe('subscribed');
    $s = $t->putJson('/api/v1/me/settings', ['notify' => ['newsletter' => false]])->json('data');
    expect($s['notify']['newsletter'])->toBeFalse()->and($s['notify']['deals'])->toBeFalse();
    $t->putJson('/api/v1/me/settings', ['currency' => 'XYZ'])->assertJsonValidationErrors('currency');
    expect($t->putJson('/api/v1/me/settings', ['currency' => 'USD', 'locale' => 'bn'])->json('data'))->toMatchArray(['currency' => 'USD', 'locale' => 'bn']);
});

it('only allows two-step sign-in with a verified mobile', function () {
    asTraveller(newTraveller())->putJson('/api/v1/me/settings', ['two_factor' => true])->assertJsonValidationErrors('two_factor');
    expect(asTraveller()->putJson('/api/v1/me/settings', ['two_factor' => true])->assertOk()->json('data.two_factor'))->toBeTrue();
});

it('changes the password, signing out other sessions; revokes single sessions but not the current one', function () {
    $u = farhana();
    $other = $u->createToken('Safari iPhone', ['traveller']);
    $t = asTraveller($u);
    $s = $t->getJson('/api/v1/me/settings')->json('data.sessions');
    $cur = collect($s)->firstWhere('current', true);
    expect($cur['name'])->toBe('Chrome · Windows');
    $t->deleteJson("/api/v1/me/sessions/{$cur['id']}")->assertStatus(422);
    $t->deleteJson("/api/v1/me/sessions/{$other->accessToken->id}")->assertOk();
    $third = $u->createToken('Firefox', ['traveller'])->plainTextToken;
    $t->putJson('/api/v1/me/password', ['current' => 'wrong', 'password' => 'travel2027', 'password_confirmation' => 'travel2027'])->assertJsonValidationErrors('current');
    $t->putJson('/api/v1/me/password', ['current' => 'password', 'password' => 'short', 'password_confirmation' => 'short'])->assertJsonValidationErrors('password');
    $t->putJson('/api/v1/me/password', ['current' => 'password', 'password' => 'travel2027', 'password_confirmation' => 'travel2027'])->assertOk();
    app('auth')->forgetGuards();
    $this->withToken($third)->getJson('/api/v1/me/summary')->assertUnauthorized();
});

it('exports the traveller’s data as a JSON download', function () {
    $r = asTraveller()->get('/api/v1/me/export')->assertOk()->assertHeader('Content-Disposition');
    expect($r->json())->toHaveKeys(['profile', 'travellers', 'bookings', 'reviews', 'wallet', 'miles'])->and($r->json('bookings'))->not->toBeEmpty()
        ->and(json_encode($r->json()))->not->toContain('nid_enc');
});

it('deletes an account only without active bookings or wallet money, erasing personal data', function () {
    asTraveller()->deleteJson('/api/v1/me/account', ['password' => 'password'])->assertStatus(409);
    $u = newTraveller(['wallet_balance' => 100]);
    asTraveller($u)->deleteJson('/api/v1/me/account', ['password' => 'password'])->assertStatus(409);
    $u = newTraveller();
    Traveller::create(['user_id' => $u->id, 'name' => 'Pest Traveller', 'relation' => 'Self', 'is_self' => true]);
    $t = asTraveller($u);
    $t->deleteJson('/api/v1/me/account', ['password' => 'nope'])->assertJsonValidationErrors('password');
    $t->deleteJson('/api/v1/me/account', ['password' => 'password'])->assertOk();
    $gone = User::withTrashed()->find($u->id);
    expect($gone->trashed())->toBeTrue()->and($gone->email)->toStartWith('deleted+')->and($gone->phone)->toBeNull()
        ->and(Traveller::where('user_id', $u->id)->count())->toBe(0)->and($gone->tokens()->count())->toBe(0);
});

it('takes a review for a completed trip once; publishing awards Miles once and folds the rating in', function () {
    $t = asTraveller();
    $pending = $t->getJson('/api/v1/me/reviews')->json('data');
    expect($pending['miles'])->toBe(250)->and(collect($pending['pending'])->pluck('ref'))->toContain('MSF-25-31207');
    $t->postJson('/api/v1/me/reviews', ['ref' => 'MSF-26-48213', 'rating' => 5, 'body' => 'Not travelled yet but booking it was easy.'])->assertNotFound(); // not completed
    $t->postJson('/api/v1/me/reviews', ['ref' => 'MSF-25-31207', 'rating' => 6, 'body' => 'short'])->assertJsonValidationErrors(['rating', 'body']);
    $id = $t->postJson('/api/v1/me/reviews', ['ref' => 'MSF-25-31207', 'rating' => 4, 'scores' => ['guide' => '5', 'hotels' => '4', 'value' => '4'], 'title' => 'Great Bali trip',
        'body' => 'Ubud villas were lovely and our guide knew every rice terrace by name.'])->assertCreated()->json('data.id');
    $t->postJson('/api/v1/me/reviews', ['ref' => 'MSF-25-31207', 'rating' => 4, 'body' => 'Trying to review the same trip twice here.'])->assertJsonValidationErrors('ref');
    $rv = Review::findOrFail($id);
    expect($rv->status)->toBe('review')->and($rv->category_scores)->toMatchArray(['guide' => 5]);
    $tour = Tour::findOrFail($rv->reviewable_id);
    [$n, $miles] = [$tour->reviews_count, farhana()->miles];
    app(ReviewService::class)->setStatus($rv, 'published');
    app(ReviewService::class)->setStatus($rv->fresh(), 'published'); // idempotent
    expect($tour->fresh()->reviews_count)->toBe($n + 1)->and(farhana()->miles)->toBe($miles + 250)
        ->and(MilesTransaction::where('source_type', Review::class)->where('source_id', $id)->count())->toBe(1);
    app(ReviewService::class)->setStatus($rv->fresh(), 'hidden');
    expect($tour->fresh()->reviews_count)->toBe($n);
});

it('marks one or all notifications read', function () {
    $t = asTraveller();
    $n = $t->getJson('/api/v1/me/notifications')->json('data');
    $first = collect($n['items'])->firstWhere('read', false);
    expect($t->postJson('/api/v1/me/notifications/read', ['id' => $first['id']])->json('data.unread'))->toBe($n['unread'] - 1);
    expect($t->postJson('/api/v1/me/notifications/read', [])->json('data.unread'))->toBe(0);
});

it('gives a referred friend money off a first holiday, and rewards the referrer after the trip', function () {
    $friend = newTraveller(['referred_by' => farhana()->id]);
    $ref = Referral::create(['referrer_id' => farhana()->id, 'referred_user_id' => $friend->id, 'referred_name' => $friend->name, 'status' => 'joined', 'reward' => 500]);
    $d = App\Models\TourDeparture::whereHas('tour', fn ($q) => $q->where('slug', 'maldives-honeymoon'))->where('date', '>', today()->addDays(60))->orderBy('date')->firstOrFail();
    $sel = ['kind' => 'tour', 'slug' => 'maldives-honeymoon', 'date' => $d->date->toDateString(), 'adults' => 2];
    $q = asTraveller($friend)->postJson('/api/v1/checkout/quote?lang=en', $sel)->assertOk()->json('data');
    expect($q['referral']['discount'])->toBe(500);
    app('auth')->forgetGuards();
    expect($this->flushHeaders()->postJson('/api/v1/checkout/quote?lang=en', $sel)->json('data.referral'))->toBeNull(); // signed out
    // a completed, paid trip rewards the referrer's wallet once
    $b = Booking::where('user_id', farhana()->id)->where('ref', 'MSF-26-48213')->firstOrFail();
    $b->forceFill(['user_id' => $friend->id, 'status' => 'confirmed', 'payment_status' => 'paid', 'travel_start' => today()->subDays(9), 'travel_end' => today()->subDays(3)])->save();
    $wallet = (float) farhana()->wallet_balance;
    $this->artisan('bookings:complete-past')->assertSuccessful();
    $this->artisan('bookings:complete-past')->assertSuccessful();
    expect($b->fresh()->status)->toBe('completed')->and($ref->fresh()->status)->toBe('won')->and((float) farhana()->wallet_balance)->toBe($wallet + 500);
});

it('suggests picks the traveller has not booked', function () {
    $d = asTraveller()->getJson('/api/v1/me/dashboard')->json('data');
    $booked = Booking::where('user_id', farhana()->id)->where('product_type', Tour::class)->pluck('product_id');
    $slugs = Tour::whereIn('id', $booked)->pluck('slug')->all();
    expect($d['picks']['items'])->not->toBeEmpty()->and($d['picks']['based_on'])->not->toBeEmpty();
    foreach ($d['picks']['items'] as $p) {
        expect($slugs)->not->toContain($p['slug']);
    }
});
