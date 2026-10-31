<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\NotificationTemplate;
use Illuminate\Database\Eloquent\Model;

class NotificationTemplateResource extends Resource
{
    public string $model = NotificationTemplate::class;

    public string $slug = 'notification-templates';

    public array $label = ['en' => 'Email & SMS templates', 'bn' => 'ইমেইল ও এসএমএস টেমপ্লেট'];

    public array $singular = ['en' => 'Template', 'bn' => 'টেমপ্লেট'];

    public string $icon = 'mail';

    public string $perm = 'settings';

    public array $abilities = ['view' => 'notifications.manage', 'manage' => 'notifications.manage'];

    public array $search = ['key', 'name', 'subject'];

    public bool $creatable = false;

    public bool $deletable = false;

    public string $defaultSort = 'key';

    public function columns(): array
    {
        return [
            Col::tr('name', 'Template', 'টেমপ্লেট')->sortable('key'),
            Col::make('key', 'Event', 'ইভেন্ট')->hideMobile(),
            Col::badge('channel', 'Channel', 'চ্যানেল', ['email' => ['Email', 'ইমেইল', 'blue'], 'sms' => ['SMS', 'এসএমএস', 'violet'], 'push' => ['Push', 'পুশ', 'gold'], 'database' => ['In-app', 'অ্যাপে', 'gray']]),
            Col::bool('is_active', 'On', 'চালু'),
            Col::datetime('updated_at', 'Updated', 'আপডেট')->hideMobile(),
        ];
    }

    public function filters(): array
    {
        return [Filter::select('channel', 'Channel', 'চ্যানেল', ['email' => 'Email', 'sms' => 'SMS', 'push' => 'Push', 'database' => 'In-app'])];
    }

    public function sections(): array
    {
        return [
            ['title' => ['en' => 'Message', 'bn' => 'বার্তা'], 'fields' => [
                Field::tr('name', 'Name', 'নাম')->required(),
                Field::tr('subject', 'Subject / title', 'বিষয় / শিরোনাম'),
                Field::trtext('body', 'Message', 'বার্তা')->required()->meta(['variablesFrom' => 'variables'])
                    ->help('Insert values with {{name}}, {{ref}} … — see the list of available variables.', '{{name}}, {{ref}} … দিয়ে মান বসান — নিচে ভেরিয়েবলের তালিকা দেখুন।'),
            ]],
            ['title' => ['en' => 'Delivery', 'bn' => 'পাঠানো'], 'aside' => true, 'fields' => [
                Field::text('key', 'Event', 'ইভেন্ট')->readonly(),
                Field::text('channel', 'Channel', 'চ্যানেল')->readonly(),
                Field::list('variables', 'Available variables', 'উপলব্ধ ভেরিয়েবল')->readonly(),
                Field::switch('is_active', 'Send this message', 'এই বার্তা পাঠান')->default(true),
            ]],
        ];
    }

    public function beforeSave(Model $m, array $data, bool $creating): void
    {
        // SMS bodies are short: warn by rejecting overly long ones (gateway splits above 3 segments)
        if ($m->channel === 'sms') {
            foreach ((array) $m->getTranslations('body') as $loc => $text) {
                if (mb_strlen((string) $text) > 480) {
                    \App\Admin\Action::fail(($loc === 'bn' ? 'Bangla' : 'English').' SMS text is too long (max 480 characters).');
                }
            }
        }
    }
}
