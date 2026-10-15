<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Faq;
use App\Models\GalleryItem;
use App\Models\Inquiry;
use App\Models\Package;
use App\Models\Post;
use App\Models\Review;
use App\Models\TeamMember;
use App\Support\SiteConfig;
use Illuminate\Http\Request;

class PageController extends Controller
{
    public function home()
    {
        return view('pages.home', [
            'packages' => Package::visible()->whereIn('type', ['hajj', 'umrah'])->where('is_featured', true)->with('prices')->orderBy('type')->orderBy('price_from')->take(6)->get(),
            'reviews' => Review::where('status', 'approved')->latest('id')->take(3)->get(),
            'guides' => TeamMember::where('group', 'guide')->where('is_active', true)->orderBy('sort')->get(),
            'faqs' => Faq::where('is_active', true)->orderBy('sort')->take(4)->get(),
            'posts' => module_on('blog') ? Post::published()->latest('published_at')->take(3)->get() : collect(),
            'gallery' => GalleryItem::where('type', 'image')->orderBy('sort')->take(5)->get(),
        ]);
    }

    public function lang(Request $request, string $code)
    {
        abort_unless(in_array($code, array_column(SiteConfig::enabledLanguages(), 'code'), true), 404);
        $request->session()->put('locale', $code);
        $request->user()?->update(['locale' => $code]);

        return back(fallback: route('home'));
    }

    public function about()
    {
        return view('pages.about', ['team' => TeamMember::where('group', 'leader')->orderBy('sort')->get()]);
    }

    public function guide() { return view('pages.guide'); }

    public function faq()
    {
        return view('pages.faq', ['faqs' => Faq::where('is_active', true)->orderBy('sort')->get()]);
    }

    public function contact()
    {
        return view('pages.contact', ['branches' => Branch::orderBy('sort')->get()]);
    }

    public function contactStore(Request $request)
    {
        $d = $request->validate(['name' => 'required|string|max:100', 'phone' => ['required', 'regex:/^(\+?88)?01[3-9]\d{8}$/'], 'email' => 'nullable|email',
            'interest' => 'nullable|string|max:60', 'message' => 'required|string|max:2000', 'package' => 'nullable|string|max:120']);
        Inquiry::create(['type' => $d['package'] ?? null ? 'package' : 'contact', 'name' => $d['name'], 'phone' => $d['phone'], 'email' => $d['email'] ?? null,
            'payload' => ['interest' => $d['interest'] ?? null, 'message' => $d['message'], 'package' => $d['package'] ?? null]]);

        return back()->with('ok', t3('Thank you! Our consultant will call you shortly.', 'ধন্যবাদ! আমাদের পরামর্শক শীঘ্রই আপনাকে কল করবেন।', 'شكراً! سيتصل بك مستشارنا قريباً.'));
    }

    public function blog(Request $request)
    {
        $q = Post::published()->latest('published_at');
        if ($s = $request->query('q')) {
            $q->where(fn ($w) => $w->where('title', 'like', "%{$s}%")->orWhere('body', 'like', "%{$s}%"));
        }
        if ($c = $request->query('category')) {
            $q->where('category', $c);
        }

        return view('pages.blog', ['posts' => $q->paginate(8)->withQueryString(),
            'categories' => Post::published()->selectRaw('category, count(*) as n')->groupBy('category')->pluck('n', 'category')]);
    }

    public function post(Post $post)
    {
        abort_unless($post->published_at && $post->published_at->isPast(), 404);

        return view('pages.post', ['post' => $post, 'more' => Post::published()->whereKeyNot($post->id)->latest('published_at')->take(3)->get()]);
    }

    public function gallery()
    {
        return view('pages.gallery', ['items' => GalleryItem::orderBy('sort')->get()]);
    }
}
