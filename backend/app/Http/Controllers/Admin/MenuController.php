<?php

namespace App\Http\Controllers\Admin;

use App\Admin\Field;
use App\Http\Controllers\Controller;
use App\Models\Menu;
use App\Models\MenuItem;
use App\Support\Revalidator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/** Header, mega menu, mobile drawer and footer link lists (two levels). */
class MenuController extends Controller
{
    private function guard(Request $r): void
    {
        abort_unless($r->user()->can('menus.manage'), 403);
    }

    private static function item(MenuItem $i, $byParent): array
    {
        return [
            'id' => $i->id, 'label' => Field::trValue($i, 'label'), 'badge' => Field::trValue($i, 'badge'), 'description' => Field::trValue($i, 'description'),
            'url' => $i->url, 'icon' => $i->icon, 'is_active' => (bool) $i->is_active, 'new_tab' => (bool) $i->new_tab, 'meta' => $i->meta,
            'children' => ($byParent[$i->id] ?? collect())->map(fn ($c) => self::item($c, $byParent))->values()->all(),
        ];
    }

    public function index(Request $r): Response
    {
        $this->guard($r);
        $menus = Menu::orderBy('id')->get();
        $items = MenuItem::orderBy('sort')->orderBy('id')->get();
        $byParent = $items->whereNotNull('parent_id')->groupBy('parent_id');

        return Inertia::render('Menus', [
            'menus' => $menus->map(fn ($m) => [
                'id' => $m->id, 'location' => $m->location, 'name' => Field::trValue($m, 'name'),
                'items' => $items->where('menu_id', $m->id)->whereNull('parent_id')->map(fn ($i) => self::item($i, $byParent))->values(),
            ]),
            'active' => (int) $r->query('menu', $menus->first()?->id),
            'pages' => self::linkTargets(),
        ]);
    }

    /** Suggestions for the link field: fixed pages and published items. */
    public static function linkTargets(): array
    {
        $out = [];
        foreach (['/', '/tours', '/holidays', '/cruises', '/activities', '/flights', '/hotels', '/visa', '/destinations', '/offers', '/group-tours', '/custom-tour', '/insurance', '/gift-cards', '/compare', '/trip-planner',
            '/blog', '/gallery', '/reviews', '/about', '/team', '/careers', '/contact', '/faq', '/terms', '/privacy', '/refund-policy', '/sitemap', '/wishlist'] as $p) {
            $out[] = ['value' => $p, 'label' => $p];
        }
        foreach ([\App\Models\Tour::class => '/tours/', \App\Models\Destination::class => '/destinations/', \App\Models\Theme::class => '/holidays/', \App\Models\Cruise::class => '/cruises/',
            \App\Models\Activity::class => '/activities/', \App\Models\Hotel::class => '/hotels/', \App\Models\VisaProduct::class => '/visa/'] as $class => $prefix) {
            $col = in_array('title', (new $class)->translatable ?? [], true) ? 'title' : 'name';
            foreach ($class::published()->orderBy('id')->get(['id', 'slug', $col]) as $m) {
                $out[] = ['value' => $prefix.$m->slug, 'label' => $prefix.$m->slug.' — '.$m->tr($col)];
            }
        }

        return $out;
    }

    public function update(Request $r, Menu $menu): RedirectResponse
    {
        $this->guard($r);
        $r->validate([
            'name' => ['array'], 'name.en' => ['required', 'string', 'max:120'], 'name.bn' => ['nullable', 'string', 'max:120'],
            'items' => ['present', 'array', 'max:80'],
            'items.*.label.en' => ['required', 'string', 'max:120'], 'items.*.label.bn' => ['nullable', 'string', 'max:120'],
            'items.*.url' => ['nullable', 'string', 'max:300', 'regex:/^(\/|https?:\/\/|mailto:|tel:)/'],
            'items.*.icon' => ['nullable', 'string', 'max:60'],
            'items.*.children' => ['nullable', 'array', 'max:40'],
            'items.*.children.*.label.en' => ['required', 'string', 'max:120'], 'items.*.children.*.label.bn' => ['nullable', 'string', 'max:120'],
            'items.*.children.*.url' => ['nullable', 'string', 'max:300', 'regex:/^(\/|https?:\/\/|mailto:|tel:)/'],
        ], [], ['items.*.label.en' => 'label (English)', 'items.*.children.*.label.en' => 'label (English)', 'items.*.url' => 'link', 'items.*.children.*.url' => 'link']);

        DB::transaction(function () use ($r, $menu) {
            $before = MenuItem::where('menu_id', $menu->id)->count();
            $menu->setTranslations('name', array_filter(Field::cleanTr($r->input('name'))));
            $menu->save();
            $keep = [];
            $save = function (array $row, ?int $parent, int $sort) use ($menu, &$keep) {
                $i = ! empty($row['id']) ? MenuItem::where('menu_id', $menu->id)->find($row['id']) : null;
                $i ??= new MenuItem(['menu_id' => $menu->id]);
                $i->parent_id = $parent;
                $i->sort = $sort;
                foreach (['label', 'badge', 'description'] as $k) {
                    $v = array_filter(Field::cleanTr($row[$k] ?? []), fn ($s) => $s !== '');
                    $v ? $i->setTranslations($k, $v) : $i->setAttribute($k, null);
                }
                $i->url = ($row['url'] ?? null) ?: null;
                $i->icon = ($row['icon'] ?? null) ?: null;
                $i->is_active = (bool) ($row['is_active'] ?? true);
                $i->new_tab = (bool) ($row['new_tab'] ?? false);
                $i->meta = is_array($row['meta'] ?? null) && $row['meta'] ? $row['meta'] : null;
                $i->save();
                $keep[] = $i->id;

                return $i;
            };
            foreach (array_values((array) $r->input('items', [])) as $n => $row) {
                $parent = $save($row, null, $n);
                foreach (array_values((array) ($row['children'] ?? [])) as $m => $child) {
                    $save($child, $parent->id, $m);
                }
            }
            MenuItem::where('menu_id', $menu->id)->whereNotIn('id', $keep ?: [0])->orderByDesc('parent_id')->get()->each->delete();
            activity('admin')->causedBy(auth()->user())->performedOn($menu)->event('updated')
                ->withProperties(['resource' => 'menus', 'title' => $menu->location, 'old' => ['items' => $before], 'attributes' => ['items' => count($keep)]])->log('updated');
        });
        app(Revalidator::class)->add(['menus', 'site']);

        return back()->with('success', __('admin.saved', ['name' => $menu->tr('name')]));
    }
}
