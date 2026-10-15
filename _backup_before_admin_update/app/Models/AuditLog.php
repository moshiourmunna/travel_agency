<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;


class AuditLog extends Model
{
    
    protected $guarded=['id'];
    public const UPDATED_AT=null; protected $casts=['before'=>'array','after'=>'array'];
}
