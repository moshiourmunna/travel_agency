<?php

namespace App\Admin;

use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * One form field of an admin resource. A field knows how to read its value from a model (hydrate),
 * write the submitted value back (fill / afterSave) and which validation rules apply. The React
 * <ResourceForm> renders it from toArray().
 *
 * Bilingual types: tr (one line), trtext (textarea), trhtml (rich text), trlist (list of lines).
 * Structured: repeater (json column, list of objects), children (hasMany rows), json (free shape).
 */
final class Field
{
    public array $label;

    public bool $required = false;

    public array $rules = [];

    public array $options = [];

    public ?array $help = null;

    public int $span = 12;

    public array $meta = [];

    public mixed $default = null;

    public bool $readonly = false;

    public bool $createOnly = false;

    /** @var list<Field> */
    public array $fields = [];

    private ?Closure $get = null;

    private ?Closure $set = null;

    private ?Closure $after = null;

    public function __construct(public string $type, public string $name, string $en, ?string $bn = null)
    {
        $this->label = ['en' => $en, 'bn' => $bn ?? $en];
    }

    // ---- factories ---------------------------------------------------------------------------
    public static function make(string $type, string $name, string $en, ?string $bn = null): self
    {
        return new self($type, $name, $en, $bn);
    }

    public static function text(string $n, string $en, ?string $bn = null): self { return new self('text', $n, $en, $bn); }

    public static function textarea(string $n, string $en, ?string $bn = null): self { return new self('textarea', $n, $en, $bn); }

    public static function email(string $n, string $en, ?string $bn = null): self { return (new self('email', $n, $en, $bn))->rule('email:rfc'); }

    public static function url(string $n, string $en, ?string $bn = null): self { return new self('url', $n, $en, $bn); }

    public static function number(string $n, string $en, ?string $bn = null): self { return (new self('number', $n, $en, $bn))->rule('numeric'); }

    public static function money(string $n, string $en, ?string $bn = null): self { return (new self('money', $n, $en, $bn))->rule('numeric')->rule('min:0'); }

    public static function switch(string $n, string $en, ?string $bn = null): self { return (new self('switch', $n, $en, $bn))->rule('boolean'); }

    public static function date(string $n, string $en, ?string $bn = null): self { return (new self('date', $n, $en, $bn))->rule('date'); }

    public static function datetime(string $n, string $en, ?string $bn = null): self { return (new self('datetime', $n, $en, $bn))->rule('date'); }

    public static function color(string $n, string $en, ?string $bn = null): self { return new self('color', $n, $en, $bn); }

    public static function icon(string $n, string $en = 'Icon', ?string $bn = 'আইকন'): self { return (new self('icon', $n, $en, $bn))->rule('max:60'); }

    public static function password(string $n, string $en, ?string $bn = null): self { return (new self('password', $n, $en, $bn))->rule('min:8'); }

    public static function tr(string $n, string $en, ?string $bn = null): self { return new self('tr', $n, $en, $bn); }

    public static function trtext(string $n, string $en, ?string $bn = null): self { return new self('trtext', $n, $en, $bn); }

    public static function trhtml(string $n, string $en, ?string $bn = null): self { return new self('trhtml', $n, $en, $bn); }

    public static function trlist(string $n, string $en, ?string $bn = null): self { return new self('trlist', $n, $en, $bn); }

    public static function list(string $n, string $en, ?string $bn = null): self { return new self('list', $n, $en, $bn); }

    /** Multiple choice from fixed options, stored as a json list. */
    public static function checks(string $n, string $en, ?string $bn, array $options): self
    {
        $f = new self('checks', $n, $en, $bn);
        $f->options = $options;

        return $f;
    }

    public static function image(string $n, string $en = 'Image', ?string $bn = 'ছবি'): self { return (new self('image', $n, $en, $bn))->rule('exists:media_assets,id'); }

    public static function gallery(string $n, string $en = 'Gallery', ?string $bn = 'গ্যালারি'): self { return new self('gallery', $n, $en, $bn); }

    public static function json(string $n, string $en, ?string $bn = null): self { return new self('json', $n, $en, $bn); }

    public static function slug(string $n = 'slug', string $from = 'title'): self
    {
        return (new self('slug', $n, 'Slug (URL)', 'স্লাগ (ইউআরএল)'))->required()->rule('max:120')->rule('regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/')->meta(['from' => $from, 'unique' => true])
            ->help('Lower-case letters, numbers and hyphens. Changing it changes the public URL.', 'ছোট হাতের অক্ষর, সংখ্যা ও হাইফেন। পরিবর্তন করলে পাবলিক ইউআরএল বদলাবে।');
    }

    /** belongsTo select. $options: [id => label] (label string or {en,bn}). */
    public static function select(string $n, string $en, ?string $bn, array $options): self
    {
        $f = new self('select', $n, $en, $bn);
        $f->options = $options;

        return $f;
    }

    /** Multi-select of ids through a belongsToMany / morphToMany relation method. */
    public static function multi(string $relation, string $en, ?string $bn, array $options): self
    {
        $f = new self('multi', $relation, $en, $bn);
        $f->options = $options;

        return $f;
    }

    /** List of objects stored in a json column. */
    public static function repeater(string $n, string $en, ?string $bn, array $fields): self
    {
        $f = new self('repeater', $n, $en, $bn);
        $f->fields = $fields;

        return $f->rule('array');
    }

    /** hasMany rows edited inline (created / updated / deleted on save). $sort: column that keeps the order. */
    public static function children(string $relation, string $en, ?string $bn, array $fields, ?string $sort = null): self
    {
        $f = new self('children', $relation, $en, $bn);
        $f->fields = $fields;
        $f->meta['sort'] = $sort;

        return $f->rule('array');
    }

    /** Morph-one SEO record (seo_meta). */
    public static function seo(): self
    {
        return new self('seo', 'seo', 'Search engines (SEO)', 'সার্চ ইঞ্জিন (এসইও)');
    }

    // ---- modifiers -----------------------------------------------------------------------------
    public function required(bool $on = true): self { $this->required = $on; return $this; }

    public function rule(string|object $r): self { $this->rules[] = $r; return $this; }

    public function span(int $cols): self { $this->span = $cols; return $this; }

    public function half(): self { return $this->span(6); }

    public function third(): self { return $this->span(4); }

    public function quarter(): self { return $this->span(3); }

    public function help(string $en, ?string $bn = null): self { $this->help = ['en' => $en, 'bn' => $bn ?? $en]; return $this; }

    public function meta(array $m): self { $this->meta = array_merge($this->meta, $m); return $this; }

    public function default(mixed $v): self { $this->default = $v; return $this; }

    public function readonly(bool $on = true): self { $this->readonly = $on; return $this; }

    public function createOnly(): self { $this->createOnly = true; return $this; }

    public function options(array $o): self { $this->options = $o; return $this; }

    /** Custom getter fn(Model): mixed. */
    public function get(Closure $fn): self { $this->get = $fn; return $this; }

    /** Custom setter fn(Model, mixed $value): void (runs before save). */
    public function set(Closure $fn): self { $this->set = $fn; return $this; }

    /** Custom after-save fn(Model, mixed $value): void. */
    public function after(Closure $fn): self { $this->after = $fn; return $this; }

    public function hasAfter(): bool
    {
        return $this->after !== null;
    }

    public function isBilingual(): bool
    {
        return in_array($this->type, ['tr', 'trtext', 'trhtml'], true);
    }

    // ---- read ---------------------------------------------------------------------------------
    public function hydrate(?Model $m): mixed
    {
        if ($this->get) {
            return ($this->get)($m);
        }
        if (! $m || ! $m->exists) {
            return $this->blank();
        }

        return match ($this->type) {
            'tr', 'trtext', 'trhtml' => self::trValue($m, $this->name),
            'trlist' => array_values(array_map(fn ($i) => is_array($i) ? ['en' => (string) ($i['en'] ?? ''), 'bn' => (string) ($i['bn'] ?? '')] : ['en' => (string) $i, 'bn' => ''], (array) self::raw($m, $this->name))),
            'list', 'gallery', 'checks' => array_values((array) (self::raw($m, $this->name) ?? [])),
            'repeater' => array_values(array_map(fn ($row) => $this->hydrateRow((array) $row), (array) (self::raw($m, $this->name) ?? []))),
            'json' => self::raw($m, $this->name),
            'switch' => (bool) $m->getAttribute($this->name),
            'number', 'money' => $m->getAttribute($this->name) === null ? null : $m->getAttribute($this->name) + 0,
            'date' => ($v = $m->getAttribute($this->name)) ? Carbon::parse($v)->format('Y-m-d') : null,
            'datetime' => ($v = $m->getAttribute($this->name)) ? Carbon::parse($v)->timezone(config('app.timezone'))->format('Y-m-d\TH:i') : null,
            'password' => '',
            'multi' => $m->{$this->name}()->pluck($m->{$this->name}()->getRelated()->getTable().'.id')->all(),
            'children' => (($rel = $m->{$this->name}()) && ($this->meta['sort'] ?? null) ? $rel->reorder($this->meta['sort'])->orderBy($rel->getRelated()->getKeyName()) : $rel)->get()->map(fn (Model $c) => ['id' => $c->getKey()] + collect($this->fields)->mapWithKeys(fn (Field $f) => [$f->name => $f->hydrate($c)])->all())->all(),
            'seo' => self::seoValue($m),
            default => $m->getAttribute($this->name),
        };
    }

    /** Sub-field values of a repeater row (shape normalised for the editor). */
    private function hydrateRow(array $row): array
    {
        $out = [];
        foreach ($this->fields as $f) {
            $v = $row[$f->name] ?? null;
            $out[$f->name] = match ($f->type) {
                'tr', 'trtext', 'trhtml' => is_array($v) ? ['en' => (string) ($v['en'] ?? ''), 'bn' => (string) ($v['bn'] ?? '')] : ['en' => (string) ($v ?? ''), 'bn' => ''],
                'switch' => (bool) $v,
                'trlist' => array_values(array_map(fn ($i) => ['en' => (string) ($i['en'] ?? ''), 'bn' => (string) ($i['bn'] ?? '')], (array) $v)),
                'list', 'gallery', 'checks' => array_values((array) $v),
                default => $v,
            };
        }

        return $out;
    }

    public function blank(): mixed
    {
        if ($this->default !== null) {
            return $this->default;
        }

        return match ($this->type) {
            'tr', 'trtext', 'trhtml' => ['en' => '', 'bn' => ''],
            'trlist', 'list', 'gallery', 'repeater', 'children', 'multi', 'checks' => [],
            'switch' => false,
            'seo' => self::seoValue(null),
            'json' => null,
            default => null,
        };
    }

    public static function raw(Model $m, string $name): mixed
    {
        $v = $m->getAttributes()[$name] ?? null;
        if (is_string($v) && $v !== '' && ($v[0] === '[' || $v[0] === '{')) {
            return json_decode($v, true);
        }

        return $m->getAttribute($name);
    }

    public static function trValue(Model $m, string $name): array
    {
        $v = method_exists($m, 'getTranslations') && in_array($name, $m->translatable ?? [], true) ? $m->getTranslations($name) : self::raw($m, $name);
        if (! is_array($v)) {
            return ['en' => (string) ($v ?? ''), 'bn' => ''];
        }

        return ['en' => (string) ($v['en'] ?? ''), 'bn' => (string) ($v['bn'] ?? '')];
    }

    public static function seoValue(?Model $m): array
    {
        $s = $m?->relationLoaded('seo') ? $m->seo : ($m && method_exists($m, 'seo') ? $m->seo()->first() : null);

        return [
            'meta_title' => $s ? self::trValue($s, 'meta_title') : ['en' => '', 'bn' => ''],
            'meta_description' => $s ? self::trValue($s, 'meta_description') : ['en' => '', 'bn' => ''],
            'og_image_id' => $s?->og_image_id,
            'canonical' => $s?->canonical,
            'robots' => $s?->robots ?? 'index,follow',
            'in_sitemap' => $s ? (bool) $s->in_sitemap : true,
            'sitemap_priority' => $s?->sitemap_priority !== null ? (float) $s->sitemap_priority : 0.7,
            'sitemap_changefreq' => $s?->sitemap_changefreq ?? 'weekly',
        ];
    }

    // ---- write --------------------------------------------------------------------------------
    /** Set the attribute(s) on the model before save. */
    public function fill(Model $m, mixed $v): void
    {
        if ($this->readonly) {
            return;
        }
        if ($this->set) {
            ($this->set)($m, $v);

            return;
        }
        switch ($this->type) {
            case 'children': case 'multi': case 'seo':
                return; // after save
            case 'tr': case 'trtext': case 'trhtml':
                $val = self::cleanTr($v, $this->type === 'trhtml');
                if (method_exists($m, 'setTranslations') && in_array($this->name, $m->translatable ?? [], true)) {
                    $m->setTranslations($this->name, array_filter($val, fn ($s) => $s !== ''));
                    if (! array_filter($val, fn ($s) => $s !== '')) {
                        $m->setAttribute($this->name, null);
                    }
                } else {
                    $m->setAttribute($this->name, array_filter($val, fn ($s) => $s !== '') ? $val : null);
                }

                return;
            case 'trlist':
                $rows = array_values(array_filter(array_map(fn ($i) => self::cleanTr($i), (array) $v), fn ($i) => $i['en'] !== '' || $i['bn'] !== ''));
                self::setJson($m, $this->name, $rows);

                return;
            case 'list': case 'checks':
                self::setJson($m, $this->name, array_values(array_filter(array_map(fn ($s) => is_string($s) ? trim($s) : $s, (array) $v), fn ($s) => $s !== '' && $s !== null)));

                return;
            case 'gallery':
                self::setJson($m, $this->name, array_values(array_map('intval', array_filter((array) $v))));

                return;
            case 'repeater':
                self::setJson($m, $this->name, array_values(array_map(fn ($row) => $this->dehydrateRow((array) $row), (array) $v)));

                return;
            case 'json':
                self::setJson($m, $this->name, is_string($v) ? json_decode($v, true) : $v);

                return;
            case 'switch':
                $m->setAttribute($this->name, (bool) $v);

                return;
            case 'number': case 'money':
                $m->setAttribute($this->name, $v === '' || $v === null ? ($this->meta['nullable'] ?? true ? null : 0) : $v + 0);

                return;
            case 'password':
                if (is_string($v) && $v !== '') {
                    $m->setAttribute($this->name, $v);
                }

                return;
            case 'select': case 'image':
                $m->setAttribute($this->name, $v === '' ? null : $v);

                return;
            case 'datetime':
                $m->setAttribute($this->name, $v ? Carbon::parse($v, config('app.timezone')) : null);

                return;
            default:
                $m->setAttribute($this->name, is_string($v) ? (trim($v) === '' ? null : trim($v)) : $v);
        }
    }

    private function dehydrateRow(array $row): array
    {
        $out = [];
        foreach ($this->fields as $f) {
            $v = $row[$f->name] ?? null;
            $out[$f->name] = match ($f->type) {
                'tr', 'trtext', 'trhtml' => self::cleanTr($v, $f->type === 'trhtml'),
                'switch' => (bool) $v,
                'number', 'money' => $v === '' || $v === null ? null : $v + 0,
                'image', 'select' => $v === '' ? null : (is_numeric($v) && $f->type === 'image' ? (int) $v : $v),
                'trlist' => array_values(array_filter(array_map(fn ($i) => self::cleanTr($i), (array) $v), fn ($i) => $i['en'] !== '' || $i['bn'] !== '')),
                'list', 'checks' => array_values(array_filter((array) $v, fn ($s) => $s !== '' && $s !== null)),
                'gallery' => array_values(array_map('intval', array_filter((array) $v))),
                default => is_string($v) ? trim($v) : $v,
            };
        }

        return $out;
    }

    private static function setJson(Model $m, string $name, mixed $value): void
    {
        $casts = $m->getCasts();
        if (isset($casts[$name]) || (method_exists($m, 'isTranslatableAttribute') && $m->isTranslatableAttribute($name))) {
            $m->setAttribute($name, $value);
        } else {
            $m->setAttribute($name, $value === null ? null : json_encode($value, JSON_UNESCAPED_UNICODE));
        }
    }

    public static function cleanTr(mixed $v, bool $html = false): array
    {
        $v = is_array($v) ? $v : ['en' => (string) $v];
        $clean = fn ($s) => $html ? Html::clean((string) ($s ?? '')) : trim((string) ($s ?? ''));

        return ['en' => $clean($v['en'] ?? ''), 'bn' => $clean($v['bn'] ?? '')];
    }

    /** Relations / morph records written after the parent row exists. */
    public function afterSave(Model $m, mixed $v): void
    {
        if ($this->readonly) {
            return;
        }
        if ($this->after) {
            ($this->after)($m, $v);

            return;
        }
        if ($this->type === 'multi') {
            $m->{$this->name}()->sync(array_values(array_map('intval', array_filter((array) $v))));
        } elseif ($this->type === 'children') {
            $this->syncChildren($m, (array) $v);
        } elseif ($this->type === 'seo') {
            $v = (array) $v;
            $data = [
                'meta_title' => array_filter(self::cleanTr($v['meta_title'] ?? []), fn ($s) => $s !== '') ?: null,
                'meta_description' => array_filter(self::cleanTr($v['meta_description'] ?? []), fn ($s) => $s !== '') ?: null,
                'og_image_id' => ($v['og_image_id'] ?? null) ?: null,
                'canonical' => ($v['canonical'] ?? null) ?: null,
                'robots' => ($v['robots'] ?? null) ?: 'index,follow',
                'in_sitemap' => (bool) ($v['in_sitemap'] ?? true),
                'sitemap_priority' => isset($v['sitemap_priority']) && $v['sitemap_priority'] !== '' ? (float) $v['sitemap_priority'] : null,
                'sitemap_changefreq' => ($v['sitemap_changefreq'] ?? null) ?: null,
            ];
            $seo = $m->seo()->first() ?? $m->seo()->make();
            foreach (['meta_title', 'meta_description'] as $k) {
                $data[$k] === null ? $seo->setAttribute($k, null) : $seo->setTranslations($k, $data[$k]);
                unset($data[$k]);
            }
            $seo->fill($data)->save();
        }
    }

    private function syncChildren(Model $parent, array $rows): void
    {
        $rel = $parent->{$this->name}();
        $existing = $rel->get()->keyBy(fn ($c) => $c->getKey());
        $keep = [];
        $sort = $this->meta['sort'] ?? null;
        foreach (array_values($rows) as $i => $row) {
            $row = (array) $row;
            $id = $row['id'] ?? null;
            $child = $id && $existing->has($id) ? $existing->get($id) : $rel->make();
            foreach ($this->fields as $f) {
                if (array_key_exists($f->name, $row) || $f->type === 'switch') {
                    $f->fill($child, $row[$f->name] ?? null);
                }
            }
            if ($sort) {
                $child->setAttribute($sort, $sort === 'day_no' || $sort === 'seq' ? $i + 1 : $i);
            }
            $child->save();
            foreach ($this->fields as $f) {
                if (in_array($f->type, ['multi', 'children'], true)) {
                    $f->afterSave($child, $row[$f->name] ?? []);
                }
            }
            $keep[] = $child->getKey();
        }
        foreach ($existing as $key => $child) {
            if (! in_array($key, $keep, false)) {
                // never silently drop inventory that travellers have already booked
                if ((int) ($child->getAttributes()['seats_held'] ?? 0) > 0 || (int) ($child->getAttributes()['booked'] ?? 0) > 0) {
                    throw \Illuminate\Validation\ValidationException::withMessages([$this->name => app()->getLocale() === 'bn'
                        ? 'বুকিং থাকা তারিখ মোছা যাবে না — এর অবস্থা "বন্ধ" বা "বাতিল" করুন।'
                        : 'A date that already has bookings cannot be removed — set its status to closed or cancelled instead.']);
                }
                $child->delete();
            }
        }
        $parent->unsetRelation($this->name);
    }

    // ---- validation ---------------------------------------------------------------------------
    /** @return array<string, array> */
    public function validationRules(string $prefix = '', ?Model $m = null): array
    {
        $key = $prefix.$this->name;
        $base = array_values(array_filter($this->rules, fn ($r) => ! ($r === 'array')));
        $req = $this->required ? ['required'] : ['nullable'];
        if ($this->type === 'password' && $this->required && $m?->exists) {
            $req = ['nullable'];
        }

        return match ($this->type) {
            'tr', 'trtext', 'trhtml' => [$key => ['array'], "$key.en" => array_merge($this->required ? ['required'] : ['nullable'], ['string', 'max:'.($this->type === 'tr' ? 300 : 200000)]), "$key.bn" => ['nullable', 'string', 'max:'.($this->type === 'tr' ? 300 : 200000)]],
            'trlist' => [$key => ['nullable', 'array', 'max:100'], "$key.*.en" => ['nullable', 'string', 'max:500'], "$key.*.bn" => ['nullable', 'string', 'max:500']],
            'list' => [$key => ['nullable', 'array', 'max:200'], "$key.*" => ['nullable', 'max:500']],
            'checks' => [$key => ['nullable', 'array'], "$key.*" => [\Illuminate\Validation\Rule::in(array_map('strval', array_keys($this->options)))]],
            'gallery' => [$key => ['nullable', 'array', 'max:60'], "$key.*" => ['integer', 'exists:media_assets,id']],
            'multi' => [$key => ['nullable', 'array'], "$key.*" => ['integer']],
            'json' => [$key => ['nullable']],
            'seo' => [$key => ['nullable', 'array'], "$key.meta_title.en" => ['nullable', 'string', 'max:160'], "$key.meta_title.bn" => ['nullable', 'string', 'max:160'],
                "$key.meta_description.en" => ['nullable', 'string', 'max:320'], "$key.meta_description.bn" => ['nullable', 'string', 'max:320'],
                "$key.og_image_id" => ['nullable', 'integer', 'exists:media_assets,id'], "$key.canonical" => ['nullable', 'string', 'max:300'],
                "$key.robots" => ['nullable', \Illuminate\Validation\Rule::in(['index,follow', 'noindex,follow', 'index,nofollow', 'noindex,nofollow'])], "$key.in_sitemap" => ['boolean'],
                "$key.sitemap_priority" => ['nullable', 'numeric', 'between:0,1'], "$key.sitemap_changefreq" => ['nullable', 'in:always,hourly,daily,weekly,monthly,yearly,never']],
            'repeater', 'children' => array_merge([$key => array_merge(['nullable', 'array'], $this->meta['max'] ?? null ? ['max:'.$this->meta['max']] : [])],
                ...array_map(fn (Field $f) => $f->validationRules("$key.*."), $this->fields)),
            'select' => [$key => array_merge($req, $this->options ? [\Illuminate\Validation\Rule::in(array_map('strval', array_keys($this->options)))] : [], $base)],
            'switch' => [$key => ['nullable', 'boolean']],
            'text', 'slug', 'icon', 'color', 'url', 'email', 'password' => [$key => array_merge($req, ['string', 'max:'.($this->meta['max'] ?? 255)], $base)],
            'textarea' => [$key => array_merge($req, ['string', 'max:'.($this->meta['max'] ?? 20000)], $base)],
            default => [$key => array_merge($req, $base)],
        };
    }

    // ---- serialisation for React ----------------------------------------------------------------
    public function toArray(): array
    {
        $loc = app()->getLocale();
        $opts = [];
        foreach ($this->options as $value => $label) {
            $opts[] = ['value' => is_int($value) ? $value : (string) $value, 'label' => is_array($label) ? (string) tr_pick($label, $loc) : (string) $label];
        }

        return array_filter([
            'type' => $this->type,
            'name' => $this->name,
            'label' => tr_pick($this->label, $loc),
            'required' => $this->required,
            'help' => $this->help ? tr_pick($this->help, $loc) : null,
            'span' => $this->span,
            'options' => $this->options ? $opts : null,
            'fields' => $this->fields ? array_map(fn (Field $f) => $f->toArray(), $this->fields) : null,
            'meta' => $this->meta ?: null,
            'readonly' => $this->readonly ?: null,
            'createOnly' => $this->createOnly ?: null,
            'blank' => $this->fields ? collect($this->fields)->mapWithKeys(fn (Field $f) => [$f->name => $f->blank()])->all() : null,
        ], fn ($v) => $v !== null);
    }

    public static function humanize(string $key): string
    {
        return Str::ucfirst(str_replace(['_', '-'], ' ', $key));
    }
}
