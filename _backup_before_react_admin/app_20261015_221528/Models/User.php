<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = ['name', 'email', 'phone', 'password', 'role', 'locale', 'status', 'phone_verified_at', 'last_login_at'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return ['email_verified_at' => 'datetime', 'phone_verified_at' => 'datetime', 'last_login_at' => 'datetime', 'password' => 'hashed'];
    }

    public function customer() { return $this->hasOne(Customer::class); }
    public function agent() { return $this->hasOne(Agent::class); }

    public function isAdmin(): bool { return in_array($this->role, ['admin', 'staff'], true); }
    /** Full admin (not staff): may delete, restore, refund and pay out commissions. */
    public function isOwner(): bool { return $this->role === 'admin'; }
    public function isAgent(): bool { return $this->role === 'agent'; }

    /** Every user who books gets a customer profile. */
    public function customerProfile(): Customer
    {
        return $this->customer ?? $this->customer()->create([]);
    }

    public function initials(): string
    {
        $p = preg_split('/\s+/', trim(preg_replace('/^(md\.?|mohammad)\s+/i', '', $this->name)));
        return strtoupper(mb_substr($p[0] ?? 'U', 0, 1).mb_substr($p[1] ?? '', 0, 1));
    }
}
