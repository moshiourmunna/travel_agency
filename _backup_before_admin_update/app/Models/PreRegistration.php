<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;


class PreRegistration extends Model
{
    
    protected $guarded=['id'];
    protected $casts=['nid_enc'=>'encrypted','passport_enc'=>'encrypted','dob'=>'date'];
}
