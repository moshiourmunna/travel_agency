<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Resource;
use App\Admin\Resources\Concerns\Common as C;
use App\Models\GalleryAlbum;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class GalleryAlbumResource extends Resource
{
    public string $model = GalleryAlbum::class;

    public string $slug = 'gallery';

    public array $label = ['en' => 'Photo gallery', 'bn' => 'ফটো গ্যালারি'];

    public array $singular = ['en' => 'Album', 'bn' => 'অ্যালবাম'];

    public string $icon = 'images';

    public string $perm = 'content';

    public string $defaultSort = 'sort';

    public ?string $reorder = 'sort';

    public function query(): Builder
    {
        return GalleryAlbum::query()->withCount('items');
    }

    public function columns(): array
    {
        return [
            Col::tr('title', 'Album', 'অ্যালবাম')->sortable(),
            Col::make('slug', 'Slug', 'স্লাগ')->hideMobile(),
            Col::number('items_count', 'Photos', 'ছবি'),
            Col::bool('is_active', 'Visible', 'দৃশ্যমান'),
        ];
    }

    public function sections(): array
    {
        return [
            ['title' => ['en' => 'Album', 'bn' => 'অ্যালবাম'], 'fields' => [
                Field::tr('title', 'Title', 'শিরোনাম')->required(),
                Field::slug('slug', 'title')->half(),
                Field::number('sort', 'Order', 'ক্রম')->rule('integer')->default(0)->quarter(),
                Field::switch('is_active', 'Visible', 'দৃশ্যমান')->default(true)->quarter(),
            ]],
            ['title' => ['en' => 'Photos (drag to reorder)', 'bn' => 'ছবি (টেনে ক্রম বদলান)'], 'fields' => [
                Field::children('items', 'Photos', 'ছবি', [
                    Field::image('media_asset_id', 'Photo', 'ছবি')->required()->span(4),
                    Field::tr('caption', 'Caption', 'ক্যাপশন')->span(8),
                ], 'sort')->meta(['grid' => true]),
            ]],
        ];
    }

    public function publicUrl(Model $m): ?string
    {
        return C::site('/gallery');
    }
}
