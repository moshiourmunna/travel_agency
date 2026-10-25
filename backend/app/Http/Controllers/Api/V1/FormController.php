<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Inquiry;
use App\Models\JobApplication;
use App\Models\JobPost;
use App\Models\Lead;
use App\Models\NewsletterSubscriber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Public forms: contact / custom tour / group tour / callback / visa & insurance enquiries, newsletter. Every enquiry also opens a CRM lead. */
class FormController extends Controller
{
    public const TYPES = ['contact', 'custom-tour', 'group-tour', 'callback', 'visa', 'insurance', 'quote', 'career', 'b2b'];

    private const SOURCES = [
        'custom-tour' => [['en' => 'Custom tour form', 'bn' => 'কাস্টম ট্যুর ফর্ম'], 'custom-tour'],
        'group-tour' => [['en' => 'Group tour form', 'bn' => 'গ্রুপ ট্যুর ফর্ম'], 'group-tour'],
    ];

    public function inquiry(Request $request): JsonResponse
    {
        if ($request->filled('website')) { // honeypot: pretend success, store nothing
            return response()->json(['data' => ['reference' => 'MSF-INQ-'.random_int(10000, 99999)]], 201);
        }
        $v = $request->validate([
            'type' => ['required', 'in:'.implode(',', self::TYPES)],
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'email' => ['nullable', 'required_without:phone', 'email:rfc', 'max:190'],
            'phone' => ['nullable', 'required_without:email', 'string', 'regex:/^\+?[0-9 \-]{8,20}$/'],
            'subject' => ['nullable', 'string', 'max:190'],
            'message' => ['nullable', 'string', 'max:5000'],
            'destination' => ['nullable', 'string', 'max:120'], 'travel_date' => ['nullable', 'date'], 'nights' => ['nullable', 'integer', 'min:1', 'max:60'],
            'adults' => ['nullable', 'integer', 'min:1', 'max:500'], 'children' => ['nullable', 'integer', 'min:0', 'max:200'],
            'budget' => ['nullable', 'numeric', 'min:0', 'max:100000000'], 'interests' => ['nullable', 'array', 'max:20'], 'interests.*' => ['string', 'max:60'],
            'organisation' => ['nullable', 'string', 'max:190'], 'product' => ['nullable', 'string', 'max:190'], 'preferred_time' => ['nullable', 'string', 'max:60'],
            'travel_month' => ['nullable', 'string', 'max:60'], 'page' => ['nullable', 'string', 'max:255'],
            'details' => ['nullable', 'array', 'max:30'], 'details.*' => ['nullable', 'string', 'max:500'],
            'consent' => ['accepted'],
        ]);
        [$label, $key] = self::SOURCES[$v['type']] ?? [['en' => 'Website enquiry', 'bn' => 'ওয়েবসাইট অনুসন্ধান'], 'website-enquiry'];
        $value = isset($v['budget']) ? (float) $v['budget'] : null;
        $inq = self::store($v['type'], collect($v)->except(['type', 'consent'])->all(), $request, $label, $key, $value);

        return response()->json(['data' => ['reference' => self::reference($inq)]], 201);
    }

    /** Persist an inquiry and its CRM lead atomically. */
    public static function store(string $type, array $payload, Request $request, array $sourceLabel, string $sourceKey, ?float $value = null): Inquiry
    {
        return DB::transaction(function () use ($type, $payload, $request, $sourceLabel, $sourceKey, $value) {
            $need = $payload['message'] ?? $payload['subject'] ?? $payload['destination'] ?? ucfirst(str_replace('-', ' ', $type));
            $lead = Lead::create([
                'code' => 'LD-'.max(3301, 1 + (int) Lead::withTrashed()->lockForUpdate()->selectRaw('MAX(CAST(SUBSTRING(code, 4) AS UNSIGNED)) AS n')->value('n')),
                'name' => $payload['name'], 'phone' => $payload['phone'] ?? null, 'email' => $payload['email'] ?? null,
                'need' => ['en' => mb_substr($need, 0, 180), 'bn' => mb_substr($need, 0, 180)],
                'source' => $sourceLabel, 'source_key' => $sourceKey, 'value' => $value ?? 0, 'stage' => 'new',
                'meta' => ['type' => $type],
            ]);

            return Inquiry::create([
                'type' => $type, 'name' => $payload['name'], 'email' => $payload['email'] ?? null, 'phone' => $payload['phone'] ?? null,
                'payload' => collect($payload)->except(['name', 'email', 'phone'])->all(), 'status' => 'new',
                'locale' => app()->getLocale(), 'ip' => $request->ip(), 'lead_id' => $lead->id,
            ]);
        });
    }

    public static function reference(Inquiry $i): string
    {
        return 'MSF-INQ-'.str_pad((string) $i->id, 5, '0', STR_PAD_LEFT);
    }

    public function newsletter(Request $request): JsonResponse
    {
        $v = $request->validate(['email' => ['required', 'email:rfc', 'max:190']]);
        $sub = NewsletterSubscriber::firstOrNew(['email' => mb_strtolower($v['email'])]);
        $already = $sub->exists && $sub->status === 'subscribed';
        $sub->fill(['locale' => app()->getLocale(), 'status' => 'subscribed', 'confirmed_at' => $sub->confirmed_at ?? now()])->save();

        return response()->json(['data' => ['status' => $already ? 'already_subscribed' : 'subscribed']], $already ? 200 : 201);
    }

    /** Job application (multipart): the CV is kept on the private disk, never publicly served. */
    public function careerApply(Request $request, string $slug): JsonResponse
    {
        $job = JobPost::where('status', 'published')->where('slug', $slug)->firstOrFail();
        if ($request->filled('website')) {
            return response()->json(['data' => ['reference' => 'MSF-JOB-'.random_int(10000, 99999)]], 201);
        }
        $v = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:120'], 'email' => ['required', 'email:rfc', 'max:190'],
            'phone' => ['nullable', 'string', 'regex:/^\+?[0-9 \-]{8,20}$/'], 'cover_letter' => ['nullable', 'string', 'max:5000'],
            'cv' => ['nullable', 'file', 'mimes:pdf', 'mimetypes:application/pdf', 'max:5120'],
        ]);
        $path = $request->file('cv')?->store('cvs/'.now()->format('Y/m'), 'local');
        $app = JobApplication::create(['job_post_id' => $job->id, 'name' => $v['name'], 'email' => mb_strtolower($v['email']), 'phone' => $v['phone'] ?? null,
            'cover_letter' => $v['cover_letter'] ?? null, 'cv_path' => $path, 'status' => 'new']);

        return response()->json(['data' => ['reference' => 'MSF-JOB-'.str_pad((string) $app->id, 5, '0', STR_PAD_LEFT)]], 201);
    }
}
