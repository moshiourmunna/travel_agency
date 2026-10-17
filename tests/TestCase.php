<?php

namespace Tests;

use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use App\Support\SiteConfig;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    /**
     * Every test runs on a frozen clock. The seeders schedule installments, departures and blog dates relative to
     * now(), and RefreshDatabase seeds only once per process, so the clock is frozen BEFORE parent::setUp(). That
     * keeps the golden HTML snapshots (PublicRegressionTest) and date maths independent of the day the suite runs.
     */
    public const FROZEN_NOW = '2026-10-15 12:00:00';

    protected function setUp(): void
    {
        $now = Carbon::parse(self::FROZEN_NOW, 'Asia/Dhaka');
        Carbon::setTestNow($now);
        CarbonImmutable::setTestNow($now->toImmutable());
        parent::setUp();
        SiteConfig::flush();
    }

    protected function tearDown(): void
    {
        parent::tearDown();
        Carbon::setTestNow();
        CarbonImmutable::setTestNow();
    }

    protected function admin(): User { return User::where('email', 'admin@blessinghajj.com')->first(); }
    protected function customer(): User { return User::where('email', 'rahim@example.com')->first(); }
    protected function agentUser(): User { return User::where('email', 'agent@blessinghajj.com')->first(); }
}
