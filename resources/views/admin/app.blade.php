<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}" dir="{{ collect(\App\Support\SiteConfig::enabledLanguages())->firstWhere('code', app()->getLocale())['dir'] ?? 'ltr' }}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="csrf-token" content="{{ csrf_token() }}">
<link rel="icon" href="{{ asset('assets/icon.svg') }}">
<script>try{var t=localStorage.getItem('adm-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}</script>
@vite(['resources/js/admin.tsx'])
<x-inertia::head><title>{{ __('Admin') }} | {{ site('site_name') }}</title></x-inertia::head>
</head>
<body class="antialiased">
<x-inertia::app />
</body>
</html>
