<?php

namespace App\Admin;

use Closure;
use Illuminate\Database\Eloquent\Model;

/**
 * A row (and optionally bulk) operation such as "Approve", "Verify transfer" or "Adjust wallet".
 * handle(Model $m, array $data, User $staff): ?string  — returns a success message or throws ValidationException.
 */
final class Action
{
    public array $label;

    public ?string $permission = null;

    public ?array $confirm = null;

    /** @var list<Field> */
    public array $fields = [];

    public bool $bulk = false;

    public string $tone = 'default';

    public ?string $icon = null;

    private ?Closure $visible = null;

    private ?Closure $handler = null;

    public function __construct(public string $key, string $en, ?string $bn = null)
    {
        $this->label = ['en' => $en, 'bn' => $bn ?? $en];
    }

    public static function make(string $key, string $en, ?string $bn = null): self { return new self($key, $en, $bn); }

    public function permission(string $p): self { $this->permission = $p; return $this; }

    public function confirm(string $en, ?string $bn = null): self { $this->confirm = ['en' => $en, 'bn' => $bn ?? $en]; return $this; }

    public function fields(array $f): self { $this->fields = $f; return $this; }

    public function bulk(bool $on = true): self { $this->bulk = $on; return $this; }

    public function danger(): self { $this->tone = 'danger'; return $this; }

    public function primary(): self { $this->tone = 'primary'; return $this; }

    public function icon(string $i): self { $this->icon = $i; return $this; }

    public function visible(Closure $fn): self { $this->visible = $fn; return $this; }

    public function handle(Closure $fn): self { $this->handler = $fn; return $this; }

    /** Stop the action with a message shown in the dialog. */
    public static function fail(string $message): never
    {
        throw \Illuminate\Validation\ValidationException::withMessages(['action' => $message]);
    }

    public function isVisible(Model $m): bool { return $this->visible ? (bool) ($this->visible)($m) : true; }

    public function run(Model $m, array $data, $user): ?string { return ($this->handler)($m, $data, $user); }

    public function rules(): array
    {
        return array_merge([], ...array_map(fn (Field $f) => $f->validationRules(), $this->fields));
    }

    public function toArray(): array
    {
        return array_filter([
            'key' => $this->key, 'label' => tr_pick($this->label), 'confirm' => $this->confirm ? tr_pick($this->confirm) : null,
            'fields' => $this->fields ? array_map(fn (Field $f) => $f->toArray(), $this->fields) : null,
            'blank' => $this->fields ? collect($this->fields)->mapWithKeys(fn (Field $f) => [$f->name => $f->blank()])->all() : null,
            'bulk' => $this->bulk ?: null, 'tone' => $this->tone, 'icon' => $this->icon,
        ], fn ($v) => $v !== null);
    }
}
