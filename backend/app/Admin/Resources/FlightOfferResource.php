<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\Airline;
use App\Models\Airport;
use App\Models\FlightOffer;

class FlightOfferResource extends Resource
{
    public string $model = FlightOffer::class;

    public string $slug = 'flight-offers';

    public array $label = ['en' => 'Flight inventory', 'bn' => 'ফ্লাইট ইনভেন্টরি'];

    public array $singular = ['en' => 'Flight', 'bn' => 'ফ্লাইট'];

    public string $icon = 'plane';

    public string $perm = 'catalog';

    public array $with = ['airline'];

    public array $search = ['origin', 'destination', 'flight_no'];

    public int $perPage = 50;

    public function columns(): array
    {
        return [
            Col::make('flight_no', 'Flight', 'ফ্লাইট')->sortable(),
            Col::make('airline', 'Airline', 'এয়ারলাইন')->value(fn ($m) => $m->airline?->name)->hideMobile(),
            Col::make('route', 'Route', 'রুট')->value(fn ($m) => $m->origin.' → '.$m->destination.($m->stops ? ' ('.$m->stops.' stop)' : '')),
            Col::make('times', 'Times', 'সময়')->value(fn ($m) => $m->dep_time.'–'.$m->arr_time)->hideMobile(),
            Col::money('fare', 'Fare', 'ভাড়া')->sortable(),
            Col::number('seats', 'Seats', 'আসন')->hideMobile(),
            Col::bool('is_active', 'Active', 'সক্রিয়'),
        ];
    }

    public function filters(): array
    {
        $ap = Airport::orderBy('iata')->pluck('iata', 'iata')->all();

        return [Filter::select('origin', 'From', 'থেকে', $ap), Filter::select('destination', 'To', 'গন্তব্য', $ap), Filter::select('airline_id', 'Airline', 'এয়ারলাইন', self::opts(Airline::class)), Filter::bool('is_active', 'Active', 'সক্রিয়')];
    }

    public function sections(): array
    {
        $ap = Airport::orderBy('iata')->get()->mapWithKeys(fn ($a) => [$a->iata => $a->iata.' — '.$a->tr('city')])->all();

        return [['title' => ['en' => 'Flight', 'bn' => 'ফ্লাইট'], 'fields' => [
            Field::select('airline_id', 'Airline', 'এয়ারলাইন', self::opts(Airline::class))->required()->half(),
            Field::text('flight_no', 'Flight number', 'ফ্লাইট নম্বর')->required()->half(),
            Field::select('origin', 'From', 'থেকে', $ap)->required()->half(),
            Field::select('destination', 'To', 'গন্তব্য', $ap)->required()->half(),
            Field::text('dep_time', 'Departs (HH:MM)', 'ছাড়ে')->required()->rule('regex:/^([01]\d|2[0-3]):[0-5]\d$/')->quarter(),
            Field::text('arr_time', 'Arrives (HH:MM)', 'পৌঁছায়')->required()->rule('regex:/^([01]\d|2[0-3]):[0-5]\d$/')->quarter(),
            Field::number('duration_min', 'Duration (min)', 'সময়কাল (মিনিট)')->required()->rule('integer')->quarter(),
            Field::number('stops', 'Stops', 'স্টপ')->required()->rule('integer')->rule('between:0,3')->default(0)->quarter(),
            Field::list('via', 'Via (airport codes)', 'যাত্রাবিরতি (এয়ারপোর্ট কোড)')->half(),
            Field::select('cabin', 'Cabin', 'কেবিন', ['economy' => 'Economy', 'premium' => 'Premium economy', 'business' => 'Business', 'first' => 'First'])->required()->default('economy')->half(),
            Field::money('fare', 'Base fare (adult)', 'মূল ভাড়া (প্রাপ্তবয়স্ক)')->required()->third(),
            Field::text('baggage', 'Baggage', 'ব্যাগেজ')->third(),
            Field::number('seats', 'Seats left', 'বাকি আসন')->required()->rule('integer')->third(),
            Field::switch('refundable', 'Refundable', 'ফেরতযোগ্য')->half(),
            Field::switch('is_active', 'Bookable', 'বুকিংযোগ্য')->default(true)->half(),
        ]]];
    }
}
