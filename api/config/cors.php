<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // Static frontend served by nginx on :8087, plus localhost variants for dev.
    'allowed_origins' => [
        'http://localhost:8087',
        'http://127.0.0.1:8087',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // Token (Bearer) auth — no cookies — so credentials are not required.
    'supports_credentials' => false,
];
