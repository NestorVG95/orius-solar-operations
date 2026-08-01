<?php

// Copy to api/config.php on the server. Never commit config.php.
return [
    'db' => [
        'dsn' => 'mysql:host=127.0.0.1;dbname=orius_operations;charset=utf8mb4',
        'user' => 'orius_app',
        'password' => 'CHANGE_ME',
    ],
    // Generate with: php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
    'app_key' => 'CHANGE_ME_TO_A_RANDOM_64_CHARACTER_SECRET',
    // true on HTTPS Hostinger; false only for local HTTP testing.
    'session_secure' => true,
];
