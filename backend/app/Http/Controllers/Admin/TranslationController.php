<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Translation;
use App\Support\Revalidator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Website UI strings (buttons, labels, messages) keyed by their English source text. */
class TranslationController extends Controller
{
    private function guard(Request $r): void
    {
        abort_unless($r->user()->can('translations.manage'), 403);
    }

    public function index(Request $r): Response
    {
        $this->guard($r);
        $q = Translation::query();
        if (($term = trim((string) $r->query('q'))) !== '') {
            $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $term).'%';
            $q->where(fn ($w) => $w->where('key', 'like', $like)->orWhereRaw('CAST(value AS CHAR) LIKE ?', [$like]));
        }
        match ($r->query('f')) {
            'missing' => $q->where(fn ($w) => $w->whereRaw("COALESCE(JSON_UNQUOTE(JSON_EXTRACT(value, '$.bn')), '') = ''")->orWhereRaw("COALESCE(JSON_UNQUOTE(JSON_EXTRACT(value, '$.en')), '') = ''")),
            'edited' => $q->whereColumn('updated_at', '>', 'created_at'),
            default => null,
        };
        if ($r->query('group')) {
            $q->where('group', $r->query('group'));
        }
        $page = $q->orderBy($r->query('sort') === 'recent' ? 'updated_at' : 'key', $r->query('sort') === 'recent' ? 'desc' : 'asc')->paginate(50)->withQueryString();

        return Inertia::render('Translations', [
            'rows' => collect($page->items())->map(fn (Translation $t) => ['id' => $t->id, 'group' => $t->group, 'key' => $t->key, 'en' => (string) ($t->value['en'] ?? ''), 'bn' => (string) ($t->value['bn'] ?? ''), 'updated_at' => $t->updated_at?->toIso8601String(), 'edited' => $t->updated_at && $t->created_at && $t->updated_at->gt($t->created_at)]),
            'pagination' => ['page' => $page->currentPage(), 'last' => $page->lastPage(), 'total' => $page->total(), 'from' => $page->firstItem(), 'to' => $page->lastItem()],
            'query' => ['q' => (string) $r->query('q', ''), 'f' => (string) $r->query('f', ''), 'sort' => (string) $r->query('sort', ''), 'group' => (string) $r->query('group', '')],
            'groups' => Translation::distinct()->orderBy('group')->pluck('group'),
            'stats' => ['total' => Translation::count(), 'missing' => Translation::whereRaw("COALESCE(JSON_UNQUOTE(JSON_EXTRACT(value, '$.bn')), '') = ''")->count()],
        ]);
    }

    public function store(Request $r): RedirectResponse
    {
        $this->guard($r);
        $d = $r->validate([
            'key' => ['required', 'string', 'max:191', Rule::unique('translations', 'key')->where('group', $r->input('group', 'ui'))],
            'group' => ['nullable', 'string', 'max:40', 'alpha_dash'],
            'en' => ['required', 'string', 'max:5000'], 'bn' => ['nullable', 'string', 'max:5000'],
        ]);
        $t = Translation::create(['group' => $d['group'] ?? 'ui', 'key' => $d['key'], 'value' => ['en' => $d['en'], 'bn' => $d['bn'] ?? '']]);
        ResourceController::log('created', $t, null, [], ['key' => $t->key, 'value' => $t->value]);

        return back()->with('success', __('admin.created', ['name' => mb_strimwidth($t->key, 0, 40, '…')]));
    }

    public function update(Request $r, Translation $translation): RedirectResponse
    {
        $this->guard($r);
        $d = $r->validate(['en' => ['required', 'string', 'max:5000'], 'bn' => ['nullable', 'string', 'max:5000']]);
        $old = $translation->value;
        $new = ['en' => $d['en'], 'bn' => (string) ($d['bn'] ?? '')];
        if ($old != $new) {
            $translation->update(['value' => $new]);
            ResourceController::log('updated', $translation, null, ['value' => $old], ['value' => $new], ['title' => mb_strimwidth($translation->key, 0, 60, '…')]);
        }

        return back()->with('success', __('admin.saved', ['name' => mb_strimwidth($translation->key, 0, 40, '…')]));
    }

    public function destroy(Request $r, Translation $translation): RedirectResponse
    {
        $this->guard($r);
        $translation->delete();
        ResourceController::log('deleted', $translation, null, [], [], ['title' => $translation->key]);

        return back()->with('success', __('admin.deleted', ['name' => mb_strimwidth($translation->key, 0, 40, '…')]));
    }

    public function export(Request $r): StreamedResponse
    {
        $this->guard($r);

        return response()->streamDownload(function () {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['group', 'key', 'en', 'bn']);
            Translation::orderBy('group')->orderBy('key')->chunk(500, function ($rows) use ($out) {
                foreach ($rows as $t) {
                    fputcsv($out, [$t->group, $t->key, $t->value['en'] ?? '', $t->value['bn'] ?? '']);
                }
            });
            fclose($out);
        }, 'musafir-ui-strings-'.now()->format('Ymd').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** CSV with columns group,key,en,bn: updates existing keys and adds new ones. */
    public function import(Request $r): RedirectResponse
    {
        $this->guard($r);
        $r->validate(['file' => ['required', 'file', 'mimes:csv,txt', 'max:5120']]);
        $fh = fopen($r->file('file')->getRealPath(), 'r');
        $head = fgetcsv($fh) ?: [];
        $head = array_map(fn ($h) => strtolower(trim(preg_replace('/^\xEF\xBB\xBF/', '', (string) $h))), $head);
        $ix = array_flip($head);
        if (! isset($ix['key'], $ix['en'])) {
            return back()->with('error', app()->getLocale() === 'bn' ? 'CSV-তে key ও en কলাম থাকতে হবে।' : 'The CSV needs key and en columns (group and bn are optional).');
        }
        $updated = $added = 0;
        $rv = app(Revalidator::class);
        while (($row = fgetcsv($fh)) !== false) {
            $key = trim((string) ($row[$ix['key']] ?? ''));
            if ($key === '' || mb_strlen($key) > 191) {
                continue;
            }
            $group = isset($ix['group']) ? (trim((string) ($row[$ix['group']] ?? '')) ?: 'ui') : 'ui';
            $val = ['en' => (string) ($row[$ix['en']] ?? ''), 'bn' => isset($ix['bn']) ? (string) ($row[$ix['bn']] ?? '') : ''];
            $t = Translation::where('group', $group)->where('key', $key)->first();
            if ($t) {
                if ($t->value != $val) {
                    $t->update(['value' => $val]);
                    $updated++;
                }
            } else {
                Translation::create(['group' => $group, 'key' => $key, 'value' => $val]);
                $added++;
            }
        }
        fclose($fh);
        $rv->add(['translations']);
        activity('admin')->causedBy($r->user())->event('updated')->withProperties(['resource' => 'translations', 'title' => "import: $updated updated, $added added"])->log('imported');

        return back()->with('success', app()->getLocale() === 'bn' ? "{$updated}টি হালনাগাদ, {$added}টি যোগ হয়েছে।" : "$updated updated, $added added.");
    }
}
