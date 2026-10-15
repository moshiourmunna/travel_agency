<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\HasTranslations;

class ItineraryDay extends Model
{
    use HasTranslations;
    protected $guarded=['id'];
    protected array $translatable=['title','body'];
    public function label(): string { return 'Day '.$this->day_from.($this->day_to && $this->day_to!=$this->day_from ? '–'.$this->day_to : ''); }
}
