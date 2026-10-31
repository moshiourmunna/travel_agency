<?php

return [
    // Page components live in resources/js/admin/pages (see resources/js/admin/app.tsx).
    'pages' => [
        'ensure_pages_exist' => false,
        'paths' => [resource_path('js/admin/pages')],
        'extensions' => ['tsx', 'ts', 'jsx', 'js'],
    ],
    'testing' => [
        'ensure_pages_exist' => true,
    ],
];
