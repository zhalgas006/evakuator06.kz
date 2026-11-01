<?php
require_once __DIR__ . '/db.php';

if (!checkAdminAuth()) {
    die("Доступ запрещен. Сначала авторизуйтесь.");
}

$db = getDb();
$stmt = $db->query("SELECT * FROM orders ORDER BY id DESC");
$orders = $stmt->fetchAll();

$filename = "evacuator_orders_" . date('Y-m-d_H-i') . ".csv";

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');

$output = fopen('php://output', 'w');
fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));

fputcsv($output, [
    'ID',
    'Дата и время',
    'Имя клиента',
    'Телефон',
    'Марка авто',
    'Откуда (адрес)',
    'Куда доставить',
    'Вид услуги',
    'Цена',
    'Статус',
    'Примечание'
], ';');

foreach ($orders as $o) {
    fputcsv($output, [
        $o['id'],
        $o['created_at'],
        $o['client_name'],
        $o['phone'],
        $o['car_model'],
        $o['location'],
        $o['destination'],
        $o['service_name'],
        $o['price'],
        $o['status'],
        $o['notes']
    ], ';');
}

fclose($output);
exit;
