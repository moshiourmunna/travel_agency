<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Collects Next.js cache tags touched during an admin request and purges them in one call at the end
 * (POST {FRONTEND_URL}/api/revalidate {tags, expire: 0}). expire:0 makes the next visitor get fresh HTML
 * immediately instead of one stale-while-revalidate hit. Registered as a singleton.
 */
final class Revalidator
{
    public const LAST = 'musafir.revalidate.last';

    /** @var array<string, true> */
    private array $tags = [];

    private bool $collecting = false;

    public function collect(bool $on = true): void
    {
        $this->collecting = $on;
    }

    public function collecting(): bool
    {
        return $this->collecting;
    }

    public function add(array $tags): void
    {
        if (! $this->collecting) {
            return;
        }
        foreach ($tags as $t) {
            if (is_string($t) && $t !== '' && count($this->tags) < 200) {
                $this->tags[$t] = true;
            }
        }
    }

    /** @return list<string> */
    public function pending(): array
    {
        return array_keys($this->tags);
    }

    /** @return array{ok: bool, tags: list<string>, error?: string}|null */
    public function flush(): ?array
    {
        $tags = $this->pending();
        $this->tags = [];
        if (! $tags) {
            return null;
        }

        return $this->send(isset(array_flip($tags)['all']) ? ['all'] : $tags);
    }

    /** @return array{ok: bool, tags: list<string>, error?: string} */
    public function send(array $tags): array
    {
        $result = ['ok' => true, 'tags' => array_values($tags), 'at' => now()->toIso8601String()];
        if (! config('musafir.revalidate_enabled')) {
            return $result + ['skipped' => true];
        }
        try {
            $res = Http::timeout(8)->acceptJson()
                ->withHeaders(['X-Revalidate-Secret' => (string) config('musafir.revalidate_secret')])
                ->post(config('musafir.frontend_url').'/api/revalidate', ['tags' => array_slice(array_values($tags), 0, 50), 'expire' => 0]);
            if (! $res->successful()) {
                $result = ['ok' => false, 'error' => 'HTTP '.$res->status()] + $result;
            }
        } catch (Throwable $e) {
            $result = ['ok' => false, 'error' => mb_substr($e->getMessage(), 0, 200)] + $result;
        }
        $result['ok'] = $result['ok'] && empty($result['error']);
        if (! $result['ok']) {
            Log::warning('Frontend revalidation failed', $result);
        }
        Cache::put(self::LAST, $result, now()->addDays(7));

        return $result;
    }
}
