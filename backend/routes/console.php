<?php

use App\Models\Booking;
use App\Models\Instalment;
use App\Services\Checkout\BookingService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

// Unpaid bookings whose seat hold has run out are cancelled and their seats released.
Artisan::command('bookings:expire-holds', function (BookingService $svc) {
    $n = 0;
    Booking::where('payment_status', 'unpaid')->where('status', 'pending')->whereNotNull('hold_expires_at')->where('hold_expires_at', '<', now())
        ->with('items')->chunkById(100, function ($rows) use ($svc, &$n) {
            foreach ($rows as $b) {
                $svc->expire($b);
                $n++;
            }
        });
    $this->info("Expired {$n} booking hold(s).");
})->purpose('Cancel unpaid bookings whose payment window has passed and release their seats');

// Instalments past their due date become overdue (reminders are sent from the admin/notifications module).
Artisan::command('instalments:mark-overdue', function () {
    $n = Instalment::whereIn('status', ['due', 'upcoming'])->whereDate('due_date', '<', today())->update(['status' => 'overdue']);
    $this->info("Marked {$n} instalment(s) overdue.");
})->purpose('Flag unpaid instalments whose due date has passed');

// Fully paid trips that have ended become "completed" (opens reviews, pays any referral reward).
Artisan::command('bookings:complete-past', function (\App\Services\ReferralService $refs) {
    $n = 0;
    Booking::where('status', 'confirmed')->where('payment_status', 'paid')
        ->where(fn ($q) => $q->whereDate('travel_end', '<', today())->orWhere(fn ($q) => $q->whereNull('travel_end')->whereDate('travel_start', '<', today())))
        ->chunkById(100, function ($rows) use ($refs, &$n) {
            foreach ($rows as $b) {
                $b->update(['status' => 'completed']);
                \App\Models\BookingActivity::create(['booking_id' => $b->id, 'type' => 'status', 'body' => ['en' => 'Trip completed', 'bn' => 'ট্রিপ সম্পন্ন'], 'internal' => false]);
                $refs->rewardFor($b);
                $n++;
            }
        });
    $this->info("Completed {$n} booking(s).");
})->purpose('Mark fully paid bookings whose travel has ended as completed');

Schedule::command('bookings:expire-holds')->everyMinute()->withoutOverlapping();
Schedule::command('bookings:complete-past')->dailyAt('00:20');
Schedule::command('instalments:mark-overdue')->dailyAt('00:10');

// Queue fallback for hosts without a process supervisor (shared/cPanel, most PaaS cron add-ons): one cron line
// `* * * * * php artisan schedule:run` drains the database queue every minute. Disable with QUEUE_VIA_SCHEDULE=false
// when a real worker (`php artisan queue:work`, Supervisor/systemd) is running.
if (config('queue.default') !== 'sync' && config('musafir.queue_via_schedule')) {
    Schedule::command('queue:work --stop-when-empty --max-time=50 --tries=3')->everyMinute()->withoutOverlapping()->runInBackground();
}
Schedule::command('queue:prune-failed --hours=168')->daily();
Schedule::command('model:prune')->daily();
Schedule::command('auth:clear-resets')->everyFifteenMinutes();
Schedule::command('sanctum:prune-expired --hours=24')->daily();
