<?php

/*
| Supplier / portal drivers. Every integration is behind an interface in app/Integrations/Contracts;
| the "stub" drivers work offline with seeded data. Add a real adapter class and point the driver at it.
*/
return [
    'visa' => env('VISA_DRIVER', 'stub'),          // stub | nusuk
    'hajj_portal' => env('HAJJ_PORTAL_DRIVER', 'stub'), // stub | hajj_gov_bd
    'flights' => env('FLIGHT_DRIVER', 'stub'),     // stub | sabre | amadeus | travelport
    'hotels' => env('HOTEL_DRIVER', 'stub'),       // stub | hotelbeds | webbeds

    'drivers' => [
        'visa' => ['stub' => App\Integrations\Stub\StubVisaProvider::class],
        'hajj_portal' => ['stub' => App\Integrations\Stub\StubHajjPortal::class],
        'flights' => ['stub' => App\Integrations\Stub\StubFlightProvider::class],
        'hotels' => ['stub' => App\Integrations\Stub\StubHotelProvider::class],
    ],

    'payments' => [
        // method => gateway class. Bank / cash / pay-later are manual (verified by accounts in admin).
        'bkash' => env('PAYMENT_DRIVER_BKASH', App\Integrations\Stub\SimulatedGateway::class),
        'nagad' => env('PAYMENT_DRIVER_NAGAD', App\Integrations\Stub\SimulatedGateway::class),
        'sslcommerz' => env('PAYMENT_DRIVER_SSLCOMMERZ', App\Integrations\Stub\SimulatedGateway::class),
    ],

    'credentials' => [
        'nusuk' => ['base_url' => env('NUSUK_BASE_URL'), 'client_id' => env('NUSUK_CLIENT_ID'), 'secret' => env('NUSUK_SECRET')],
        'hajj_gov_bd' => ['base_url' => env('HAJJ_PORTAL_URL', 'https://www.hajj.gov.bd'), 'agency_code' => env('HAJJ_AGENCY_CODE'), 'api_key' => env('HAJJ_PORTAL_KEY')],
        'sabre' => ['pcc' => env('SABRE_PCC'), 'client_id' => env('SABRE_CLIENT_ID'), 'secret' => env('SABRE_SECRET')],
        'hotelbeds' => ['api_key' => env('HOTELBEDS_KEY'), 'secret' => env('HOTELBEDS_SECRET')],
        'bkash' => ['app_key' => env('BKASH_APP_KEY'), 'app_secret' => env('BKASH_APP_SECRET'), 'username' => env('BKASH_USERNAME'), 'password' => env('BKASH_PASSWORD'), 'sandbox' => env('BKASH_SANDBOX', true)],
        'nagad' => ['merchant_id' => env('NAGAD_MERCHANT_ID'), 'sandbox' => env('NAGAD_SANDBOX', true)],
        'sslcommerz' => ['store_id' => env('SSLCZ_STORE_ID'), 'store_password' => env('SSLCZ_STORE_PASSWORD'), 'sandbox' => env('SSLCZ_SANDBOX', true)],
    ],
];
