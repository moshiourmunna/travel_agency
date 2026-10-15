<?php

namespace App\Http\Middleware;

use App\Support\AdminResources;
use App\Support\SiteConfig;
use Illuminate\Http\Request;
use Inertia\Middleware;

/** Inertia bridge for the React admin panel (/admin only – public site and portals stay Blade). */
class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'admin.app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $user = $request->user();
        $locale = app()->getLocale();
        $langs = SiteConfig::enabledLanguages();
        $dir = collect($langs)->firstWhere('code', $locale)['dir'] ?? ($locale === 'ar' ? 'rtl' : 'ltr');

        return array_merge(parent::share($request), [
            'auth' => fn () => $user ? ['user' => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'initials' => $user->initials(), 'role' => $user->role, 'isOwner' => $user->isOwner()]] : ['user' => null],
            'flash' => fn () => ['ok' => $request->session()->get('ok'), 'err' => $request->session()->get('err')],
            'locale' => $locale,
            'dir' => $dir,
            'languages' => collect($langs)->map(fn ($l) => ['code' => $l['code'], 'label' => $l['label'] ?? strtoupper($l['code']), 'native' => $l['native_name'] ?? $l['code'], 'dir' => $l['dir'] ?? 'ltr'])->values(),
            'modules' => fn () => SiteConfig::load()['modules'],
            't' => fn () => self::dictionary($locale),
            'nav' => fn () => ['resources' => collect(AdminResources::all())->map(fn ($r, $k) => ['key' => $k, 'label' => $r['label']])->values()],
            'site' => ['name' => SiteConfig::setting('site_name', config('app.name'))],
        ]);
    }

    public static function dictionary(string $locale): array
    {
        if ($locale === 'en') return [];
        static $cache = [];
        $file = lang_path($locale.'.json');

        return $cache[$locale] ??= (is_file($file) ? (json_decode((string) file_get_contents($file), true) ?: []) : []);
    }
}
