<?php

namespace App\Integrations\Stub;

use App\Integrations\Contracts\VisaProvider;
use App\Integrations\LogsCalls;

class StubVisaProvider implements VisaProvider
{
    use LogsCalls;

    public function submit(array $application): array
    {
        return $this->logged('nusuk', 'submit', $application, fn () => ['provider_ref' => 'NSK-'.strtoupper(substr(md5(json_encode($application).microtime()), 0, 8)), 'status' => 'applied']);
    }

    public function status(string $providerRef): array
    {
        return $this->logged('nusuk', 'status', ['ref' => $providerRef], fn () => ['status' => 'applied']);
    }
}
