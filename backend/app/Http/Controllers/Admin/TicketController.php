<?php

namespace App\Http\Controllers\Admin;

use App\Admin\Resources\TicketResource as TR;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\SupportTicket;
use App\Models\TicketMessage;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Support desk: one conversation with the traveller, internal notes, status, priority and assignee. */
class TicketController extends Controller
{
    private static function opt(array $map): array
    {
        return collect($map)->map(fn ($s, $k) => ['value' => $k, 'label' => tr_pick(['en' => $s[0], 'bn' => $s[1]]), 'color' => $s[2]])->values()->all();
    }

    public function show(Request $r, SupportTicket $ticket): Response
    {
        abort_unless($r->user()->can('tickets.view'), 403);
        $t = $ticket->load(['user', 'assignee', 'booking']);
        $messages = TicketMessage::with('user')->where('support_ticket_id', $t->id)->orderBy('id')->get();

        return Inertia::render('Tickets/Show', [
            'ticket' => [
                'id' => $t->id, 'ref' => $t->ref, 'subject' => $t->tr('subject'), 'status' => $t->status, 'priority' => $t->priority, 'assignee_id' => $t->assignee_id, 'booking_id' => $t->booking_id,
                'customer' => $t->user ? ['name' => $t->user->name, 'email' => $t->user->email, 'phone' => $t->user->phone, 'href' => $r->user()->can('customers.view') ? route('admin.resource.show', ['customers', $t->user->id], false) : null] : ['name' => $t->customer_name],
                'booking' => $t->booking ? ['ref' => $t->booking->ref, 'title' => $t->booking->tr('title'), 'href' => $r->user()->can('bookings.view') ? route('admin.bookings.show', $t->booking->id, false) : null] : null,
                'created_at' => $t->created_at?->toIso8601String(), 'last_activity_at' => $t->last_activity_at?->toIso8601String(),
            ],
            'messages' => $messages->map(fn ($m) => [
                'id' => $m->id, 'author_type' => $m->author_type, 'author' => $m->author_type === 'customer' ? ($t->user?->name ?? $t->customer_name) : ($m->user?->name ?? 'Musafir'),
                'body' => $m->tr('body'), 'internal' => (bool) $m->internal, 'at' => $m->created_at?->toIso8601String(),
                'attachments' => collect($m->attachments ?? [])->map(fn ($a, $i) => ['name' => $a['name'] ?? 'file', 'size' => $a['size'] ?? null, 'url' => isset($a['path']) ? route('admin.tickets.file', [$t->id, $m->id, $i], false) : null])->values(),
            ]),
            'options' => [
                'status' => self::opt(TR::STATUS), 'priority' => self::opt(TR::PRIORITY),
                'staff' => User::where('type', 'staff')->where('status', 'active')->orderBy('name')->get(['id', 'name'])->map(fn ($s) => ['value' => $s->id, 'label' => $s->name]),
                'bookings' => $t->user_id ? Booking::where('user_id', $t->user_id)->latest()->limit(20)->get()->map(fn ($b) => ['value' => $b->id, 'label' => $b->ref.' · '.$b->tr('title')]) : [],
            ],
            'can' => ['manage' => $r->user()->can('tickets.manage')],
        ]);
    }

    public function reply(Request $r, SupportTicket $ticket): RedirectResponse
    {
        abort_unless($r->user()->can('tickets.manage'), 403);
        $d = $r->validate([
            'body' => ['required', 'string', 'max:5000'],
            'internal' => ['nullable', 'boolean'],
            'status' => ['nullable', Rule::in(array_keys(TR::STATUS))],
            'files' => ['nullable', 'array', 'max:5'],
            'files.*' => ['file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
        ]);
        $att = [];
        foreach ($r->file('files', []) as $f) {
            $att[] = ['name' => Str::limit(preg_replace('/[^\w.\- ]+/u', '_', $f->getClientOriginalName()), 80, ''), 'size' => $f->getSize(), 'mime' => $f->getMimeType(), 'path' => $f->store("tickets/{$ticket->ref}", 'local')];
        }
        $internal = (bool) ($d['internal'] ?? false);
        $body = strip_tags($d['body']);
        TicketMessage::create(['support_ticket_id' => $ticket->id, 'user_id' => $r->user()->id, 'author_type' => 'agent', 'body' => ['en' => $body, 'bn' => $body], 'internal' => $internal, 'attachments' => $att ?: null]);
        $ticket->update([
            'status' => $d['status'] ?? ($internal ? $ticket->status : 'awaiting'),
            'assignee_id' => $ticket->assignee_id ?? $r->user()->id,
            'last_activity_at' => now(),
        ]);
        Cache::forget('admin.badges');

        return back()->with('success', $internal ? (app()->getLocale() === 'bn' ? 'অভ্যন্তরীণ নোট যোগ হয়েছে।' : 'Internal note added.') : (app()->getLocale() === 'bn' ? 'উত্তর পাঠানো হয়েছে।' : 'Reply sent — the traveller sees it in their account.'));
    }

    public function update(Request $r, SupportTicket $ticket): RedirectResponse
    {
        abort_unless($r->user()->can('tickets.manage'), 403);
        $d = $r->validate([
            'status' => ['required', Rule::in(array_keys(TR::STATUS))],
            'priority' => ['required', Rule::in(array_keys(TR::PRIORITY))],
            'assignee_id' => ['nullable', 'integer', Rule::exists('users', 'id')->where('type', 'staff')],
            'booking_id' => ['nullable', 'integer', Rule::exists('bookings', 'id')->where('user_id', $ticket->user_id)],
        ]);
        $old = $ticket->only(array_keys($d));
        $ticket->update($d + ['last_activity_at' => now()]);
        ResourceController::log('updated', $ticket, null, $old, $d, ['resource' => 'tickets', 'title' => $ticket->ref]);
        Cache::forget('admin.badges');

        return back()->with('success', __('admin.saved', ['name' => $ticket->ref]));
    }

    public function file(Request $r, SupportTicket $ticket, int $message, int $i): StreamedResponse
    {
        abort_unless($r->user()->can('tickets.view'), 403);
        $m = TicketMessage::where('support_ticket_id', $ticket->id)->findOrFail($message);
        $a = ($m->attachments ?? [])[$i] ?? abort(404);
        abort_unless(isset($a['path']) && Storage::disk('local')->exists($a['path']), 404);

        return Storage::disk('local')->download($a['path'], $a['name'] ?? 'attachment', ['Cache-Control' => 'no-store, private']);
    }
}
