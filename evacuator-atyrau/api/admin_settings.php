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
    $stmt = $db->query("SELECT setting_key, setting_value FROM settings");
    $raw = $stmt->fetchAll();

    $settings = [];
    foreach ($raw as $row) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }

    $dbType = defined('DB_TYPE') ? DB_TYPE : 'sqlite';
    $dbFile = defined('SQLITE_FILE') ? SQLITE_FILE : '';

    jsonResponse([
        'success' => true,
        'settings' => $settings,
        'system' => [
            'db_type' => $dbType,
            'db_file_exists' => ($dbType === 'sqlite' ? file_exists($dbFile) : true),
            'php_version' => PHP_VERSION
        ]
    ]);
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    if (!$data) {
        $data = $_POST;
    }

    $action = $data['action'] ?? '';

    if ($action === 'update_contacts') {
        $keys = ['site_phone', 'site_whatsapp', 'site_city', 'work_hours'];
        $dbType = strtolower(defined('DB_TYPE') ? DB_TYPE : 'sqlite');

        if ($dbType === 'sqlite') {
            $stmt = $db->prepare("
                INSERT OR REPLACE INTO settings (setting_key, setting_value, updated_at) 
                VALUES (?, ?, CURRENT_TIMESTAMP)
            ");
        } else {
            $stmt = $db->prepare("
                INSERT INTO settings (setting_key, setting_value, updated_at) 
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP
            ");
        }

        foreach ($keys as $k) {
            if (isset($data[$k])) {
                $stmt->execute([$k, trim($data[$k])]);
            }
        }

        jsonResponse([
            'success' => true,
            'message' => 'Контактные настройки сохранены'
        ]);
    }

    if ($action === 'change_password') {
        $oldPass = trim($data['old_password'] ?? '');
        $newPass = trim($data['new_password'] ?? '');

        if (empty($newPass) || strlen($newPass) < 6) {
            jsonResponse(['success' => false, 'error' => 'Новый пароль должен содержать не менее 6 символов'], 422);
        }

        $userId = $_SESSION['admin_id'] ?? 1;
        $stmt = $db->prepare("SELECT * FROM admins WHERE id = ?");
        $stmt->execute([$userId]);
        $admin = $stmt->fetch();

        if (!$admin || !password_verify($oldPass, $admin['password_hash'])) {
            jsonResponse(['success' => false, 'error' => 'Неверный текущий пароль'], 403);
        }

        $newHash = password_hash($newPass, PASSWORD_DEFAULT);
        $updateStmt = $db->prepare("UPDATE admins SET password_hash = ? WHERE id = ?");
        $updateStmt->execute([$newHash, $userId]);

        jsonResponse([
            'success' => true,
            'message' => 'Пароль успешно изменен'
        ]);
    }

    jsonResponse(['success' => false, 'error' => 'Неизвестное действие'], 400);
}
