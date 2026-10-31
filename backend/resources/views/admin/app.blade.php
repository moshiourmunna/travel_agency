<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}" class="scroll-smooth">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="csrf-token" content="{{ csrf_token() }}">
<link rel="icon" href="/brand/icon.svg" type="image/svg+xml">
<script nonce="{{ Vite::cspNonce() }}">try{var t=localStorage.getItem('musafir-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}</script>
@viteReactRefresh
@vite(['resources/js/admin/app.tsx'])
<x-inertia::head><title>Musafir Admin</title></x-inertia::head>
</head>
<body>
<x-inertia::app />
</body>
</html>
