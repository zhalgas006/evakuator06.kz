<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require_once __DIR__ . '/db.php';

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);
if (!$data) {
    $data = $_POST;
}

$username = trim($data['username'] ?? '');
$password = trim($data['password'] ?? '');

if (empty($username) || empty($password)) {
    jsonResponse(['success' => false, 'error' => 'Введите логин и пароль'], 422);
}

try {
    $db = getDb();
    $stmt = $db->prepare("SELECT * FROM admins WHERE username = ?");
    $stmt->execute([$username]);
    $admin = $stmt->fetch();

    if ($admin && password_verify($password, $admin['password_hash'])) {
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['admin_user'] = $admin['username'];
        $_SESSION['admin_id'] = $admin['id'];

        jsonResponse([
            'success' => true,
            'message' => 'Вы успешно вошли в систему',
            'user' => $admin['username']
        ]);
    } else {
        jsonResponse([
            'success' => false,
            'error' => 'Неверный логин или пароль'
        ], 401);
    }
} catch (Exception $e) {
    jsonResponse(['success' => false, 'error' => 'Системная ошибка: ' . $e->getMessage()], 500);
}
