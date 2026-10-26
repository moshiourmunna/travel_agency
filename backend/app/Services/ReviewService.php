<?php

namespace App\Services;

use App\Models\MilesTransaction;
use App\Models\Review;
use App\Models\User;
use App\Support\Settings;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Review moderation side effects: publishing awards the author's Miles (once per review)
 * and folds the rating into the product's rating / reviews_count (incrementally, so imported
 * aggregate numbers from before the site launched are kept rather than recomputed from scratch).
 */
class ReviewService
{
    public function setStatus(Review $review, string $status): Review
    {
        return DB::transaction(function () use ($review, $status) {
            $was = $review->status === 'published';
            $review->update(['status' => $status]);
            $now = $status === 'published';
            if ($now) {
                $this->award($review);
            }
            if ($was !== $now) {
                $this->fold($review, $now ? 1 : -1);
            }

            return $review;
        });
    }

    public function award(Review $review): void
    {
        $miles = (int) Settings::get('commerce.review_miles', 250);
        if (! $review->user_id || $miles <= 0) {
            return;
        }
        $done = MilesTransaction::where('source_type', Review::class)->where('source_id', $review->id)->exists();
        if ($done) {
            return;
        }
        MilesTransaction::create(['user_id' => $review->user_id, 'miles' => $miles, 'description' => ['en' => 'Review published', 'bn' => 'রিভিউ প্রকাশিত'],
            'source_type' => Review::class, 'source_id' => $review->id]);
        User::whereKey($review->user_id)->increment('miles', $miles);
    }

    /** Add (+1) or remove (-1) one review's rating from the product aggregate. */
    public function fold(Review $review, int $dir): void
    {
        $class = $review->reviewable_type;
        if (! $class || ! class_exists($class) || ! $review->reviewable_id) {
            return;
        }
        $table = (new $class)->getTable();
        if (! Schema::hasColumn($table, 'rating') || ! Schema::hasColumn($table, 'reviews_count')) {
            return;
        }
        $row = DB::table($table)->where('id', $review->reviewable_id)->lockForUpdate()->first(['rating', 'reviews_count']);
        if (! $row) {
            return;
        }
        $n = (int) $row->reviews_count;
        $sum = (float) $row->rating * $n + $dir * (int) $review->rating;
        $n = max(0, $n + $dir);
        DB::table($table)->where('id', $review->reviewable_id)->update(['reviews_count' => $n, 'rating' => $n ? max(0, min(5, round($sum / $n, 1))) : 0]);
    }
}
