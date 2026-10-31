<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Removes the rows the browser E2E suites create (tooling/tests/*_e2e.mjs) so test runs don't pile up demo data.
 * Only matches the suites' fixed markers (e2e.<ts>@example.com checkouts, e2e-site@musafir.test, the portal suite's
 * ticket/review/traveller texts). Run with --dry-run first.
 */
class E2eCleanup extends Command
{
    protected $signature = 'musafir:e2e-cleanup {--dry-run : Only count what would be removed}';

    protected $description = 'Delete data created by the browser E2E test suites';

    public function handle(): int
    {
        $dry = (bool) $this->option('dry-run');
        $counts = [];
        $run = function (string $label, \Illuminate\Database\Query\Builder $q) use ($dry, &$counts) {
            $counts[$label] = $dry ? $q->count() : $q->delete();
        };

        DB::transaction(function () use ($run) {
            $bookings = DB::table('bookings')->where(fn ($q) => $q
                ->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(contact, '$.email')) LIKE 'e2e.%@example.com'"))->pluck('id');
            $run('payments', DB::table('payments')->whereIn('booking_id', $bookings));
            $run('bookings (+items/travellers/documents/instalments by cascade)', DB::table('bookings')->whereIn('id', $bookings));
            $run('gift cards', DB::table('gift_cards')->where('recipient_email', 'nadia@example.com'));
            $run('inquiries', DB::table('inquiries')->where('email', 'e2e-site@musafir.test'));
            $run('leads', DB::table('leads')->where('email', 'e2e-site@musafir.test'));
            $run('newsletter', DB::table('newsletter_subscribers')->where('email', 'e2e-site@musafir.test'));
            $run('users', DB::table('users')->where('email', 'like', 'e2e.%@example.com'));
            $tickets = DB::table('ticket_messages')->where('body', 'like', '%Could we get a sea-view room for the anniversary night?%')->pluck('support_ticket_id');
            $run('ticket messages', DB::table('ticket_messages')->whereIn('support_ticket_id', $tickets));
            $run('support tickets', DB::table('support_tickets')->whereIn('id', $tickets));
            $run('reviews', DB::table('reviews')->where('body', 'like', '%Ubud villas were lovely and our guide knew every rice terrace%'));
            $run('travellers', DB::table('travellers')->where('name', 'like', 'Ayaan Rahman%')->where('passport_last4', '4567'));
        });

        foreach ($counts as $k => $n) {
            $this->line(sprintf('%-62s %d', $k, $n));
        }
        $this->info(($dry ? 'Would remove ' : 'Removed ').array_sum($counts).' rows.');

        return self::SUCCESS;
    }
}
