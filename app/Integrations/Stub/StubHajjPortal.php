<?php

namespace App\Integrations\Stub;

use App\Integrations\Contracts\HajjPortal;
use App\Integrations\LogsCalls;

class StubHajjPortal implements HajjPortal
{
    use LogsCalls;

    public function preRegister(array $pilgrim): array
    {
        unset($pilgrim['nid'], $pilgrim['passport']); // never log identity numbers
        return $this->logged('hajj_gov_bd', 'pre_register', $pilgrim, fn () => ['tracking_no' => '2027-HJ-'.random_int(100000, 999999), 'status' => 'received']);
    }

    public function trackingStatus(string $trackingNo): array
    {
        return $this->logged('hajj_gov_bd', 'tracking_status', ['tracking_no' => $trackingNo], fn () => ['tracking_no' => $trackingNo, 'status' => 'received']);
    }
}
