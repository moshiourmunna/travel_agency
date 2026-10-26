<?php

namespace App\Services\Pdf;

use App\Http\Presenters\Checkout;
use App\Models\Booking;
use App\Support\Settings;
use Barryvdh\DomPDF\Facade\Pdf;
use Symfony\Component\HttpFoundation\Response;

/** Invoice and e-voucher/e-ticket PDFs (dompdf). Rendered on demand from the booking, so they are always current. */
final class BookingPdf
{
    public function render(Booking $b, string $doc): string
    {
        app()->setLocale('en'); // dompdf has no Bangla text shaping; documents are issued in English.
        $b->loadMissing(['items', 'travellers', 'payments', 'instalments']);
        $data = [
            'b' => $b, 'invoiceNo' => Checkout::invoiceNo($b), 'company' => [
                'name' => tr_pick(Settings::get('company.name'), 'en'), 'address' => tr_pick(Settings::get('company.address'), 'en'),
                'hotline' => Settings::get('company.hotline'), 'email' => Settings::get('company.email'),
                'licences' => collect((array) Settings::get('company.licences', []))->map(fn ($l) => tr_pick($l['name'], 'en').' '.$l['number'])->implode(' · '),
                'bin' => Settings::get('company.bin'),
            ],
            'paidPayments' => $b->payments->where('status', 'success')->values(),
        ];

        return Pdf::loadView("pdf.$doc", $data)->setPaper('a4')->setOption(['defaultFont' => 'DejaVu Sans', 'isRemoteEnabled' => false, 'isFontSubsettingEnabled' => true])->output();
    }

    public function download(Booking $b, string $doc): Response
    {
        $name = ($doc === 'invoice' ? Checkout::invoiceNo($b) : $b->ref.'-'.($b->kind === 'flight' ? 'e-ticket' : 'voucher')).'.pdf';

        return response($this->render($b, $doc), 200, [
            'Content-Type' => 'application/pdf', 'Content-Disposition' => 'inline; filename="'.$name.'"', 'Cache-Control' => 'private, no-store', 'X-Robots-Tag' => 'noindex',
        ]);
    }
}
