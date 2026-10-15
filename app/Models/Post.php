<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Concerns\HasTranslations;

class Post extends Model
{
    use SoftDeletes, HasTranslations;
    protected $guarded=['id'];
    protected array $translatable=['title','excerpt','body'];
    protected $casts=['published_at'=>'datetime'];
    public function scopePublished($q){ return $q->whereNotNull('published_at')->where('published_at','<=',now()); }
}
