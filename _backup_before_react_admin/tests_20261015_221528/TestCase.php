<?php

namespace Tests;

use App\Models\User;
use App\Support\SiteConfig;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    protected function setUp(): void
    {
        parent::setUp();
        SiteConfig::flush();
    }

    protected function admin(): User { return User::where('email', 'admin@blessinghajj.com')->first(); }
    protected function customer(): User { return User::where('email', 'rahim@example.com')->first(); }
    protected function agentUser(): User { return User::where('email', 'agent@blessinghajj.com')->first(); }
}
