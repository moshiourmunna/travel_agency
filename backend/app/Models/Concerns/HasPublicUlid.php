<?php

namespace App\Models\Concerns;

use Illuminate\Support\Str;

/** Fills the public `ulid` column on create (primary keys stay bigint; URLs/APIs never expose sequential ids). */
trait HasPublicUlid
{
    public static function bootHasPublicUlid(): void
    {
        static::creating(function ($model) {
            $model->ulid ??= (string) Str::ulid();
        });
    }
}
