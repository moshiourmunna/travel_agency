<?php

namespace App\Admin;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Closure;
use Illuminate\Validation\Rule;

/**
 * Declarative admin module: one class per table describes its list (columns, filters, search, sort),
 * its form (sections of Fields), permissions and row actions. App\Http\Controllers\Admin\ResourceController
 * and the React pages Resource/Index + Resource/Form render every module from this description.
 */
abstract class Resource
{
    /** @var class-string<Model> */
    public string $model;

    public string $slug;

    /** plural label */
    public array $label;

    public array $singular;

    public string $group = 'content';

    public string $icon = 'circle';

    /** permission prefix: "{perm}.view" / "{perm}.manage" (catalog also has .publish and .delete) */
    public string $perm = 'content';

    public array $with = [];

    /** per-ability permission overrides, e.g. ['view' => 'reviews.moderate'] */
    public array $abilities = [];

    /** plain columns searched with LIKE (json columns are searched in both languages) */
    public array $search = [];

    public string $defaultSort = '-id';

    public int $perPage = 25;

    public bool $creatable = true;

    public bool $editable = true;

    public bool $deletable = true;

    /** drag-to-reorder column (enables the "Reorder" mode on the list) */
    public ?string $reorder = null;

    /** @return list<Col> */
    abstract public function columns(): array;

    /** @return list<array{title: array, fields: list<Field>, aside?: bool, tab?: array}> */
    public function sections(): array
    {
        return [];
    }

    /** @return list<Filter> */
    public function filters(): array
    {
        return [];
    }

    /** @return list<Action> */
    public function actions(): array
    {
        return [];
    }

    public function title(Model $m): string
    {
        $attrs = $m->getAttributes();
        foreach (['title', 'name', 'code', 'ref', 'key', 'slug', 'email'] as $k) {
            if (! array_key_exists($k, $attrs)) {
                continue;
            }
            $v = $m->getAttribute($k);
            if ($v !== null && $v !== '') {
                return is_array($v) ? (string) tr_pick($v) : (string) (method_exists($m, 'getTranslation') && in_array($k, $m->translatable ?? [], true) ? $m->getTranslation($k, app()->getLocale(), true) : $v);
            }
        }

        return '#'.$m->getKey();
    }

    /** Admin link for a row (null = the generic edit / detail page). */
    public function link(Model $m): ?string
    {
        return null;
    }

    /** Link to the record on the public website (shown as "View on site"). */
    public function publicUrl(Model $m): ?string
    {
        return null;
    }

    /** Read-only detail rows for the Show page: list of [label, value, type?]. */
    public function detail(Model $m): ?array
    {
        return null;
    }

    public function hasDetail(): bool
    {
        return (new \ReflectionMethod($this, 'detail'))->getDeclaringClass()->getName() !== self::class;
    }

    public function query(): Builder
    {
        return ($this->model)::query()->with($this->with);
    }

    public function applySearch(Builder $q, string $term): void
    {
        $model = $q->getModel();
        $table = $model->getTable();
        $like = '%'.str_replace(['%', '_'], ['\%', '\_'], mb_strtolower($term)).'%';
        $q->where(function ($w) use ($table, $like, $model) {
            if (\Illuminate\Support\Facades\Schema::hasColumn($table, 'search_text')) {
                $w->orWhereRaw("LOWER({$table}.search_text) LIKE ?", [$like]);
            }
            foreach ($this->search as $col) {
                $cast = $model->getCasts()[$col] ?? null;
                $isJson = in_array($col, $model->translatable ?? [], true) || in_array($cast, ['array', 'json', 'object'], true);
                $isJson ? $w->orWhereRaw("LOWER(CAST({$table}.{$col} AS CHAR)) LIKE ?", [$like]) : $w->orWhereRaw("LOWER({$table}.{$col}) LIKE ?", [$like]);
            }
            if (ctype_digit(trim($like, '%'))) {
                $w->orWhere("{$table}.id", (int) trim($like, '%'));
            }
        });
    }

    public function softDeletes(): bool
    {
        return in_array(SoftDeletes::class, class_uses_recursive($this->model), true);
    }

    // ---- permissions -------------------------------------------------------------------------
    public function ability(string $what): string
    {
        if (isset($this->abilities[$what])) {
            return $this->abilities[$what];
        }
        if ($what !== 'view' && isset($this->abilities['manage'])) {
            return $this->abilities['manage'];
        }

        return match ($what) {
            'view' => "{$this->perm}.view",
            'delete' => $this->perm === 'catalog' ? 'catalog.delete' : "{$this->perm}.manage",
            default => "{$this->perm}.manage",
        };
    }

    public function can(?User $u, string $what): bool
    {
        if (! $u) {
            return false;
        }
        if ($what === 'create' && ! $this->creatable || $what === 'update' && ! $this->editable || $what === 'delete' && ! $this->deletable) {
            return false;
        }

        return $u->can($this->ability($what));
    }

    public function canDelete(Model $m): bool
    {
        return true;
    }

    // ---- save ---------------------------------------------------------------------------------
    /** @return list<Field> */
    public function allFields(): array
    {
        return array_merge(...array_map(fn ($s) => $s['fields'], $this->sections() ?: [['fields' => []]]));
    }

    public function rules(?Model $m): array
    {
        $rules = [];
        foreach ($this->allFields() as $f) {
            foreach ($f->validationRules('', $m) as $k => $r) {
                if (($f->meta['unique'] ?? false) && $k === $f->name) {
                    $r[] = Rule::unique((new $this->model)->getTable(), $f->name)->ignore($m?->getKey());
                }
                $rules[$k] = $r;
            }
        }

        return $rules;
    }

    public function attributes(): array
    {
        $out = [];
        foreach ($this->allFields() as $f) {
            $out[$f->name] = Str::lower(tr_pick($f->label));
            if ($f->isBilingual()) {
                $out[$f->name.'.en'] = tr_pick($f->label).' (EN)';
                $out[$f->name.'.bn'] = tr_pick($f->label).' (BN)';
            }
        }

        return $out;
    }

    /** Hook before the main row is saved (set derived columns). */
    public function beforeSave(Model $m, array $data, bool $creating): void {}

    /** Hook after the row and its relations are saved. */
    public function afterSave(Model $m, array $data, bool $creating): void {}

    public function fill(Model $m, array $data): void
    {
        foreach ($this->allFields() as $f) {
            if ($f->createOnly && $m->exists) {
                continue;
            }
            if (array_key_exists($f->name, $data) || $f->type === 'switch') {
                $f->fill($m, $data[$f->name] ?? null);
            }
        }
    }

    public function saveRelations(Model $m, array $data): void
    {
        foreach ($this->allFields() as $f) {
            if (in_array($f->type, ['children', 'multi', 'seo'], true) || $f->hasAfter()) {
                if (array_key_exists($f->name, $data)) {
                    $f->afterSave($m, $data[$f->name]);
                }
            }
        }
    }

    public function formValues(?Model $m): array
    {
        $out = [];
        foreach ($this->allFields() as $f) {
            $out[$f->name] = $f->hydrate($m);
        }

        return $out;
    }

    public function meta(): array
    {
        return [
            'slug' => $this->slug, 'label' => tr_pick($this->label), 'singular' => tr_pick($this->singular), 'icon' => $this->icon,
            'softDeletes' => $this->softDeletes(), 'reorder' => $this->reorder,
        ];
    }

    // ---- shared option lists -----------------------------------------------------------------
    public static function statusOptions(): array
    {
        return ['draft' => ['en' => 'Draft', 'bn' => 'খসড়া'], 'published' => ['en' => 'Published', 'bn' => 'প্রকাশিত'], 'archived' => ['en' => 'Archived', 'bn' => 'আর্কাইভ']];
    }

    public static function statusBadges(): array
    {
        return ['draft' => ['Draft', 'খসড়া', 'gray'], 'published' => ['Published', 'প্রকাশিত', 'green'], 'archived' => ['Archived', 'আর্কাইভ', 'gold']];
    }

    /** [id => label] for a model, label from a (translatable) column. */
    public static function opts(string $model, string $col = 'name', ?Closure $scope = null): array
    {
        $q = $model::query();
        if ($scope) {
            $scope($q);
        }
        $loc = app()->getLocale();

        return $q->limit(1000)->get()->mapWithKeys(function ($m) use ($col, $loc) {
            $v = method_exists($m, 'getTranslation') && in_array($col, $m->translatable ?? [], true) ? $m->getTranslation($col, $loc, true) : $m->getAttribute($col);

            return [$m->getKey() => is_array($v) ? tr_pick($v) : (string) $v];
        })->all();
    }
}
