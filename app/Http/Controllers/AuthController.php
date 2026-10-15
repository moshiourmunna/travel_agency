<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function show() { return view('auth.login'); }

    public function login(Request $request)
    {
        $d = $request->validate(['login' => 'required|string', 'password' => 'required|string']);
        $field = str_contains($d['login'], '@') ? 'email' : 'phone';
        $login = $field === 'phone' ? preg_replace('/^(\+?88)/', '', preg_replace('/[\s-]/', '', $d['login'])) : strtolower($d['login']);
        if (! Auth::attempt([$field => $login, 'password' => $d['password'], 'status' => 'active'], $request->boolean('remember'))) {
            return back()->withErrors(['login' => t3('These credentials do not match our records.', 'তথ্য সঠিক নয়।', 'بيانات الدخول غير صحيحة.')])->onlyInput('login');
        }
        $request->session()->regenerate();
        $u = $request->user(); $u->update(['last_login_at' => now()]);

        return redirect()->intended(match (true) { $u->isAdmin() => route('admin.dashboard'), $u->isAgent() => route('agent.index'), default => route('dashboard') });
    }

    public function register(Request $request)
    {
        $d = $request->validate(['name' => 'required|string|max:100', 'phone' => ['required', 'regex:/^01[3-9]\d{8}$/', 'unique:users,phone'],
            'email' => 'nullable|email|unique:users,email', 'password' => ['required', 'confirmed', Password::min(8)]]);
        $u = User::create($d + ['role' => 'customer', 'locale' => app()->getLocale()]);
        $u->customerProfile();
        Auth::login($u);
        $request->session()->regenerate();

        return redirect()->intended(route('dashboard'));
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('home');
    }
}
