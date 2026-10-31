<?php

use App\Models\Booking;
use App\Models\Payment;
use Illuminate\Http\UploadedFile;

it('updates settings with type checks and purges the site', function () {
    fakeRevalidate();
    asStaff()->put(adminUrl('settings/commerce'), ['values' => ['cancellation_fee' => 2500, 'review_miles' => 300, 'referral_reward' => 600]])->assertSessionHasNoErrors();
    expect(App\Support\Settings::get('commerce.cancellation_fee'))->toEqual(2500);
    assertRevalidated('settings');
    asStaff()->put(adminUrl('settings/commerce'), ['values' => ['deposit_pct' => 150]])->assertSessionHasErrors('values.deposit_pct');
    asStaff()->put(adminUrl('settings/payments'), ['values' => ['gateways' => ['sslcommerz' => false, 'bkash' => false, 'nagad' => false, 'bank_transfer' => false, 'wallet' => false, 'mock' => false]]])->assertSessionHasErrors('values.gateways');
    asStaff()->put(adminUrl('settings/payments'), ['values' => ['gateways' => ['sslcommerz' => true, 'bkash' => false, 'nagad' => true, 'bank_transfer' => true, 'wallet' => true, 'mock' => true]]])->assertSessionHasNoErrors();
    expect(App\Support\Settings::get('payments.gateways')['bkash'])->toBeFalse();
    asStaff()->post(adminUrl('revalidate'))->assertRedirect();
});

it('uploads, edits and safely deletes media', function () {
    Illuminate\Support\Facades\Storage::fake('testing_public');
    fakeRevalidate();
    asStaff('content')->withHeaders(['Accept' => 'application/json'])->post(adminUrl('media'), ['files' => [UploadedFile::fake()->image('pest-photo.jpg', 800, 600)]])
        ->assertOk()->assertJsonPath('data.0.name', 'pest-photo');
    $a = App\Models\MediaAsset::latest('id')->first();
    $this->flushHeaders();
    asStaff('content')->put(adminUrl("media/{$a->id}"), ['name' => 'Pest photo', 'alt' => ['en' => 'A test photo', 'bn' => 'পরীক্ষার ছবি']])->assertSessionHasNoErrors();
    expect($a->fresh()->name)->toBe('Pest photo');

    $used = App\Models\Tour::whereNotNull('image_id')->first()->image_id;
    asStaff('content')->delete(adminUrl("media/$used"))->assertSessionHasErrors('media');
    asStaff('content')->delete(adminUrl("media/{$a->id}"))->assertSessionHasNoErrors();
    expect(App\Models\MediaAsset::find($a->id))->toBeNull();
    asStaff('support')->post(adminUrl('media'), ['files' => [UploadedFile::fake()->image('x.jpg')]])->assertForbidden();
});

it('runs the booking desk: note, offline payment, cancel, refund', function () {
    fakeRevalidate();
    $b = Booking::where('status', 'partial')->whereColumn('total', '>', 'paid')->firstOrFail();
    asStaff('reservations')->get(adminUrl("bookings/{$b->id}"))->assertOk()->assertInertia(fn ($p) => $p->component('Bookings/Show')->where('booking.ref', $b->ref));
    asStaff('reservations')->post(adminUrl("bookings/{$b->id}/note"), ['body' => 'Called the traveller', 'internal' => true])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('booking_activities', ['booking_id' => $b->id, 'type' => 'note']);

    $balance = $b->balance();
    asStaff('accounts')->post(adminUrl("bookings/{$b->id}/payment"), ['amount' => $balance + 1, 'method' => 'cash'])->assertSessionHasErrors('amount');
    asStaff('accounts')->post(adminUrl("bookings/{$b->id}/payment"), ['amount' => 1000, 'method' => 'cash', 'reference' => 'RCPT-1'])->assertSessionHasNoErrors();
    expect((float) $b->fresh()->paid)->toEqual((float) $b->paid + 1000);

    asStaff('sales')->post(adminUrl("bookings/{$b->id}/status"), ['status' => 'cancelled'])->assertSessionHasErrors('reason');
    asStaff('sales')->post(adminUrl("bookings/{$b->id}/status"), ['status' => 'cancelled', 'reason' => 'Traveller asked'])->assertSessionHasNoErrors();
    expect($b->fresh()->status)->toBe('cancelled');

    $p = $b->payments()->where('status', 'success')->first();
    asStaff('accounts')->post(adminUrl("bookings/{$b->id}/refund"), ['payment_id' => $p->id, 'amount' => 500, 'reason' => 'Cancelled', 'to' => 'original', 'process_now' => true])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('refunds', ['booking_id' => $b->id, 'amount' => 500]);
    asStaff('content')->post(adminUrl("bookings/{$b->id}/note"), ['body' => 'x'])->assertForbidden();
});

it('verifies a bank transfer slip and confirms the payment', function () {
    $b = Booking::where('status', 'partial')->whereColumn('total', '>', 'paid')->firstOrFail();
    $p = Payment::create(['booking_id' => $b->id, 'user_id' => $b->user_id, 'purpose' => 'booking', 'gateway' => 'bank_transfer', 'method' => 'Bank transfer', 'amount' => 2000, 'status' => 'pending']);
    asStaff('content')->post(adminUrl("payments/{$p->id}/action/verify"), ['note' => 'x'])->assertForbidden();
    asStaff('accounts')->post(adminUrl("payments/{$p->id}/action/verify"), ['note' => 'CITY-123'])->assertSessionHasNoErrors();
    expect($p->fresh()->status)->toBe('success');
    expect((float) $b->fresh()->paid)->toEqual((float) $b->paid + 2000);
});

it('replies to a ticket and keeps internal notes internal', function () {
    $t = App\Models\SupportTicket::where('status', 'open')->firstOrFail();
    asStaff('support')->get(adminUrl("tickets/{$t->id}"))->assertOk()->assertInertia(fn ($p) => $p->component('Tickets/Show'));
    asStaff('support')->post(adminUrl("tickets/{$t->id}/reply"), ['body' => 'We are on it.'])->assertSessionHasNoErrors();
    expect($t->fresh()->status)->toBe('awaiting');
    asStaff('support')->post(adminUrl("tickets/{$t->id}/reply"), ['body' => 'Internal only', 'internal' => 1])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('ticket_messages', ['support_ticket_id' => $t->id, 'internal' => 1]);
    asStaff('support')->post(adminUrl("tickets/{$t->id}/update"), ['status' => 'resolved', 'priority' => 'high', 'assignee_id' => staff('support')->id])->assertSessionHasNoErrors();
    expect($t->fresh()->status)->toBe('resolved');
});

it('edits translations inline and through CSV', function () {
    fakeRevalidate();
    $tr = App\Models\Translation::where('group', 'ui')->first();
    asStaff('content')->put(adminUrl("translations/{$tr->id}"), ['en' => $tr->value['en'], 'bn' => 'পেস্ট অনুবাদ'])->assertSessionHasNoErrors();
    expect($tr->fresh()->value['bn'])->toBe('পেস্ট অনুবাদ');
    assertRevalidated('translations');
    asStaff('content')->get(adminUrl('translations?f=missing'))->assertOk();
    $csv = asStaff('content')->get(adminUrl('translations/export'));
    $csv->assertOk();
    expect($csv->streamedContent() ?: $csv->getContent())->toContain('পেস্ট অনুবাদ');
});

it('saves a two-level menu', function () {
    fakeRevalidate();
    $m = App\Models\Menu::where('location', 'footer-1')->firstOrFail();
    asStaff('content')->put(adminUrl("menus/{$m->id}"), ['name' => ['en' => 'Company', 'bn' => 'প্রতিষ্ঠান'], 'items' => [
        ['label' => ['en' => 'About', 'bn' => 'আমাদের সম্পর্কে'], 'url' => '/about', 'is_active' => true, 'children' => [['label' => ['en' => 'Team', 'bn' => 'টিম'], 'url' => '/team']]],
        ['label' => ['en' => 'Bad link'], 'url' => 'javascript:alert(1)'],
    ]])->assertSessionHasErrors('items.1.url');
    asStaff('content')->put(adminUrl("menus/{$m->id}"), ['name' => ['en' => 'Company', 'bn' => 'প্রতিষ্ঠান'], 'items' => [
        ['label' => ['en' => 'About', 'bn' => 'আমাদের সম্পর্কে'], 'url' => '/about', 'is_active' => true, 'children' => [['label' => ['en' => 'Team', 'bn' => 'টিম'], 'url' => '/team']]],
    ]])->assertSessionHasNoErrors();
    expect(App\Models\MenuItem::where('menu_id', $m->id)->count())->toBe(2);
    assertRevalidated('menus');
});

it('edits role permissions but never the owner', function () {
    $owner = Spatie\Permission\Models\Role::findByName('owner', 'web');
    $editor = Spatie\Permission\Models\Role::findByName('editor', 'web');
    asStaff()->put(adminUrl("roles/{$owner->id}"), ['permissions' => []])->assertSessionHas('error');
    expect(staff('admin')->fresh()->can('roles.manage'))->toBeTrue();
    $perms = $editor->permissions->pluck('name')->reject(fn ($p) => $p === 'seo.manage')->values()->all();
    asStaff()->put(adminUrl("roles/{$editor->id}"), ['permissions' => $perms])->assertSessionHasNoErrors();
    expect(staff('content')->fresh()->can('seo.manage'))->toBeFalse();
    asStaff('content')->get(adminUrl('roles'))->assertForbidden();
});

it('records an activity log entry and shows it', function () {
    $tour = App\Models\Tour::first();
    asStaff()->put(adminUrl("tours/{$tour->id}"), App\Admin\Registry::get('tours')->formValues($tour));
    $log = Spatie\Activitylog\Models\Activity::latest('id')->first();
    asStaff()->get(adminUrl("activity-log/{$log->id}"))->assertOk();
});
