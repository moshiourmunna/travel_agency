<?php

namespace App\Admin;

use Closure;
use Illuminate\Database\Eloquent\Builder;

/** Table filter (rendered as a select in the filter bar). */
final class Filter
{
    public array $label;

    private ?Closure $apply = null;

    public function __construct(public string $key, string $en, ?string $bn, public array $options)
    {
        $this->label = ['en' => $en, 'bn' => $bn ?? $en];
    }

    /** $options: value => label (string or {en,bn}) */
    public static function select(string $key, string $en, ?string $bn, array $options): self { return new self($key, $en, $bn, $options); }

    public static function bool(string $key, string $en, ?string $bn = null): self
    {
        return new self($key, $en, $bn, ['1' => ['en' => 'Yes', 'bn' => 'হ্যাঁ'], '0' => ['en' => 'No', 'bn' => 'না']]);
    }

    public static function status(array $values = ['draft', 'published', 'archived']): self
    {
        $labels = ['draft' => ['en' => 'Draft', 'bn' => 'খসড়া'], 'published' => ['en' => 'Published', 'bn' => 'প্রকাশিত'], 'archived' => ['en' => 'Archived', 'bn' => 'আর্কাইভ']];

        return new self('status', 'Status', 'অবস্থা', array_intersect_key($labels, array_flip($values)) + array_combine($values, $values));
    }

    public function apply(Closure $fn): self { $this->apply = $fn; return $this; }

    public function run(Builder $q, string $value): void
    {
        if ($this->apply) {
            ($this->apply)($q, $value);

            return;
        }
        $q->where($q->getModel()->getTable().'.'.$this->key, $value);
    }

    public function toArray(): array
    {
        $opts = [];
        foreach ($this->options as $v => $l) {
            $opts[] = ['value' => (string) $v, 'label' => is_array($l) ? (string) tr_pick($l) : (string) $l];
        }

        return ['key' => $this->key, 'label' => tr_pick($this->label), 'options' => $opts];
    }
}
