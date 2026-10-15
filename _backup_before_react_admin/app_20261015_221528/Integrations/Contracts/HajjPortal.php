<?php

namespace App\Integrations\Contracts;

/** Bangladesh Government Hajj portal (hajj.gov.bd) – pre-registration / registration export & tracking numbers. */
interface HajjPortal
{
    /** @return array{tracking_no:string,status:string} */
    public function preRegister(array $pilgrim): array;

    public function trackingStatus(string $trackingNo): array;
}
