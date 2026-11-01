<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require_once __DIR__ . '/db.php';
requireAdminAuth();

$db = getDb();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $db->query("SELECT * FROM services ORDER BY sort_order ASC, id ASC");
    $services = $stmt->fetchAll();

    jsonResponse([
        'success' => true,
        'services' => $services
    ]);
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    if (!$data) {
        $data = $_POST;
    }

    $action = $data['action'] ?? '';
    $id = (int)($data['id'] ?? 0);

    if ($action === 'create') {
        $title = trim($data['title'] ?? '');
        $description = trim($data['description'] ?? '');
        $price = trim($data['price'] ?? 'Договорная');
        $icon = trim($data['icon'] ?? 'fa-solid fa-truck-pickup');
        $sortOrder = (int)($data['sort_order'] ?? 0);
        $isActive = isset($data['is_active']) ? (int)$data['is_active'] : 1;

        if (empty($title)) {
            jsonResponse(['success' => false, 'error' => 'Введите название услуги'], 422);
        }

        $stmt = $db->prepare("
            INSERT INTO services (title, description, price, icon, sort_order, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$title, $description, $price, $icon, $sortOrder, $isActive]);
        $newId = (int)$db->lastInsertId();

        jsonResponse([
            'success' => true,
            'message' => 'Новая услуга успешно добавлена',
            'id' => $newId
        ], 201);
    }

    if ($action === 'update') {
        if ($id <= 0) {
            jsonResponse(['success' => false, 'error' => 'Не указан ID услуги'], 422);
        }

        $title = trim($data['title'] ?? '');
        $description = trim($data['description'] ?? '');
        $price = trim($data['price'] ?? '');
        $icon = trim($data['icon'] ?? 'fa-solid fa-truck-pickup');
        $sortOrder = (int)($data['sort_order'] ?? 0);
        $isActive = isset($data['is_active']) ? (int)$data['is_active'] : 1;

        if (empty($title)) {
            jsonResponse(['success' => false, 'error' => 'Название услуги не может быть пустым'], 422);
        }

        $stmt = $db->prepare("
            UPDATE services 
            SET title = ?, description = ?, price = ?, icon = ?, sort_order = ?, is_active = ?
            WHERE id = ?
        ");
        $stmt->execute([$title, $description, $price, $icon, $sortOrder, $isActive, $id]);

        jsonResponse([
            'success' => true,
            'message' => 'Услуга и цена успешно обновлены',
            'id' => $id
        ]);
    }

    if ($action === 'update_price') {
        if ($id <= 0) {
            jsonResponse(['success' => false, 'error' => 'Не указан ID услуги'], 422);
        }
        $price = trim($data['price'] ?? '');

        $stmt = $db->prepare("UPDATE services SET price = ? WHERE id = ?");
        $stmt->execute([$price, $id]);

        jsonResponse([
            'success' => true,
            'message' => 'Цена успешно изменена',
            'id' => $id,
            'price' => $price
        ]);
    }

    if ($action === 'delete') {
        if ($id <= 0) {
            jsonResponse(['success' => false, 'error' => 'Не указан ID услуги'], 422);
        }

        $stmt = $db->prepare("DELETE FROM services WHERE id = ?");
        $stmt->execute([$id]);

        jsonResponse([
            'success' => true,
            'message' => 'Услуга успешно удалена',
            'id' => $id
        ]);
    }

    if ($action === 'toggle_active') {
        if ($id <= 0) {
            jsonResponse(['success' => false, 'error' => 'Не указан ID услуги'], 422);
        }

        $stmt = $db->prepare("UPDATE services SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?");
        $stmt->execute([$id]);

        jsonResponse([
            'success' => true,
            'message' => 'Статус услуги изменен'
        ]);
    }

    jsonResponse(['success' => false, 'error' => 'Неизвестное действие'], 400);
}
