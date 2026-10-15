<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;


class IntegrationLog extends Model
{
    
    protected $guarded=['id'];
    public const UPDATED_AT=null; protected $casts=['request'=>'array','response'=>'array'];
}
