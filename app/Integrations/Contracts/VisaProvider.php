<?php

namespace App\Integrations\Contracts;

/** Saudi visa / Nusuk (Maqam) provider. Real driver: Nusuk B2B API via an authorised Umrah/Hajj service provider. */
interface VisaProvider
{
    /** @return array{provider_ref:string,status:string} */
    public function submit(array $application): array;

    /** @return array{status:string,visa_no?:string,issued_at?:string} */
    public function status(string $providerRef): array;
}
