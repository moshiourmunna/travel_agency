<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MediaAsset;
use App\Models\MediaFolder;
use App\Support\Revalidator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/** Central media library: upload once, reuse everywhere by id. */
class MediaController extends Controller
{
    /** Columns that hold a single media asset id. */
    public const REF_COLUMNS = [
        ['activities', 'image_id'], ['airlines', 'logo_id'], ['blog_posts', 'image_id'], ['cruises', 'image_id'], ['destinations', 'image_id'], ['gallery_items', 'media_asset_id'],
        ['gift_card_designs', 'image_id'], ['hotels', 'image_id'], ['offers', 'image_id'], ['pages', 'image_id'], ['partners', 'logo_id'], ['seo_meta', 'og_image_id'],
        ['team_members', 'photo_id'], ['testimonials', 'avatar_id'], ['themes', 'image_id'], ['tours', 'image_id'], ['visa_products', 'image_id'],
    ];

    /** JSON columns that hold a list of asset ids. */
    public const GALLERY_COLUMNS = [['activities', 'gallery'], ['cruises', 'gallery'], ['destinations', 'gallery'], ['hotels', 'gallery'], ['tours', 'gallery']];

    public const MIMES = 'jpg,jpeg,png,webp,gif,svg,avif';

    private function guard(Request $r, string $perm = 'content.view'): void
    {
        // anyone who edits content (catalog or CMS) may browse; uploading/changing needs media.manage
        abort_unless($r->user()->can($perm) || ($perm === 'content.view' && $r->user()->can('catalog.manage')), 403);
    }

    private function query(Request $r): Builder
    {
        $q = MediaAsset::query()->with('media');
        if (($term = trim((string) $r->query('q'))) !== '') {
            $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $term).'%';
            $q->where(fn ($w) => $w->where('name', 'like', $like)->orWhere('key', 'like', $like)->orWhere('alt', 'like', $like)->orWhere('credit', 'like', $like));
        }
        $folder = $r->query('folder');
        if ($folder === 'none') {
            $q->whereNull('folder_id');
        } elseif (is_numeric($folder)) {
            $q->where('folder_id', (int) $folder);
        }
        if ($r->query('trashed') === 'only') {
            $q->onlyTrashed();
        }
        match ($r->query('sort')) {
            'name' => $q->orderBy('name'),
            'oldest' => $q->orderBy('id'),
            default => $q->orderByDesc('id'),
        };

        return $q;
    }

    public static function present(MediaAsset $a): array
    {
        $f = $a->file();

        return [
            'id' => $a->id, 'key' => $a->key, 'name' => $a->name, 'alt' => ['en' => (string) ($a->getTranslations('alt')['en'] ?? ''), 'bn' => (string) ($a->getTranslations('alt')['bn'] ?? '')],
            'thumb' => $a->url('thumb'), 'url' => $a->url(), 'card' => $a->url('card'), 'width' => $a->width, 'height' => $a->height,
            'size' => $f?->size, 'mime' => $f?->mime_type, 'file_name' => $f?->file_name, 'folder_id' => $a->folder_id,
            'credit' => $a->credit, 'credit_url' => $a->credit_url, 'license' => $a->license, 'focal' => [$a->focal_x ?? 0.5, $a->focal_y ?? 0.5],
            'created_at' => $a->created_at?->toIso8601String(), 'trashed' => $a->trashed(),
        ];
    }

    private function folders(): array
    {
        $counts = MediaAsset::selectRaw('folder_id, count(*) c')->groupBy('folder_id')->pluck('c', 'folder_id');

        return MediaFolder::orderBy('name')->get()->map(fn ($f) => ['id' => $f->id, 'name' => $f->name, 'parent_id' => $f->parent_id, 'count' => (int) ($counts[$f->id] ?? 0)])->all();
    }

    public function index(Request $r): Response
    {
        $this->guard($r);
        $page = $this->query($r)->paginate(36)->withQueryString();

        return Inertia::render('Media/Index', [
            'assets' => collect($page->items())->map(fn ($a) => self::present($a)),
            'pagination' => ['page' => $page->currentPage(), 'last' => $page->lastPage(), 'total' => $page->total(), 'from' => $page->firstItem(), 'to' => $page->lastItem()],
            'folders' => $this->folders(),
            'unfiled' => MediaAsset::whereNull('folder_id')->count(),
            'query' => ['q' => (string) $r->query('q', ''), 'folder' => (string) $r->query('folder', ''), 'sort' => (string) $r->query('sort', ''), 'trashed' => (string) $r->query('trashed', '')],
            'can' => ['manage' => $r->user()->can('media.manage')],
            'limits' => ['max_mb' => 10, 'mimes' => self::MIMES],
        ]);
    }

    /** JSON for the picker modal. */
    public function browse(Request $r): JsonResponse
    {
        $this->guard($r);
        $page = $this->query($r)->paginate(24);

        return response()->json(['data' => collect($page->items())->map(fn ($a) => self::present($a)), 'page' => $page->currentPage(), 'last' => $page->lastPage(), 'total' => $page->total(), 'folders' => $this->folders()]);
    }

    /** Previews for ids already chosen in a form. */
    public function lookup(Request $r): JsonResponse
    {
        $this->guard($r);
        $ids = array_slice(array_values(array_filter(array_map('intval', explode(',', (string) $r->query('ids'))))), 0, 200);
        $assets = MediaAsset::withTrashed()->with('media')->whereIn('id', $ids)->get()->keyBy('id');

        return response()->json(['data' => collect($ids)->map(fn ($id) => $assets->has($id) ? self::present($assets[$id]) : null)->filter()->values()]);
    }

    public function store(Request $r): JsonResponse|RedirectResponse
    {
        $this->guard($r, 'media.manage');
        $r->validate([
            'files' => ['required', 'array', 'min:1', 'max:20'],
            'files.*' => ['file', 'mimes:'.self::MIMES, 'max:10240'],
            'folder_id' => ['nullable', 'integer', 'exists:media_folders,id'],
            'alt_en' => ['nullable', 'string', 'max:300'],
            'alt_bn' => ['nullable', 'string', 'max:300'],
        ], [], ['files.*' => __('file')]);
        $created = [];
        foreach ($r->file('files') as $i => $file) {
            $this->screen($file, "files.$i");
        }
        foreach ($r->file('files') as $file) {
            $created[] = self::present($this->createAsset($file, $r->integer('folder_id') ?: null, array_filter(['en' => $r->input('alt_en'), 'bn' => $r->input('alt_bn')]), $r->user()->id));
        }
        activity('admin')->causedBy($r->user())->event('created')->withProperties(['resource' => 'media', 'title' => collect($created)->pluck('name')->implode(', ')])->log('uploaded');
        app(Revalidator::class)->add(['media']);

        if ($r->wantsJson() && ! $r->header('X-Inertia')) {
            return response()->json(['data' => $created]);
        }

        return back()->with('success', trans_choice('{1} File uploaded.|[2,*] :count files uploaded.', count($created), ['count' => count($created)]));
    }

    public function createAsset(UploadedFile $file, ?int $folder, array $alt, ?int $by): MediaAsset
    {
        return DB::transaction(function () use ($file, $folder, $alt, $by) {
            [$w, $h] = $this->dimensions($file);
            $name = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
            $asset = new MediaAsset(['name' => mb_substr($name, 0, 190), 'folder_id' => $folder, 'width' => $w, 'height' => $h, 'uploaded_by' => $by, 'focal_x' => 0.5, 'focal_y' => 0.5]);
            $asset->setTranslations('alt', $alt ?: ['en' => ucfirst(trim(preg_replace('/[-_]+/', ' ', $name)))]);
            $asset->save();
            $asset->addMedia($file)->usingFileName(self::safeName($file))->toMediaCollection('file');

            return $asset->load('media');
        });
    }

    /** SVGs are sanitised in place (they are served from our own origin); raster images must be real and not absurdly large. */
    private function screen(UploadedFile $file, string $field): void
    {
        $ext = strtolower($file->getClientOriginalExtension() ?: (string) $file->guessExtension());
        if ($ext === 'svg' || $file->getMimeType() === 'image/svg+xml') {
            $clean = \App\Support\SvgSanitizer::clean((string) file_get_contents($file->getRealPath()));
            if ($clean === null) {
                throw \Illuminate\Validation\ValidationException::withMessages([$field => __('validation.image', ['attribute' => $file->getClientOriginalName()])]);
            }
            file_put_contents($file->getRealPath(), $clean);

            return;
        }
        $size = @getimagesize($file->getRealPath());
        if (! $size || $size[0] < 1 || $size[0] > 12000 || $size[1] > 12000 || $size[0] * $size[1] > 60_000_000) {
            throw \Illuminate\Validation\ValidationException::withMessages([$field => __('validation.dimensions', ['attribute' => $file->getClientOriginalName()])]);
        }
    }

    private static function safeName(UploadedFile $file): string
    {
        $base = \Illuminate\Support\Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)) ?: 'image';

        return mb_substr($base, 0, 80).'.'.strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'jpg');
    }

    private function dimensions(UploadedFile $file): array
    {
        if (str_contains((string) $file->getMimeType(), 'svg')) {
            $svg = @simplexml_load_file($file->getRealPath());
            if ($svg && ($vb = (string) ($svg['viewBox'] ?? ''))) {
                $p = preg_split('/[\s,]+/', trim($vb));
                if (count($p) === 4) {
                    return [(int) $p[2], (int) $p[3]];
                }
            }

            return [null, null];
        }
        $s = @getimagesize($file->getRealPath());

        return $s ? [$s[0], $s[1]] : [null, null];
    }

    public function update(Request $r, int $asset): RedirectResponse
    {
        $this->guard($r, 'media.manage');
        $a = MediaAsset::withTrashed()->findOrFail($asset);
        $d = $r->validate([
            'name' => ['required', 'string', 'max:190'],
            'alt' => ['array'], 'alt.en' => ['nullable', 'string', 'max:300'], 'alt.bn' => ['nullable', 'string', 'max:300'],
            'credit' => ['nullable', 'string', 'max:190'], 'credit_url' => ['nullable', 'url', 'max:300'], 'license' => ['nullable', 'string', 'max:120'],
            'folder_id' => ['nullable', 'integer', 'exists:media_folders,id'],
            'focal' => ['nullable', 'array', 'size:2'], 'focal.*' => ['numeric', 'between:0,1'],
            'restore' => ['nullable', 'boolean'],
        ]);
        $a->fill(['name' => $d['name'], 'credit' => $d['credit'] ?? null, 'credit_url' => $d['credit_url'] ?? null, 'license' => $d['license'] ?? null, 'folder_id' => $d['folder_id'] ?? null]);
        $a->setTranslations('alt', array_filter(['en' => $d['alt']['en'] ?? '', 'bn' => $d['alt']['bn'] ?? '']));
        if (isset($d['focal'])) {
            [$a->focal_x, $a->focal_y] = [(float) $d['focal'][0], (float) $d['focal'][1]];
        }
        $a->save();
        if (! empty($d['restore']) && $a->trashed()) {
            $a->restore();
        }
        ResourceController::log('updated', $a, null, [], ['name' => $a->name]);

        return back()->with('success', __('admin.saved', ['name' => $a->name]));
    }

    public function replace(Request $r, int $asset): RedirectResponse
    {
        $this->guard($r, 'media.manage');
        $a = MediaAsset::findOrFail($asset);
        $r->validate(['file' => ['required', 'file', 'mimes:'.self::MIMES, 'max:10240']]);
        $file = $r->file('file');
        $this->screen($file, 'file');
        [$w, $h] = $this->dimensions($file);
        $a->addMedia($file)->usingFileName(self::safeName($file))->toMediaCollection('file'); // singleFile() removes the old one
        $a->forceFill(['width' => $w, 'height' => $h])->save();
        $a->touch();
        ResourceController::log('updated', $a, null, [], ['file' => 'replaced']);

        return back()->with('success', __('admin.saved', ['name' => $a->name]));
    }

    /** Where an asset is used (so it is not deleted from under live content). */
    public static function usage(int $id): array
    {
        $out = [];
        foreach (self::REF_COLUMNS as [$t, $c]) {
            $n = DB::table($t)->where($c, $id)->when(\Illuminate\Support\Facades\Schema::hasColumn($t, 'deleted_at'), fn ($q) => $q->whereNull('deleted_at'))->count();
            if ($n) {
                $out[] = ['table' => $t, 'count' => $n];
            }
        }
        foreach (self::GALLERY_COLUMNS as [$t, $c]) {
            $n = DB::table($t)->whereJsonContains($c, $id)->whereNull('deleted_at')->count();
            if ($n) {
                $out[] = ['table' => $t.' (gallery)', 'count' => $n];
            }
        }
        $n = DB::table('page_sections')->get(['data'])->filter(fn ($row) => self::jsonRefs(json_decode((string) $row->data, true), $id))->count();
        if ($n) {
            $out[] = ['table' => 'page_sections', 'count' => $n];
        }

        return $out;
    }

    /** True when $v holds $id under a key ending in _image_id / _image_ids. */
    private static function jsonRefs(mixed $v, int $id, ?string $key = null): bool
    {
        if (is_array($v)) {
            if ($key && str_ends_with($key, '_image_ids')) {
                return in_array($id, array_map('intval', $v), true);
            }
            foreach ($v as $k => $x) {
                if (self::jsonRefs($x, $id, is_string($k) ? $k : $key)) {
                    return true;
                }
            }

            return false;
        }

        return $key !== null && (str_ends_with($key, '_image_id') || $key === 'image_id') && (int) $v === $id;
    }

    public function destroy(Request $r, int $asset): RedirectResponse
    {
        $this->guard($r, 'media.manage');
        $a = MediaAsset::findOrFail($asset);
        $used = self::usage($a->id);
        if ($used && ! $r->boolean('force')) {
            throw ValidationException::withMessages(['media' => (app()->getLocale() === 'bn' ? 'ছবিটি ব্যবহৃত হচ্ছে: ' : 'This image is in use: ').collect($used)->map(fn ($u) => $u['table'].' ×'.$u['count'])->implode(', ')]);
        }
        $a->delete(); // soft delete: files are kept so it can be restored
        ResourceController::log('deleted', $a, null, [], ['name' => $a->name]);
        app(Revalidator::class)->add(['media']);

        return back()->with('success', __('admin.deleted', ['name' => $a->name]));
    }

    public function folder(Request $r): RedirectResponse
    {
        $this->guard($r, 'media.manage');
        $d = $r->validate([
            'action' => ['required', Rule::in(['create', 'rename', 'delete'])],
            'id' => ['nullable', 'integer', 'exists:media_folders,id', Rule::requiredIf(fn () => $r->input('action') !== 'create')],
            'name' => ['nullable', 'string', 'max:80', Rule::requiredIf(fn () => $r->input('action') !== 'delete')],
        ]);
        if ($d['action'] === 'create') {
            MediaFolder::create(['name' => $d['name']]);
        } elseif ($d['action'] === 'rename') {
            MediaFolder::whereKey($d['id'])->update(['name' => $d['name']]);
        } else {
            MediaAsset::withTrashed()->where('folder_id', $d['id'])->update(['folder_id' => null]);
            MediaFolder::where('parent_id', $d['id'])->update(['parent_id' => null]);
            MediaFolder::whereKey($d['id'])->delete();
        }

        return back()->with('success', __('admin.done'));
    }
}
