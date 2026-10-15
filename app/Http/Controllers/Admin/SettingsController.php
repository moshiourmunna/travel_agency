<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Language;
use App\Models\Licence;
use App\Models\Module;
use App\Models\Setting;
use App\Support\SiteConfig;
use Illuminate\Http\Request;
use App\Support\AdminUi;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class SettingsController extends Controller
{
    public function edit()
    {
        $s = SiteConfig::load()['settings'];
        $addr = Setting::where('key', 'address')->first()?->value ?? [];

        return Inertia::render('admin/settings', [
            'languages' => Language::orderBy('sort')->get()->map(fn ($l) => ['code' => $l->code, 'native' => $l->native_name, 'dir' => $l->dir, 'enabled' => (bool) $l->enabled, 'is_default' => (bool) $l->is_default])->values(),
            'modules' => Module::orderBy('sort')->get()->map(fn ($m) => ['key' => $m->key, 'label' => $m->label, 'enabled' => (bool) $m->enabled])->values(),
            'licences' => Licence::orderBy('sort')->get()->map(fn ($l) => ['type' => $l->type, 'label' => $l->label, 'number' => $l->number ?? '', 'valid_until' => $l->valid_until?->format('Y-m-d') ?? '', 'show' => (bool) $l->show_on_site])->values(),
            'settings' => collect(['phone', 'whatsapp', 'email', 'hours', 'hajj_date', 'bank_details', 'qurbani_price', 'insurance_price', 'early_bird_discount', 'hold_hours'])
                ->mapWithKeys(fn ($k) => [$k => is_array($s[$k] ?? '') ? '' : (string) ($s[$k] ?? '')])->all() + ['address_en' => $addr['en'] ?? '', 'address_bn' => $addr['bn'] ?? '', 'address_ar' => $addr['ar'] ?? ''],
        ]);
    }

    public function update(Request $request)
    {
        $d = $request->validate([
            'languages' => 'array', 'languages.*' => 'in:0,1', 'default_language' => 'required|exists:languages,code',
            'modules' => 'array', 'modules.*' => 'in:0,1',
            'licences' => 'array', 'licences.*.number' => 'nullable|string|max:60', 'licences.*.show' => 'nullable|in:0,1', 'licences.*.valid_until' => 'nullable|date',
            's.phone' => 'required|string|max:40', 's.whatsapp' => 'nullable|string|max:20', 's.email' => 'required|email', 's.hours' => 'nullable|string|max:60',
            's.address_en' => 'required|string|max:255', 's.address_bn' => 'nullable|string|max:255', 's.address_ar' => 'nullable|string|max:255',
            's.hajj_date' => 'required|date', 's.bank_details' => 'nullable|string|max:300',
            's.qurbani_price' => 'required|integer|min:0', 's.insurance_price' => 'required|integer|min:0', 's.early_bird_discount' => 'required|integer|min:0', 's.hold_hours' => 'required|integer|min:1|max:720',
        ]);
        $before = SiteConfig::load();
        DB::transaction(function () use ($d, $request) {
            foreach (Language::all() as $l) {
                $isDefault = $l->code === $d['default_language'];
                // the default language can never be switched off
                $l->update(['enabled' => $isDefault || ($d['languages'][$l->code] ?? '0') === '1', 'is_default' => $isDefault]);
            }
            foreach (Module::all() as $m) {
                $m->update(['enabled' => ($d['modules'][$m->key] ?? '0') === '1']);
            }
            foreach (Licence::all() as $l) {
                $in = $d['licences'][$l->type] ?? [];
                $l->update(['number' => trim((string) ($in['number'] ?? '')) ?: null, 'show_on_site' => ($in['show'] ?? '0') === '1', 'valid_until' => $in['valid_until'] ?? $l->valid_until]);
            }
            $s = $d['s'];
            $s['address'] = array_filter(['en' => $s['address_en'], 'bn' => $s['address_bn'] ?? null, 'ar' => $s['address_ar'] ?? null]);
            unset($s['address_en'], $s['address_bn'], $s['address_ar']);
            foreach ($s as $k => $v) {
                Setting::updateOrCreate(['key' => $k], ['value' => is_numeric($v) && in_array($k, ['qurbani_price', 'insurance_price', 'early_bird_discount', 'hold_hours'], true) ? (int) $v : $v]);
            }
        });
        SiteConfig::flush();
        AuditLog::create(['user_id' => $request->user()->id, 'action' => 'settings.update', 'auditable_type' => 'settings', 'before' => array_diff_key($before, ['settings' => 1]),
            'after' => array_diff_key(SiteConfig::load(), ['settings' => 1]), 'ip' => $request->ip(), 'user_agent' => substr((string) $request->userAgent(), 0, 250)]);

        return back()->with('ok', 'Settings saved. The website updates immediately.');
    }
}
