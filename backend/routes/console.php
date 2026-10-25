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

Schedule::command('bookings:expire-holds')->everyMinute()->withoutOverlapping();
Schedule::command('instalments:mark-overdue')->dailyAt('00:10');
