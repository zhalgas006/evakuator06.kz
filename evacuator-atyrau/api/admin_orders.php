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
    $status = trim($_GET['status'] ?? 'all');
    $search = trim($_GET['search'] ?? '');

    $whereClauses = [];
    $params = [];

    if ($status !== 'all' && !empty($status)) {
        $whereClauses[] = "status = ?";
        $params[] = $status;
    }

    if (!empty($search)) {
        $whereClauses[] = "(phone LIKE ? OR client_name LIKE ? OR location LIKE ? OR car_model LIKE ?)";
        $searchTerm = "%{$search}%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }

    $whereSql = count($whereClauses) > 0 ? "WHERE " . implode(" AND ", $whereClauses) : "";

    $stmt = $db->prepare("SELECT * FROM orders {$whereSql} ORDER BY id DESC LIMIT 200");
    $stmt->execute($params);
    $orders = $stmt->fetchAll();

    $statsStmt = $db->query("
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_count,
            SUM(CASE WHEN status IN ('accepted', 'in_progress') THEN 1 ELSE 0 END) as in_progress_count,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count
        FROM orders
    ");
    $stats = $statsStmt->fetch();

    jsonResponse([
        'success' => true,
        'stats' => [
            'total' => (int)($stats['total'] ?? 0),
            'new' => (int)($stats['new_count'] ?? 0),
            'in_progress' => (int)($stats['in_progress_count'] ?? 0),
            'completed' => (int)($stats['completed_count'] ?? 0)
        ],
        'orders' => $orders
    ]);
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    if (!$data) {
        $data = $_POST;
    }

    $action = $data['action'] ?? '';
    $orderId = (int)($data['order_id'] ?? $data['id'] ?? 0);

    if ($orderId <= 0) {
        jsonResponse(['success' => false, 'error' => 'Не указан ID заказа'], 422);
    }

    if ($action === 'update_status') {
        $newStatus = trim($data['status'] ?? 'new');
        $allowed = ['new', 'accepted', 'in_progress', 'completed', 'cancelled'];
        if (!in_array($newStatus, $allowed, true)) {
            jsonResponse(['success' => false, 'error' => 'Недопустимый статус заказа'], 422);
        }

        $stmt = $db->prepare("UPDATE orders SET status = ? WHERE id = ?");
        $stmt->execute([$newStatus, $orderId]);

        jsonResponse([
            'success' => true,
            'message' => 'Статус заказа обновлен',
            'order_id' => $orderId,
            'status' => $newStatus
        ]);
    }

    if ($action === 'delete') {
        $stmt = $db->prepare("DELETE FROM orders WHERE id = ?");
        $stmt->execute([$orderId]);

        jsonResponse([
            'success' => true,
            'message' => 'Заказ успешно удален',
            'order_id' => $orderId
        ]);
    }

    if ($action === 'update_details') {
        $price = trim($data['price'] ?? '');
        $notes = trim($data['notes'] ?? '');

        $stmt = $db->prepare("UPDATE orders SET price = ?, notes = ? WHERE id = ?");
        $stmt->execute([$price, $notes, $orderId]);

        jsonResponse([
            'success' => true,
            'message' => 'Данные обновлены'
        ]);
    }

    jsonResponse(['success' => false, 'error' => 'Неизвестное действие (action)'], 400);
}
