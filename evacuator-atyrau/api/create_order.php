<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'error' => 'Тек POST сұраныс қабылданады'], 405);
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!$data) {
    $data = $_POST;
}

$phone = trim($data['phone'] ?? '');
$name = trim($data['client_name'] ?? $data['name'] ?? 'Клиент');
$carModel = trim($data['car_model'] ?? '');
$location = trim($data['location'] ?? 'Атырау');
$destination = trim($data['destination'] ?? '');
$serviceId = (int)($data['service_id'] ?? 0);
$serviceName = trim($data['service_name'] ?? '');
$price = trim($data['price'] ?? '');
$notes = trim($data['notes'] ?? $data['comment'] ?? '');

if (empty($phone)) {
    jsonResponse(['success' => false, 'error' => 'Телефон нөмірін енгізіңіз'], 422);
}

if (strlen($phone) < 6) {
    jsonResponse(['success' => false, 'error' => 'Телефон нөмірі тым қысқа'], 422);
}

try {
    $db = getDb();

    if ($serviceId > 0 && empty($serviceName)) {
        $stmtS = $db->prepare("SELECT title, price FROM services WHERE id = ?");
        $stmtS->execute([$serviceId]);
        $serv = $stmtS->fetch();
        if ($serv) {
            $serviceName = $serv['title'];
            if (empty($price)) {
                $price = $serv['price'];
            }
        }
    }

    $stmt = $db->prepare("
        INSERT INTO orders (
            client_name, phone, car_model, location, destination, 
            service_id, service_name, price, notes, status, created_at
        ) VALUES (
            ?, ?, ?, ?, ?, 
            ?, ?, ?, ?, 'new', CURRENT_TIMESTAMP
        )
    ");

    $stmt->execute([
        $name,
        $phone,
        $carModel,
        $location,
        $destination,
        $serviceId,
        $serviceName,
        $price,
        $notes
    ]);

    $orderId = (int)$db->lastInsertId();

    $tgText = "🚨 <b>НОВЫЙ ЗАКАЗ — ЭВАКУАТОР АТЫРАУ</b> #{$orderId}\n\n";
    $tgText .= "👤 <b>Клиент:</b> " . htmlspecialchars($name) . "\n";
    $tgText .= "📞 <b>Телефон:</b> " . htmlspecialchars($phone) . "\n";
    if (!empty($carModel)) {
        $tgText .= "🚗 <b>Авто:</b> " . htmlspecialchars($carModel) . "\n";
    }
    $tgText .= "📍 <b>Откуда:</b> " . htmlspecialchars($location) . "\n";
    if (!empty($destination)) {
        $tgText .= "🏁 <b>Куда:</b> " . htmlspecialchars($destination) . "\n";
    }
    if (!empty($serviceName)) {
        $tgText .= "⚙️ <b>Услуга:</b> " . htmlspecialchars($serviceName) . " ({$price})\n";
    }
    if (!empty($notes)) {
        $tgText .= "📝 <b>Примечание:</b> " . htmlspecialchars($notes) . "\n";
    }
    $tgText .= "\n🕒 <b>Время:</b> " . date('Y-m-d H:i:s');

    sendTelegramNotification($tgText);

    jsonResponse([
        'success' => true,
        'message' => 'Ваш заказ успешно принят! Наш водитель свяжется с вами в течение 2-3 минут.',
        'order_id' => $orderId
    ], 201);

} catch (Exception $e) {
    jsonResponse([
        'success' => false,
        'error' => 'Ошибка при сохранении заказа: ' . $e->getMessage()
    ], 500);
}
