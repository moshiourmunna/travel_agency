<!doctype html>
<html lang="{{ $p->raw['lang'] ?? 'en' }}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Payment simulator — {{ $p->method }}</title>
<style>
 :root{color-scheme:light dark}
 body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;background:#f1f5f9;color:#0f172a;display:grid;min-height:100vh;place-items:center;padding:16px;box-sizing:border-box}
 .card{background:#fff;border-radius:20px;box-shadow:0 10px 40px rgba(15,23,42,.12);max-width:420px;width:100%;overflow:hidden}
 .top{padding:20px 24px;color:#fff;background:{{ ['bkash' => '#E2136E', 'nagad' => '#EC1C24', 'sslcommerz' => '#1d4ed8'][$p->gateway] ?? '#0D6B65' }}}
 .top small{opacity:.85}.top h1{margin:4px 0 0;font-size:20px}
 .body{padding:24px}.row{display:flex;justify-content:space-between;margin:8px 0;font-size:14px}.amt{font-size:28px;font-weight:800;margin:12px 0 4px}
 .note{background:#fef3c7;color:#78350f;border-radius:12px;padding:10px 12px;font-size:13px;margin:16px 0}
 button{width:100%;border:0;border-radius:12px;padding:14px;font-size:16px;font-weight:700;cursor:pointer;margin-top:10px}
 .ok{background:#0D6B65;color:#fff}.fail{background:#fee2e2;color:#991b1b}.cancel{background:#e2e8f0;color:#0f172a}
 button:focus-visible{outline:3px solid #f59e0b;outline-offset:2px}
 @media (prefers-color-scheme:dark){body{background:#07131F;color:#e2e8f0}.card{background:#0f1f2e}.cancel{background:#1e293b;color:#e2e8f0}}
</style>
</head>
<body>
<main class="card">
 <div class="top"><small>Musafir · sandbox</small><h1>{{ $p->method }} — payment simulator</h1></div>
 <div class="body">
  <div class="row"><span>Booking</span><b>{{ $b->ref }}</b></div>
  <div class="row"><span>Merchant</span><span>{{ config('app.name') }}</span></div>
  <div class="amt">৳ {{ number_format((float) $p->amount) }}</div>
  <div class="note">This is a test payment page. No real money moves. Live gateways replace it when merchant credentials are added in <code>.env</code> and PAYMENT_MODE=live.</div>
  <form method="post" action="{{ $action }}">
   <button class="ok" name="result" value="success" type="submit">Pay ৳ {{ number_format((float) $p->amount) }}</button>
   <button class="fail" name="result" value="failed" type="submit">Simulate failure</button>
   <button class="cancel" name="result" value="cancelled" type="submit">Cancel</button>
  </form>
 </div>
</main>
</body>
</html>
