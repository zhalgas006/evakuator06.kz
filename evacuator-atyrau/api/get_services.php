<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

require_once __DIR__ . '/db.php';

try {
    $db = getDb();
    $stmt = $db->query("
        SELECT id, title, description, price, icon, sort_order 
        FROM services 
        WHERE is_active = 1 
        ORDER BY sort_order ASC, id ASC
    ");
    $services = $stmt->fetchAll();

    jsonResponse([
        'success' => true,
        'count' => count($services),
        'services' => $services
    ]);
} catch (Exception $e) {
    jsonResponse([
        'success' => false,
        'error' => 'Қызметтерді жүктеу қатесі: ' . $e->getMessage()
    ], 500);
}
