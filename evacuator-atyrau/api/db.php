<?php
/**
 * Эвакуатор Атырау - Деректер қорымен байланыс (PDO Helper)
 */

require_once __DIR__ . '/config.php';

function getDb(): PDO {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $dbType = strtolower(defined('DB_TYPE') ? DB_TYPE : 'sqlite');

    if ($dbType === 'sqlite') {
        $dbFile = defined('SQLITE_FILE') ? SQLITE_FILE : __DIR__ . '/../data/evacuator.sqlite';
        $dbDir = dirname($dbFile);

        if (!is_dir($dbDir)) {
            mkdir($dbDir, 0777, true);
        }

        $dsn = "sqlite:" . $dbFile;
        try {
            $pdo = new PDO($dsn);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            $pdo->exec("PRAGMA foreign_keys = ON;");
        } catch (PDOException $e) {
            jsonResponse(['success' => false, 'error' => 'Ошибка подключения к SQLite: ' . $e->getMessage()], 500);
        }
    } else {
        $host = MYSQL_HOST;
        $port = MYSQL_PORT;
        $dbname = MYSQL_NAME;
        $charset = MYSQL_CHARSET;
        $user = MYSQL_USER;
        $pass = MYSQL_PASS;

        $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset={$charset}";
        try {
            $pdo = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$charset}"
            ]);
        } catch (PDOException $e) {
            jsonResponse(['success' => false, 'error' => 'Ошибка подключения к MySQL: ' . $e->getMessage()], 500);
        }
    }

    initializeSchema($pdo, $dbType);
    return $pdo;
}

function initializeSchema(PDO $pdo, string $dbType): void {
    $isSqlite = ($dbType === 'sqlite');
    $autoInc = $isSqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INT AUTO_INCREMENT PRIMARY KEY';
    $curTimestamp = $isSqlite ? 'DATETIME DEFAULT CURRENT_TIMESTAMP' : 'DATETIME DEFAULT CURRENT_TIMESTAMP';

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS services (
            id {$autoInc},
            title VARCHAR(255) NOT NULL,
            description TEXT,
            price VARCHAR(100) NOT NULL DEFAULT 'Договорная',
            icon VARCHAR(100) NOT NULL DEFAULT 'fa-solid fa-truck-pickup',
            sort_order INTEGER NOT NULL DEFAULT 0,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at {$curTimestamp}
        );
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS orders (
            id {$autoInc},
            client_name VARCHAR(100) NOT NULL,
            phone VARCHAR(50) NOT NULL,
            car_model VARCHAR(100) DEFAULT '',
            location VARCHAR(255) NOT NULL,
            destination VARCHAR(255) DEFAULT '',
            service_id INTEGER DEFAULT 0,
            service_name VARCHAR(255) DEFAULT '',
            price VARCHAR(100) DEFAULT '',
            notes TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'new',
            created_at {$curTimestamp}
        );
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS settings (
            setting_key VARCHAR(100) PRIMARY KEY,
            setting_value TEXT,
            updated_at {$curTimestamp}
        );
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS admins (
            id {$autoInc},
            username VARCHAR(50) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            created_at {$curTimestamp}
        );
    ");

    seedDefaultData($pdo);
}

function seedDefaultData(PDO $pdo): void {
    $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM admins");
    $adminCount = (int)$stmt->fetchColumn();
    if ($adminCount === 0) {
        $defaultUser = defined('DEFAULT_ADMIN_USER') ? DEFAULT_ADMIN_USER : 'admin';
        $defaultPass = defined('DEFAULT_ADMIN_PASS') ? DEFAULT_ADMIN_PASS : 'admin123';
        $passHash = password_hash($defaultPass, PASSWORD_DEFAULT);

        $insertAdmin = $pdo->prepare("INSERT INTO admins (username, password_hash) VALUES (?, ?)");
        $insertAdmin->execute([$defaultUser, $passHash]);
    }

    $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM services");
    $servicesCount = (int)$stmt->fetchColumn();
    if ($servicesCount === 0) {
        $defaultServices = [
            [
                'title' => 'Эвакуация после ДТП',
                'description' => 'Аккуратно погрузим аварийный автомобиль и безопасно доставим по указанному адресу.',
                'price' => 'от 10 000 ₸',
                'icon' => 'fa-solid fa-car-burst',
                'sort_order' => 1
            ],
            [
                'title' => 'Перевозка неисправных авто',
                'description' => 'Если отказал двигатель или коробка передач — оперативно доставим до автосервиса.',
                'price' => 'от 8 000 ₸',
                'icon' => 'fa-solid fa-screwdriver-wrench',
                'sort_order' => 2
            ],
            [
                'title' => 'Прикурить аккумулятор',
                'description' => 'Если сел аккумулятор, поможем завести автомобиль с помощью пускового устройства.',
                'price' => 'от 5 000 ₸',
                'icon' => 'fa-solid fa-car-battery',
                'sort_order' => 3
            ],
            [
                'title' => 'Эвакуация внедорожников и микроавтобусов',
                'description' => 'Мощный эвакуатор с усиленной платформой для тяжелых джипов и коммерческого транспорта.',
                'price' => 'от 12 000 ₸',
                'icon' => 'fa-solid fa-truck-pickup',
                'sort_order' => 4
            ],
            [
                'title' => 'Буксировка из грязи и песка',
                'description' => 'Вытащим автомобиль из кювета, глубокой грязи, снега или песка в Атырау и пригороде.',
                'price' => 'от 10 000 ₸',
                'icon' => 'fa-solid fa-anchor',
                'sort_order' => 5
            ],
            [
                'title' => 'Междугородняя перевозка',
                'description' => 'Надежная доставка автомобиля из Атырау в другие города (Кульсары, Актау, Уральск и др.).',
                'price' => 'Договорная (от 250 ₸/км)',
                'icon' => 'fa-solid fa-route',
                'sort_order' => 6
            ]
        ];

        $ins = $pdo->prepare("INSERT INTO services (title, description, price, icon, sort_order, is_active) VALUES (?, ?, ?, ?, ?, 1)");
        foreach ($defaultServices as $s) {
            $ins->execute([$s['title'], $s['description'], $s['price'], $s['icon'], $s['sort_order']]);
        }
    }

    $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM settings");
    $settingsCount = (int)$stmt->fetchColumn();
    if ($settingsCount === 0) {
        $settings = [
            'site_phone' => '+7 778 140 46 19',
            'site_phone_raw' => '+77781404619',
            'site_whatsapp' => '77781404619',
            'site_city' => 'Атырау',
            'work_hours' => 'Круглосуточно 24/7'
        ];
        $insSetting = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)");
        foreach ($settings as $k => $v) {
            $insSetting->execute([$k, $v]);
        }
    }
}

function jsonResponse($data, int $statusCode = 200): void {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function sendTelegramNotification(string $text): bool {
    $token = defined('TG_BOT_TOKEN') ? TG_BOT_TOKEN : '';
    $chatId = defined('TG_CHAT_ID') ? TG_CHAT_ID : '';

    if (empty($token) || empty($chatId)) {
        return false;
    }

    $url = "https://api.telegram.org/bot{$token}/sendMessage";
    $postData = [
        'chat_id' => $chatId,
        'text' => $text,
        'parse_mode' => 'HTML'
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    curl_close($ch);

    return ($res !== false);
}

function checkAdminAuth(): bool {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    return !empty($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true;
}

function requireAdminAuth(): void {
    if (!checkAdminAuth()) {
        jsonResponse(['success' => false, 'error' => 'Доступ запрещен. Сначала авторизуйтесь.'], 401);
    }
}
