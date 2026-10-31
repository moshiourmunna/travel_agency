<?php

namespace App\Http\Controllers\Admin;

use App\Admin\Col;
use App\Admin\Registry;
use App\Admin\Resource;
use App\Http\Controllers\Controller;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Generic list / create / edit / delete / actions for every App\Admin\Resources\* module. */
class ResourceController extends Controller
{
    private function res(string $slug, string $ability = 'view'): Resource
    {
        $res = Registry::get($slug);
        abort_unless($res, 404);
        abort_unless($res->can(request()->user(), $ability), 403);

        return $res;
    }

    private function find(Resource $res, string $id): Model
    {
        $q = $res->query();
        if ($res->softDeletes()) {
            $q->withTrashed();
        }

        return $q->findOrFail($id);
    }

    private function listQuery(Resource $res, Request $r): Builder
    {
        $q = $res->query();
        $table = $q->getModel()->getTable();
        if ($res->softDeletes()) {
            match ($r->query('trashed')) {
                'only' => $q->onlyTrashed(),
                'with' => $q->withTrashed(),
                default => null,
            };
        }
        if (($term = trim((string) $r->query('q'))) !== '') {
            $res->applySearch($q, mb_substr($term, 0, 100));
        }
        foreach ($res->filters() as $f) {
            $v = $r->query('f')[$f->key] ?? null;
            if (is_string($v) && $v !== '') {
                $f->run($q, $v);
            }
        }
        $sort = (string) $r->query('sort', $res->defaultSort);
        $dir = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $key = ltrim($sort, '-');
        $col = collect($res->columns())->first(fn (Col $c) => $c->sortable && $c->sortKey === $key);
        if ($col) {
            if ($col->type === 'tr' && ! str_contains($key, '.') && in_array($key, (new ($res->model))->translatable ?? [], true)) {
                $q->orderByRaw("JSON_UNQUOTE(JSON_EXTRACT({$table}.{$key}, '$.\"".(app()->getLocale() === 'bn' ? 'bn' : 'en')."\"')) {$dir}");
            } else {
                $q->orderBy(str_contains($key, '.') ? $key : "{$table}.{$key}", $dir);
            }
        } elseif ($res->reorder && ! $r->has('sort')) {
            $q->orderBy("{$table}.{$res->reorder}")->orderBy("{$table}.id");
        } else {
            $defKey = ltrim($res->defaultSort, '-');
            $q->orderBy(str_contains($defKey, '.') ? $defKey : "{$table}.{$defKey}", str_starts_with($res->defaultSort, '-') ? 'desc' : 'asc');
        }
        if ($key !== 'id') {
            $q->orderBy("{$table}.id", 'desc');
        }

        return $q;
    }

    private function row(Resource $res, Model $m, $user): array
    {
        $cells = [];
        foreach ($res->columns() as $c) {
            $cells[$c->key] = $c->cell($m);
        }

        return [
            'id' => $m->getKey(),
            'title' => $res->title($m),
            'cells' => $cells,
            'trashed' => method_exists($m, 'trashed') && $m->trashed(),
            'url' => $res->publicUrl($m),
            'href' => $res->link($m),
            'actions' => collect($res->actions())->filter(fn ($a) => (! $a->permission || $user->can($a->permission)) && $a->isVisible($m))->pluck('key')->values(),
            'deletable' => $res->canDelete($m),
        ];
    }

    public function index(Request $r, string $resource): Response
    {
        $res = $this->res($resource);
        $user = $r->user();
        $per = min(100, max(10, (int) $r->query('per', $res->perPage)));
        $page = $this->listQuery($res, $r)->paginate($per)->withQueryString();

        return Inertia::render('Resource/Index', [
            'resource' => $res->meta(),
            'columns' => array_map(fn (Col $c) => $c->toArray(), $res->columns()),
            'filters' => array_map(fn ($f) => $f->toArray(), $res->filters()),
            'actions' => collect($res->actions())->filter(fn ($a) => ! $a->permission || $user->can($a->permission))->map->toArray()->values(),
            'rows' => collect($page->items())->map(fn ($m) => $this->row($res, $m, $user))->values(),
            'pagination' => ['page' => $page->currentPage(), 'last' => $page->lastPage(), 'total' => $page->total(), 'per' => $page->perPage(), 'from' => $page->firstItem(), 'to' => $page->lastItem()],
            'query' => ['q' => (string) $r->query('q', ''), 'f' => (array) $r->query('f', []), 'sort' => (string) $r->query('sort', ''), 'trashed' => (string) $r->query('trashed', ''), 'per' => $per],
            'can' => ['create' => $res->can($user, 'create'), 'update' => $res->can($user, 'update'), 'delete' => $res->can($user, 'delete'), 'show' => $res->hasDetail() || ! $res->editable],
        ]);
    }

    private function formProps(Resource $res, ?Model $m, Request $r): array
    {
        $user = $r->user();
        $sections = array_map(fn ($s) => [
            'title' => tr_pick($s['title']), 'aside' => $s['aside'] ?? false, 'tab' => isset($s['tab']) ? tr_pick($s['tab']) : null,
            'fields' => array_map(fn ($f) => $f->toArray(), $s['fields']),
        ], $res->sections());

        return [
            'resource' => $res->meta(),
            'sections' => $sections,
            'values' => (object) $res->formValues($m),
            'record' => $m ? [
                'id' => $m->getKey(), 'title' => $res->title($m), 'url' => $res->publicUrl($m),
                'trashed' => method_exists($m, 'trashed') && $m->trashed(),
                'created_at' => $m->created_at?->timezone(config('app.timezone'))->format('Y-m-d H:i'),
                'updated_at' => $m->updated_at?->timezone(config('app.timezone'))->format('Y-m-d H:i'),
                'actions' => collect($res->actions())->filter(fn ($a) => (! $a->permission || $user->can($a->permission)) && $a->isVisible($m))->map->toArray()->values(),
                'detail' => $res->detail($m),
                'deletable' => $res->canDelete($m),
            ] : null,
            'can' => ['update' => $m ? $res->can($user, 'update') : $res->can($user, 'create'), 'delete' => $res->can($user, 'delete')],
        ];
    }

    public function create(Request $r, string $resource): Response
    {
        $res = $this->res($resource, 'create');

        return Inertia::render('Resource/Form', $this->formProps($res, null, $r));
    }

    public function edit(Request $r, string $resource, string $id): Response
    {
        $res = $this->res($resource);
        $m = $this->find($res, $id);

        return Inertia::render('Resource/Form', $this->formProps($res, $m, $r));
    }

    public function show(Request $r, string $resource, string $id): Response|RedirectResponse
    {
        $res = $this->res($resource);
        $m = $this->find($res, $id);
        if ($res->detail($m) === null) {
            return redirect()->route('admin.resource.edit', [$resource, $id]);
        }

        return Inertia::render('Resource/Form', $this->formProps($res, $m, $r) + ['showOnly' => ! $res->editable]);
    }

    public function store(Request $r, string $resource): RedirectResponse
    {
        $res = $this->res($resource, 'create');
        $m = new ($res->model);
        $this->save($res, $m, $r, true);

        return $r->boolean('_close')
            ? redirect()->route('admin.resource.index', $resource)->with('success', __('admin.created', ['name' => $res->title($m)]))
            : redirect()->route('admin.resource.edit', [$resource, $m->getKey()])->with('success', __('admin.created', ['name' => $res->title($m)]));
    }

    public function update(Request $r, string $resource, string $id): RedirectResponse
    {
        $res = $this->res($resource, 'update');
        $m = $this->find($res, $id);
        $this->save($res, $m, $r, false);

        return $r->boolean('_close')
            ? redirect()->route('admin.resource.index', $resource)->with('success', __('admin.saved', ['name' => $res->title($m)]))
            : back()->with('success', __('admin.saved', ['name' => $res->title($m)]));
    }

    private function save(Resource $res, Model $m, Request $r, bool $creating): void
    {
        $data = Validator::make($r->all(), $res->rules($creating ? null : $m), [], $res->attributes())->validate();
        $data = array_intersect_key($r->all(), array_flip(array_map(fn ($f) => $f->name, $res->allFields())));
        if ($res->perm === 'catalog' && ($data['status'] ?? null) === 'published' && $m->getOriginal('status') !== 'published' && ! $r->user()->can('catalog.publish')) {
            throw ValidationException::withMessages(['status' => __('admin.cannot_publish')]);
        }
        DB::transaction(function () use ($res, $m, $data, $creating) {
            $res->fill($m, $data);
            $res->beforeSave($m, $data, $creating);
            $before = $creating ? [] : array_intersect_key($m->getOriginal(), $m->getDirty());
            $after = $m->getDirty();
            $m->save();
            $res->saveRelations($m, $data);
            $res->afterSave($m, $data, $creating);
            self::log($creating ? 'created' : 'updated', $m, $res, $before, $after);
        });
    }

    public static function log(string $event, Model $m, ?Resource $res = null, array $old = [], array $new = [], array $extra = []): void
    {
        $skip = ['search_text', 'updated_at', 'created_at', 'password', 'remember_token', 'two_factor_secret', 'nid_enc', 'passport_no_enc'];
        $clean = function (array $a) use ($skip) {
            $a = array_diff_key($a, array_flip($skip));
            foreach ($a as $k => $v) {
                if (is_string($v) && strlen($v) > 2000) {
                    $a[$k] = mb_substr($v, 0, 2000).'…';
                }
                if (is_string($v) && $v !== '' && ($v[0] === '{' || $v[0] === '[')) {
                    $a[$k] = json_decode($v, true) ?? $v;
                }
            }

            return $a;
        };
        activity('admin')->causedBy(auth()->user())->performedOn($m)->event($event)
            ->withProperties(array_filter(['old' => $clean($old), 'attributes' => $clean($new), 'resource' => $res?->slug, 'title' => $res?->title($m)] + $extra, fn ($v) => $v !== [] && $v !== null))
            ->log($event);
    }

    public function destroy(Request $r, string $resource, string $id): RedirectResponse
    {
        $res = $this->res($resource, 'delete');
        $m = $this->find($res, $id);
        if (! $res->canDelete($m)) {
            return back()->with('error', __('admin.cannot_delete'));
        }
        $title = $res->title($m);
        DB::transaction(function () use ($m, $res) {
            $m->delete();
            self::log('deleted', $m, $res);
        });

        return redirect()->route('admin.resource.index', $resource)->with('success', __('admin.deleted', ['name' => $title]));
    }

    public function restore(Request $r, string $resource, string $id): RedirectResponse
    {
        $res = $this->res($resource, 'delete');
        $m = $this->find($res, $id);
        if (method_exists($m, 'restore')) {
            $m->restore();
            self::log('restored', $m, $res);
        }

        return back()->with('success', __('admin.restored', ['name' => $res->title($m)]));
    }

    public function bulkDestroy(Request $r, string $resource): RedirectResponse
    {
        $res = $this->res($resource, 'delete');
        $ids = $r->validate(['ids' => ['required', 'array', 'max:200'], 'ids.*' => ['integer']])['ids'];
        $n = 0;
        DB::transaction(function () use ($res, $ids, &$n) {
            foreach ($res->query()->whereKey($ids)->get() as $m) {
                if ($res->canDelete($m)) {
                    $m->delete();
                    self::log('deleted', $m, $res);
                    $n++;
                }
            }
        });

        return back()->with('success', trans_choice('admin.bulk_deleted', $n, ['n' => $n]));
    }

    public function action(Request $r, string $resource, string $id, string $action): RedirectResponse
    {
        $res = $this->res($resource);
        $a = collect($res->actions())->firstWhere('key', $action);
        abort_unless($a, 404);
        abort_if($a->permission && ! $r->user()->can($a->permission), 403);
        $m = $this->find($res, $id);
        abort_unless($a->isVisible($m), 422);
        $data = Validator::make($r->all(), $a->rules())->validate();
        $msg = DB::transaction(function () use ($a, $m, $data, $r, $res) {
            $msg = $a->run($m, $data, $r->user());
            self::log('action:'.$a->key, $m, $res, [], [], ['input' => array_diff_key($data, array_flip(['password']))]);

            return $msg;
        });

        return back()->with('success', $msg ?: __('admin.done'));
    }

    public function bulkAction(Request $r, string $resource, string $action): RedirectResponse
    {
        $res = $this->res($resource);
        $a = collect($res->actions())->firstWhere('key', $action);
        abort_unless($a && $a->bulk, 404);
        abort_if($a->permission && ! $r->user()->can($a->permission), 403);
        $ids = $r->validate(['ids' => ['required', 'array', 'max:200'], 'ids.*' => ['integer']])['ids'];
        $data = Validator::make($r->all(), $a->rules())->validate();
        $n = 0;
        DB::transaction(function () use ($res, $a, $ids, $data, $r, &$n) {
            foreach ($res->query()->whereKey($ids)->get() as $m) {
                if ($a->isVisible($m)) {
                    $a->run($m, $data, $r->user());
                    self::log('action:'.$a->key, $m, $res);
                    $n++;
                }
            }
        });

        return back()->with('success', trans_choice('admin.bulk_done', $n, ['n' => $n]));
    }

    public function reorder(Request $r, string $resource): RedirectResponse
    {
        $res = $this->res($resource, 'update');
        abort_unless($res->reorder, 404);
        $ids = $r->validate(['ids' => ['required', 'array', 'max:500'], 'ids.*' => ['integer']])['ids'];
        DB::transaction(function () use ($res, $ids) {
            $models = $res->query()->whereKey($ids)->get()->keyBy('id');
            foreach (array_values($ids) as $i => $id) {
                if (($m = $models->get($id)) && (int) $m->{$res->reorder} !== $i) {
                    $m->{$res->reorder} = $i;
                    $m->save();
                }
            }
        });

        return back()->with('success', __('admin.reordered'));
    }

    public function export(Request $r, string $resource): StreamedResponse
    {
        $res = $this->res($resource);
        $q = $this->listQuery($res, $r);
        $cols = $res->columns();
        activity('admin')->causedBy($r->user())->event('export')->withProperties(['resource' => $resource])->log('export');

        return response()->streamDownload(function () use ($q, $cols) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // UTF-8 BOM so Excel shows Bangla correctly
            fputcsv($out, array_merge(['id'], array_map(fn (Col $c) => tr_pick($c->label) ?: $c->key, $cols)));
            $q->chunk(500, function ($rows) use ($out, $cols) {
                foreach ($rows as $m) {
                    $line = [$m->getKey()];
                    foreach ($cols as $c) {
                        $v = $c->cell($m);
                        $line[] = is_array($v) ? ($v['label'] ?? json_encode($v, JSON_UNESCAPED_UNICODE)) : (is_bool($v) ? ($v ? 'yes' : 'no') : $v);
                    }
                    fputcsv($out, $line);
                }
            });
            fclose($out);
        }, $resource.'-'.now()->format('Ymd-His').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
