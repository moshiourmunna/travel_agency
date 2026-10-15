<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\HasTranslations;

class GalleryItem extends Model
{
    use HasTranslations;
    protected $guarded=['id'];
    protected array $translatable=['caption'];
    
}
