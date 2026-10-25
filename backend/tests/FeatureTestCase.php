<?php

namespace Tests;

/** Feature tests: full demo seed once per run (RefreshDatabase), each test inside a transaction. */
abstract class FeatureTestCase extends TestCase
{
    protected bool $seed = true;
}
