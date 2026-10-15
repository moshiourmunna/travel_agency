<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;


class ApiClient extends Model
{
    
    protected $guarded=['id'];
    protected $casts=['scopes'=>'array','active'=>'boolean']; protected $hidden=['secret_hash'];
}
