<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\NewsletterSubscriber;

class NewsletterResource extends Resource
{
    public string $model = NewsletterSubscriber::class;

    public string $slug = 'newsletter';

    public array $label = ['en' => 'Newsletter subscribers', 'bn' => 'নিউজলেটার গ্রাহক'];

    public array $singular = ['en' => 'Subscriber', 'bn' => 'গ্রাহক'];

    public string $icon = 'mail';

    public string $perm = 'customers';

    public array $search = ['email'];

    public function columns(): array
    {
        return [
            Col::make('email', 'Email', 'ইমেইল')->sortable(),
            Col::make('locale', 'Language', 'ভাষা'),
            Col::badge('status', 'Status', 'অবস্থা', ['subscribed' => ['Subscribed', 'সাবস্ক্রাইবড', 'green'], 'pending' => ['Pending', 'অপেক্ষমাণ', 'accent'], 'unsubscribed' => ['Unsubscribed', 'আনসাবস্ক্রাইবড', 'gray']]),
            Col::datetime('created_at', 'Joined', 'যোগদান')->sortable(),
        ];
    }

    public function sections(): array
    {
        return [['title' => ['en' => 'Subscriber', 'bn' => 'গ্রাহক'], 'fields' => [
            Field::email('email', 'Email', 'ইমেইল')->required()->meta(['unique' => true]),
            Field::select('locale', 'Language', 'ভাষা', ['en' => 'English', 'bn' => 'বাংলা'])->required()->default('en')->half(),
            Field::select('status', 'Status', 'অবস্থা', ['subscribed' => 'Subscribed', 'pending' => 'Pending', 'unsubscribed' => 'Unsubscribed'])->required()->default('subscribed')->half(),
        ]]];
    }

    public function filters(): array
    {
        return [Filter::select('status', 'Status', 'অবস্থা', ['subscribed' => 'Subscribed', 'pending' => 'Pending', 'unsubscribed' => 'Unsubscribed'])];
    }
}
