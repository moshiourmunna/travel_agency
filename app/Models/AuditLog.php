<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    protected $guarded = ['id'];
    public const UPDATED_AT = null;
    protected $casts = ['before' => 'array', 'after' => 'array'];

    public function user() { return $this->belongsTo(User::class); }

    /** Record an admin action against a model (or a free-form subject). */
    public static function record(string $action, $subject = null, ?array $before = null, ?array $after = null): self
    {
        $r = request();

        return static::create([
            'user_id' => auth()->id(), 'action' => mb_substr($action, 0, 40),
            'auditable_type' => is_object($subject) ? get_class($subject) : $subject, 'auditable_id' => is_object($subject) ? $subject->getKey() : null,
            'before' => $before, 'after' => $after, 'ip' => $r?->ip(), 'user_agent' => mb_substr((string) $r?->userAgent(), 0, 250),
        ]);
    }
}
