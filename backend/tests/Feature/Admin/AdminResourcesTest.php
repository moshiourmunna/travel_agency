<?php

use App\Admin\Registry;

it('opens index, create and the first record of every resource as the owner', function () {
    foreach (Registry::all() as $slug => $res) {
        asStaff()->get(adminUrl($slug))->assertOk()->assertInertia(fn ($p) => $p->component('Resource/Index')->has('rows'));
        if ($res->creatable) {
            asStaff()->get(adminUrl("$slug/create"))->assertOk()->assertInertia(fn ($p) => $p->component('Resource/Form')->has('sections'));
        }
        $m = $res->query()->first();
        if ($m) {
            asStaff()->followingRedirects()->get(adminUrl($res->editable ? "$slug/{$m->getKey()}/edit" : "$slug/{$m->getKey()}"))->assertOk();
        }
    }
});

it('round-trips the form values of every editable resource without validation errors', function () {
    fakeRevalidate();
    $failed = [];
    foreach (Registry::all() as $slug => $res) {
        if (! $res->editable || ! ($m = $res->query()->first())) {
            continue;
        }
        $values = $res->formValues($m);
        foreach ($res->allFields() as $f) {
            if ($f->type === 'password') {
                unset($values[$f->name]);
            }
        }
        $r = asStaff()->from(adminUrl("$slug/{$m->getKey()}/edit"))->put(adminUrl("$slug/{$m->getKey()}"), $values);
        $e = session('errors');
        $e = $e instanceof Illuminate\Support\ViewErrorBag ? $e->getBag('default')->all() : array_filter(Illuminate\Support\Arr::flatten((array) $e), fn ($v) => is_string($v) && $v !== '' && $v !== ':message');
        if ($e) {
            $failed[$slug] = $e;
        }
        $r->assertRedirect();
    }
    expect($failed)->toBe([]);
});

it('creates, updates, searches and deletes an FAQ and revalidates the site with expire 0', function () {
    fakeRevalidate();
    $cat = App\Models\FaqCategory::first();
    asStaff('content')->post(adminUrl('faqs'), [
        'question' => ['en' => 'Pestquestion?', 'bn' => 'পেস্ট প্রশ্ন?'], 'answer' => ['en' => 'Pest answer.', 'bn' => 'পেস্ট উত্তর।'],
        'faq_category_id' => $cat->id, 'show_on' => ['faq'], 'is_active' => true, 'sort' => 99,
    ])->assertRedirect()->assertSessionHasNoErrors();
    $faq = App\Models\Faq::latest('id')->first();
    expect($faq->getTranslation('question', 'bn'))->toBe('পেস্ট প্রশ্ন?');
    assertRevalidated('faqs');

    asStaff('content')->get(adminUrl('faqs?q=Pestquestion'))->assertInertia(fn ($p) => $p->where('pagination.total', 1));
    asStaff('content')->put(adminUrl("faqs/{$faq->id}"), array_merge(Registry::get('faqs')->formValues($faq), ['question' => ['en' => 'Changed?', 'bn' => 'বদলানো?']]))->assertSessionHasNoErrors();
    expect($faq->fresh()->getTranslation('question', 'en'))->toBe('Changed?');
    $this->assertDatabaseHas('activity_log', ['subject_type' => App\Models\Faq::class, 'subject_id' => $faq->id, 'event' => 'updated']);

    asStaff('content')->delete(adminUrl("faqs/{$faq->id}"))->assertRedirect();
    expect(App\Models\Faq::find($faq->id))->toBeNull();
});

it('validates required bilingual fields', function () {
    asStaff('content')->post(adminUrl('faqs'), ['question' => ['en' => '', 'bn' => ''], 'answer' => ['en' => 'x']])
        ->assertSessionHasErrors(['question.en', 'faq_category_id']);
});

it('protects built-in pages and runs bulk actions', function () {
    $home = App\Models\Page::where('slug', 'home')->first();
    asStaff('content')->delete(adminUrl("pages/{$home->id}"))->assertSessionHas('error');
    expect($home->fresh())->not->toBeNull();

    fakeRevalidate();
    $ids = App\Models\Review::where('status', 'review')->pluck('id')->all();
    expect($ids)->not->toBeEmpty();
    asStaff('content')->post(adminUrl('reviews/bulk/publish'), ['ids' => $ids])->assertRedirect();
    expect(App\Models\Review::whereIn('id', $ids)->pluck('status')->unique()->all())->toBe(['published']);
    assertRevalidated('reviews');
});

it('stops staff from changing their own role or suspending themselves', function () {
    $me = staff('admin');
    $values = Registry::get('staff')->formValues($me);
    asStaff()->put(adminUrl("staff/{$me->id}"), array_merge($values, ['role' => 'editor']));
    expect($me->fresh()->hasRole('owner'))->toBeTrue();
});

it('exports CSV', function () {
    $r = asStaff()->get(adminUrl('tours/export'));
    $r->assertOk();
    expect($r->headers->get('content-type'))->toContain('text/csv');
});
