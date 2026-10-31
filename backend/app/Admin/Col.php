<?php

namespace App\Admin;

use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/** One column of a resource table. Values are rendered server-side into display-ready cells. */
final class Col
{
    public array $label;

    public bool $sortable = false;

    public ?string $sortKey = null;

    public array $badges = [];

    public bool $hideMobile = false;

    private ?Closure $value = null;

    public function __construct(public string $key, public string $type, string $en, ?string $bn = null)
    {
        $this->label = ['en' => $en, 'bn' => $bn ?? $en];
    }

    public static function make(string $key, string $en, ?string $bn = null, string $type = 'text'): self { return new self($key, $type, $en, $bn); }

    public static function tr(string $key, string $en, ?string $bn = null): self { return new self($key, 'tr', $en, $bn); }

    public static function money(string $key, string $en, ?string $bn = null): self { return new self($key, 'money', $en, $bn); }

    public static function number(string $key, string $en, ?string $bn = null): self { return new self($key, 'number', $en, $bn); }

    public static function bool(string $key, string $en, ?string $bn = null): self { return new self($key, 'bool', $en, $bn); }

    public static function date(string $key, string $en, ?string $bn = null): self { return new self($key, 'date', $en, $bn); }

    public static function datetime(string $key, string $en, ?string $bn = null): self { return new self($key, 'datetime', $en, $bn); }

    public static function image(string $key = 'image', string $en = '', ?string $bn = ''): self { return new self($key, 'image', $en, $bn); }

    /** Status pill. $map: value => [en, bn, colour(green|red|blue|gold|gray|purple|accent|brand)] */
    public static function badge(string $key, string $en, ?string $bn, array $map): self
    {
        $c = new self($key, 'badge', $en, $bn);
        $c->badges = $map;

        return $c;
    }

    public function sortable(?string $by = null): self { $this->sortable = true; $this->sortKey = $by ?? $this->key; return $this; }

    public function value(Closure $fn): self { $this->value = $fn; return $this; }

    public function hideMobile(): self { $this->hideMobile = true; return $this; }

    public function cell(Model $m): mixed
    {
        $loc = app()->getLocale();
        $v = $this->value ? ($this->value)($m) : data_get($m, $this->key);
        switch ($this->type) {
            case 'tr':
                if (is_string($this->key) && ! $this->value && method_exists($m, 'getTranslation') && in_array($this->key, $m->translatable ?? [], true)) {
                    return $m->getTranslation($this->key, $loc, true) ?: null;
                }

                return is_array($v) ? tr_pick($v, $loc) : $v;
            case 'money': case 'number':
                return $v === null ? null : $v + 0;
            case 'bool':
                return (bool) $v;
            case 'date':
                return $v ? Carbon::parse($v)->format('Y-m-d') : null;
            case 'datetime':
                return $v ? Carbon::parse($v)->timezone(config('app.timezone'))->format('Y-m-d H:i') : null;
            case 'image':
                if ($v instanceof \App\Models\MediaAsset) {
                    return $v->url('thumb');
                }

                return is_string($v) ? $v : null;
            case 'badge':
                $b = $this->badges[(string) $v] ?? null;

                return $v === null ? null : ['value' => $v, 'label' => $b ? ($loc === 'bn' ? $b[1] : $b[0]) : Field::humanize((string) $v), 'color' => $b[2] ?? 'gray'];
            default:
                return is_array($v) ? tr_pick($v, $loc) : $v;
        }
    }

    public function toArray(): array
    {
        return ['key' => $this->key, 'type' => $this->type, 'label' => tr_pick($this->label), 'sortable' => $this->sortable, 'hideMobile' => $this->hideMobile];
    }
}
