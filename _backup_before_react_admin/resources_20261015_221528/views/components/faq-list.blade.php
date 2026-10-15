@props(['faqs'])
@foreach($faqs as $i => $f)<details class="faq" data-cat-item="{{ $f->category }}" @if($i === 0) open @endif><summary>{{ $f->question }}</summary><p>{{ $f->answer }}</p></details>@endforeach
