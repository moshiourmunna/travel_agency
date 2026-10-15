<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Support\AdminResources;
use App\Support\SiteConfig;
use Illuminate\Http\Request;
use App\Support\AdminUi;
use Inertia\Inertia;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class ResourceController extends Controller
{
    public function index(Request $request, string $resource)
    {
        $cfg = AdminResources::get($resource);
        $q = $cfg['model']::query()->orderBy($cfg['order'], $cfg['dir'] ?? 'asc');
        if (isset($cfg['with'])) $q->with($cfg['with']);
        if (($s = $request->query('q')) && isset($cfg['search'])) {
            $q->where($cfg['search'], 'like', "%{$s}%");
        }

        AdminUi::sort($q, $request, collect($cfg['columns'])->keys()->reject(fn ($c) => str_contains($c, '.'))->mapWithKeys(fn ($c) => [$c => $c])->all());
        $cols = collect($cfg['columns'])->map(fn ($l, $c) => ['key' => $c, 'label' => $l, 'sortable' => ! str_contains($c, '.')])->values();

        return Inertia::render('admin/resource/index', [
            'resource' => $resource, 'label' => $cfg['label'], 'searchable' => isset($cfg['search']), 'columns' => $cols,
            'items' => AdminUi::page($q->paginate(20)->withQueryString(), fn ($it) => ['id' => $it->id, 'cells' => collect($cfg['columns'])->map(fn ($l, $c) => self::cell(data_get($it, $c), $c, $l))->all()]),
            'filters' => AdminUi::filters($request, ['q', 'sort', 'dir']),
        ]);
    }

    /** Format one list cell exactly like the old Blade table did. */
    private static function cell($v, string $c, string $l): array
    {
        return match (true) {
            is_bool($v) || in_array($c, ['is_active', 'is_featured'], true) => ['kind' => 'bool', 'value' => (bool) $v],
            $v instanceof \Carbon\CarbonInterface => ['kind' => 'text', 'value' => $v->format('d M Y H:i')],
            is_array($v) => ['kind' => 'text', 'value' => Str::limit(implode(', ', Arr::flatten($v)), 40)],
            is_numeric($v) && str_contains($l, '৳') => ['kind' => 'money', 'value' => (int) $v],
            default => ['kind' => 'text', 'value' => Str::limit((string) $v, 60)],
        };
    }

    public function create(string $resource)
    {
        $cfg = AdminResources::get($resource);
        return Inertia::render('admin/resource/form', $this->formProps($resource, $cfg, new $cfg['model']()));
    }

    public function store(Request $request, string $resource)
    {
        $cfg = AdminResources::get($resource);
        $item = $cfg['model']::create($this->data($request, $cfg));
        $this->audit($request, 'create', $item);

        return redirect()->route('admin.res.index', $resource)->with('ok', 'Saved.');
    }

    public function edit(string $resource, int $id)
    {
        $cfg = AdminResources::get($resource);
        return Inertia::render('admin/resource/form', $this->formProps($resource, $cfg, $cfg['model']::findOrFail($id)));
    }

    private function formProps(string $resource, array $cfg, $item): array
    {
        $fields = []; $values = [];
        foreach ($cfg['fields'] as $name => $f) {
            $key = str_replace('.', '_', $name);
            $raw = $item->exists ? (str_contains($name, '.') ? data_get($item->{explode('.', $name)[0]}, explode('.', $name, 2)[1]) : (in_array($f[0], ['tr', 'trtext', 'trlines'], true) ? $item->getTranslations($name) : $item->getRawOriginal($name))) : null;
            $fields[] = ['name' => $name, 'key' => $key, 'type' => $f[0], 'label' => $f[1], 'required' => ($f[2] ?? null) === 'required',
                'options' => isset($f[3]) ? collect($f[3])->map(fn ($v, $k) => ['value' => $k === 0 && $v === '' ? '' : (string) $k, 'label' => $v === '' ? '—' : (string) $v])->values() : null,
                'preview' => $f[0] === 'image' && $raw ? img($raw) : null];
            $values[$key] = match ($f[0]) {
                'tr', 'trtext' => (object) collect((array) $raw)->map(fn ($v) => (string) $v)->all(),
                'trlines' => (object) collect((array) $raw)->map(fn ($v) => implode("\n", (array) $v))->all(),
                'lines' => implode("\n", (array) (is_string($raw) ? json_decode($raw, true) : $raw)),
                'checkbox' => (bool) ($item->exists ? $raw : true),
                'image' => null, 'password' => '',
                'date' => $raw ? \Carbon\Carbon::parse($raw)->format('Y-m-d') : '',
                'datetime' => $raw ? \Carbon\Carbon::parse($raw)->format('Y-m-d\\TH:i') : '',
                default => $raw === null ? '' : (string) $raw,
            };
        }

        return ['resource' => $resource, 'label' => $cfg['label'], 'id' => $item->exists ? $item->id : null, 'fields' => $fields, 'values' => $values,
            'languages' => collect(SiteConfig::enabledLanguages())->map(fn ($l) => ['code' => $l['code'], 'native' => $l['native_name'] ?? $l['code'], 'dir' => $l['dir'] ?? 'ltr'])->values()];
    }

    public function update(Request $request, string $resource, int $id)
    {
        $cfg = AdminResources::get($resource);
        $item = $cfg['model']::findOrFail($id);
        $before = $item->getAttributes();
        $item->update($this->data($request, $cfg, $item));
        $this->audit($request, 'update', $item, $before);

        return redirect()->route('admin.res.index', $resource)->with('ok', 'Saved.');
    }

    public function destroy(Request $request, string $resource, int $id)
    {
        $cfg = AdminResources::get($resource);
        $item = $cfg['model']::findOrFail($id);
        abort_if($resource === 'users' && $item->id === $request->user()->id, 422, 'You cannot delete yourself.');
        try {
            $item->delete();
        } catch (\Illuminate\Database\QueryException) {
            return back()->with('err', 'This record is used by bookings and cannot be deleted. Deactivate it instead.');
        }
        $this->audit($request, 'delete', $item);

        return back()->with('ok', 'Deleted.');
    }

    private function data(Request $request, array $cfg, $item = null): array
    {
        $langs = array_column(SiteConfig::enabledLanguages(), 'code');
        $table = (new $cfg['model']())->getTable();
        if (array_key_exists('slug', $cfg['fields']) && blank($request->input('slug'))) {
            $request->merge(['slug' => Str::slug($request->input('title.en') ?: Str::random(6)).($item ? '' : '-'.Str::lower(Str::random(3)))]);
        }
        $rules = [];
        foreach ($cfg['fields'] as $name => $f) {
            $req = ($f[2] ?? null) === 'required';
            $key = str_replace('.', '_', $name);
            match ($f[0]) {
                'tr', 'trtext' => $rules[$key.'.en'] = [$req ? 'required' : 'nullable', 'string', 'max:'.($f[0] === 'tr' ? 255 : 60000)],
                'trlines' => $rules[$key.'.*'] = ['nullable', 'string', 'max:5000'],
                'number' => $rules[$key] = [$req ? 'required' : 'nullable', 'numeric'],
                'checkbox' => $rules[$key] = ['nullable'],
                'image' => $rules[$key] = [$req && ! $item ? 'required' : 'nullable', 'image', 'max:4096'],
                'select' => $rules[$key] = [$req ? 'required' : 'nullable', 'in:'.implode(',', array_keys($f[3]))],
                'date', 'datetime' => $rules[$key] = [$req ? 'required' : 'nullable', 'date'],
                'password' => $rules[$key] = ['nullable', 'string', 'min:8'],
                'textarea', 'lines' => $rules[$key] = [$req ? 'required' : 'nullable', 'string', 'max:60000'],
                default => $rules[$key] = [$req ? 'required' : 'nullable', 'string', 'max:255'],
            };
            if (in_array($name, ['slug', 'code', 'email', 'phone'], true)) {
                $rules[$key][] = 'unique:'.$table.','.$name.($item ? ','.$item->id : '');
            }
        }
        $request->validate($rules);

        $data = [];
        foreach ($cfg['fields'] as $name => $f) {
            $key = str_replace('.', '_', $name);
            $val = match ($f[0]) {
                'tr', 'trtext' => array_filter(Arr::only((array) $request->input($key), $langs), fn ($v) => filled($v)) + ($item ? array_diff_key($item->getTranslations($name), array_flip($langs)) : []),
                'trlines' => collect(Arr::only((array) $request->input($key), $langs))->map(fn ($v) => array_values(array_filter(array_map('trim', preg_split('/\r?\n/', (string) $v)))))->filter()->all(),
                'checkbox' => $request->boolean($key),
                'lines' => array_values(array_filter(array_map('trim', preg_split('/\r?\n/', (string) $request->input($key))))),
                'image' => $request->hasFile($key) ? $request->file($key)->store('uploads', 'public') : $item?->getRawOriginal($name),
                'number' => $request->input($key) === null ? (preg_match('/distance|season|lat|lng|b2b|parent/', $name) ? null : 0) : $request->input($key) + 0,
                'select' => $request->input($key) === '' ? null : $request->input($key),
                'password' => $request->input($key),
                default => $request->input($key),
            };
            if ($f[0] === 'password') {
                if (filled($val)) $data['password'] = $val;
                continue;
            }
            if (str_contains($name, '.')) {
                [$col, $sub] = explode('.', $name, 2);
                $data[$col] = array_merge($data[$col] ?? (array) ($item?->{$col} ?? []), [$sub => $val]);
                continue;
            }
            $data[$name] = $val;
        }

        // on create, let DB defaults apply for optional fields left blank
        return $item ? $data : array_filter($data, fn ($v) => $v !== null);
    }

    private function audit(Request $r, string $action, $item, ?array $before = null): void
    {
        AuditLog::create(['user_id' => $r->user()->id, 'action' => $action, 'auditable_type' => get_class($item), 'auditable_id' => $item->getKey(),
            'before' => $before ? Arr::except($before, ['password', 'remember_token']) : null, 'after' => Arr::except($item->getAttributes(), ['password', 'remember_token']), 'ip' => $r->ip()]);
    }
}
