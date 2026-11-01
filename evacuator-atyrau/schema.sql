-- ============================================================
-- Эвакуатор Атырау — Структура базы данных (MySQL / MariaDB)
-- Для импорта через phpMyAdmin или консоль MySQL
-- ============================================================

CREATE DATABASE IF NOT EXISTS `evacuator_atyrau` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `evacuator_atyrau`;

-- 1. Таблица услуг и цен (services)
CREATE TABLE IF NOT EXISTS `services` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `price` VARCHAR(100) NOT NULL DEFAULT 'Договорная',
  `icon` VARCHAR(100) NOT NULL DEFAULT 'fa-solid fa-truck-pickup',
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Таблица заказов и заявок (orders)
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `client_name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `car_model` VARCHAR(100) DEFAULT '',
  `location` VARCHAR(255) NOT NULL,
  `destination` VARCHAR(255) DEFAULT '',
  `service_id` INT DEFAULT 0,
  `service_name` VARCHAR(255) DEFAULT '',
  `price` VARCHAR(100) DEFAULT '',
  `notes` TEXT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'new',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (`phone`),
  INDEX (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Настройки сайта (settings)
CREATE TABLE IF NOT EXISTS `settings` (
  `setting_key` VARCHAR(100) PRIMARY KEY,
  `setting_value` TEXT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Администраторы (admins)
CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- НАЧАЛЬНЫЕ ДАННЫЕ (SEED DATA)
-- ============================================================

INSERT INTO `admins` (`username`, `password_hash`) 
VALUES ('admin', '$2y$10$tZ2cRz1UuIvi5r4s2cZf4eeIsqzGvhUvP.s.BovhE9l8wP/3pTzC6')
ON DUPLICATE KEY UPDATE `username` = `username`;

INSERT INTO `services` (`title`, `description`, `price`, `icon`, `sort_order`, `is_active`) VALUES
('Эвакуация после ДТП', 'Аккуратно погрузим аварийный автомобиль и безопасно доставим по указанному адресу.', 'от 10 000 ₸', 'fa-solid fa-car-burst', 1, 1),
('Перевозка неисправных авто', 'Если отказал двигатель или коробка передач — оперативно доставим до автосервиса.', 'от 8 000 ₸', 'fa-solid fa-screwdriver-wrench', 2, 1),
('Прикурить аккумулятор', 'Если сел аккумулятор, поможем завести автомобиль с помощью пускового устройства.', 'от 5 000 ₸', 'fa-solid fa-car-battery', 3, 1),
('Эвакуация внедорожников и микроавтобусов', 'Мощный эвакуатор с усиленной платформой для тяжелых джипов и коммерческого транспорта.', 'от 12 000 ₸', 'fa-solid fa-truck-pickup', 4, 1),
('Буксировка из грязи и песка', 'Вытащим автомобиль из кювета, глубокой грязи, снега или песка в Атырау и пригороде.', 'от 10 000 ₸', 'fa-solid fa-anchor', 5, 1),
('Междугородняя перевозка', 'Надежная доставка автомобиля из Атырау в другие города (Кульсары, Актау, Уральск и др.).', 'Договорная (от 250 ₸/км)', 'fa-solid fa-route', 6, 1);

INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES
('site_phone', '+7 778 140 46 19'),
('site_phone_raw', '+77781404619'),
('site_whatsapp', '77781404619'),
('site_city', 'Атырау'),
('work_hours', 'Круглосуточно 24/7')
ON DUPLICATE KEY UPDATE `setting_key` = `setting_key`;
