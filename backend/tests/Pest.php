<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\FeatureTestCase;
use Tests\TestCase;

/*
| Feature tests run against the MySQL database `musafir_test` (create it once: see docs/LOCAL_SETUP.md).
| RefreshDatabase + $seed: the full demo seed runs once per test run, then every test is wrapped in a transaction.
*/
pest()->extend(FeatureTestCase::class)->use(RefreshDatabase::class)->in('Feature');
pest()->extend(TestCase::class)->in('Unit');
