<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

require_once __DIR__ . '/db.php';

if (checkAdminAuth()) {
    jsonResponse([
        'authenticated' => true,
        'user' => $_SESSION['admin_user'] ?? 'admin'
    ]);
} else {
    jsonResponse([
        'authenticated' => false
    ]);
}
