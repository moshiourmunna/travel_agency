<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;


class Passport extends Model
{
    
    protected $guarded=['id'];
    protected $casts=['number_enc'=>'encrypted','issue_date'=>'date','expiry_date'=>'date','verified_at'=>'datetime'];
}
