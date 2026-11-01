<?php
/**
 * Эвакуатор Атырау - Баптаулар файлы (Конфигурация)
 * Деректер қоры: SQLite (әдепкі) немесе MySQL
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

define('DB_TYPE', 'sqlite');
define('SQLITE_FILE', __DIR__ . '/../data/evacuator.sqlite');

define('MYSQL_HOST', 'localhost');
define('MYSQL_PORT', '3306');
define('MYSQL_NAME', 'evacuator_atyrau');
define('MYSQL_USER', 'root');
define('MYSQL_PASS', '');
define('MYSQL_CHARSET', 'utf8mb4');

define('DEFAULT_ADMIN_USER', 'admin');
define('DEFAULT_ADMIN_PASS', 'admin123');

define('SITE_PHONE', '+7 778 140 46 19');
define('SITE_PHONE_RAW', '+77781404619');
define('SITE_WHATSAPP', '77781404619');
define('SITE_CITY', 'Атырау');

define('TG_BOT_TOKEN', '');
define('TG_CHAT_ID', '');
