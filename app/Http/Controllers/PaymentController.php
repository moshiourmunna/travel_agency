<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Services\PaymentService;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    /** Demo gateway page (SimulatedGateway). Real gateways redirect to their own hosted page. */
    public function simulate(Request $request, Payment $payment)
    {
        abort_unless($payment->booking->customer->user_id === $request->user()->id, 403);
        abort_unless($payment->status === 'pending' && $payment->isOnline(), 404);

        return view('booking.simulate', ['payment' => $payment->load('booking.package')]);
    }

    /** Gateway callback / IPN. */
    public function callback(Request $request, Payment $payment, PaymentService $svc)
    {
        $gw = $svc->gateway($payment->method);
        abort_unless($gw, 404);
        $res = $gw->verify($payment, $request->all());
        $res['ok'] ? $svc->markPaid($payment, $res['txn_id'], $res['payload']) : $svc->markFailed($payment, $res['payload']);

        return redirect()->route('booking.done', $payment->booking)->with($res['ok'] ? 'ok' : 'err', $res['ok']
            ? t3('Payment successful. Thank you!', 'পেমেন্ট সফল হয়েছে। ধন্যবাদ!', 'تم الدفع بنجاح. شكراً!')
            : t3('Payment was not completed. You can try again from your dashboard.', 'পেমেন্ট সম্পন্ন হয়নি। ড্যাশবোর্ড থেকে আবার চেষ্টা করুন।', 'لم يكتمل الدفع.'));
    }
}
