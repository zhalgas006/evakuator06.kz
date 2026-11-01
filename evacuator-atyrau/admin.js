/**
 * Эвакуатор Атырау — Основной скрипт панели управления (Admin JS)
 */

const API_BASE = 'api';
let isLocalFileMode = window.location.protocol === 'file:';
let currentOrders = [];
let currentServices = [];
let autoRefreshTimer = null;

// Демо-данные по умолчанию (для локального режима file:///)
const defaultLocalServices = [
    { id: 1, title: 'Эвакуация после ДТП', description: 'Аккуратно погрузим аварийный автомобиль и безопасно доставим по указанному адресу.', price: 'от 10 000 ₸', icon: 'fa-solid fa-car-burst', sort_order: 1, is_active: 1 },
    { id: 2, title: 'Перевозка неисправных авто', description: 'Если отказал двигатель или коробка передач — оперативно доставим до автосервиса.', price: 'от 8 000 ₸', icon: 'fa-solid fa-screwdriver-wrench', sort_order: 2, is_active: 1 },
    { id: 3, title: 'Прикурить аккумулятор', description: 'Если сел аккумулятор, поможем завести автомобиль с помощью пускового устройства.', price: 'от 5 000 ₸', icon: 'fa-solid fa-car-battery', sort_order: 3, is_active: 1 },
    { id: 4, title: 'Эвакуация внедорожников и микроавтобусов', description: 'Мощный эвакуатор с усиленной платформой для тяжелых джипов и коммерческого транспорта.', price: 'от 12 000 ₸', icon: 'fa-solid fa-truck-pickup', sort_order: 4, is_active: 1 },
    { id: 5, title: 'Буксировка из грязи и песка', description: 'Вытащим автомобиль из кювета, глубокой грязи, снега или песка в Атырау и пригороде.', price: 'от 10 000 ₸', icon: 'fa-solid fa-anchor', sort_order: 5, is_active: 1 },
    { id: 6, title: 'Междугородняя перевозка', description: 'Надежная доставка автомобиля из Атырау в другие города (Кульсары, Актау, Уральск и др.).', price: 'Договорная (от 250 ₸/км)', icon: 'fa-solid fa-route', sort_order: 6, is_active: 1 }
];

const defaultLocalOrders = [
    { id: 101, client_name: 'Нурлан', phone: '+7 701 555 12 34', car_model: 'Toyota Camry 70', location: 'ул. Сатпаева 15, Атырау', destination: 'СТО Барыс', service_name: 'Перевозка неисправных авто', price: 'от 8 000 ₸', status: 'new', created_at: new Date().toLocaleString('ru-RU') },
    { id: 100, client_name: 'Азамат', phone: '+7 775 888 44 22', car_model: 'Lexus RX350', location: 'Трасса Атырау-Доссор 12 км', destination: 'г. Атырау', service_name: 'Эвакуация после ДТП', price: 'от 10 000 ₸', status: 'in_progress', created_at: new Date(Date.now() - 3600000).toLocaleString('ru-RU') }
];

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    if (isLocalFileMode) {
        document.getElementById('localModeNotice')?.classList.remove('d-none');
        if (localStorage.getItem('adm_logged_in') === 'true') {
            showDashboard();
        } else {
            showLogin();
        }
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/admin_check.php`);
        const data = await res.json();
        if (data.authenticated) {
            showDashboard();
        } else {
            showLogin();
        }
    } catch (err) {
        console.warn('Сервер недоступен, переход в локальный режим:', err);
        isLocalFileMode = true;
        document.getElementById('localModeNotice')?.classList.remove('d-none');
        showDashboard();
    }
}

// --- НАВИГАЦИЯ И ЭКРАНЫ ---
function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboardScreen').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboardScreen').style.display = 'block';
    loadOrders();
    loadServices();
    loadSettings();
    startAutoRefresh();
}

function switchTab(tabName) {
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');

    document.getElementById(`tabBtn_${tabName}`)?.classList.add('active');
    document.getElementById(`tab_${tabName}`).style.display = 'block';

    if (tabName === 'orders') loadOrders();
    if (tabName === 'services') loadServices();
    if (tabName === 'settings') loadSettings();
}

// --- АВТОРИЗАЦИЯ И ВЫХОД (AUTH) ---
async function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById('loginUsername').value.trim();
    const pass = document.getElementById('loginPassword').value.trim();
    const errEl = document.getElementById('loginError');
    errEl.textContent = '';

    if (isLocalFileMode) {
        if (user === 'admin' && pass === 'admin123') {
            localStorage.setItem('adm_logged_in', 'true');
            showDashboard();
            showToast('Добро пожаловать в систему!', 'success');
        } else {
            errEl.textContent = 'Логин: admin, Пароль: admin123';
        }
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/admin_login.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        const data = await res.json();
        if (data.success) {
            showDashboard();
            showToast('Вы успешно вошли!', 'success');
        } else {
            errEl.textContent = data.error || 'Неверные данные';
        }
    } catch (err) {
        errEl.textContent = 'Ошибка подключения к серверу: ' + err.message;
    }
}

async function handleLogout() {
    if (isLocalFileMode) {
        localStorage.removeItem('adm_logged_in');
        showLogin();
        return;
    }

    try {
        await fetch(`${API_BASE}/admin_logout.php`);
    } catch (_) {}
    showLogin();
}

// --- УПРАВЛЕНИЕ ЗАКАЗАМИ (ORDERS) ---
async function loadOrders() {
    const search = document.getElementById('orderSearch')?.value.trim() || '';
    const activePill = document.querySelector('.filter-pills .pill-btn.active');
    const status = activePill ? activePill.dataset.status : 'all';

    if (isLocalFileMode) {
        let saved = localStorage.getItem('local_orders');
        currentOrders = saved ? JSON.parse(saved) : defaultLocalOrders;
        renderOrders(currentOrders, status, search);
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/admin_orders.php?status=${status}&search=${encodeURIComponent(search)}`);
        const data = await res.json();
        if (data.success) {
            currentOrders = data.orders || [];
            updateStats(data.stats);
            renderOrdersTable(currentOrders);
        }
    } catch (err) {
        console.error('Заказы не загрузились:', err);
    }
}

function updateStats(stats) {
    if (!stats) return;
    document.getElementById('statTotal').textContent = stats.total || 0;
    document.getElementById('statNew').textContent = stats.new || 0;
    document.getElementById('statInProgress').textContent = stats.in_progress || 0;
    document.getElementById('statCompleted').textContent = stats.completed || 0;
}

function renderOrders(orders, filterStatus, search) {
    let filtered = orders.filter(o => {
        let matchStatus = (filterStatus === 'all') || (o.status === filterStatus);
        let matchSearch = !search || 
            (o.phone && o.phone.toLowerCase().includes(search.toLowerCase())) ||
            (o.client_name && o.client_name.toLowerCase().includes(search.toLowerCase())) ||
            (o.location && o.location.toLowerCase().includes(search.toLowerCase()));
        return matchStatus && matchSearch;
    });

    const stats = {
        total: orders.length,
        new: orders.filter(o => o.status === 'new').length,
        in_progress: orders.filter(o => o.status === 'accepted' || o.status === 'in_progress').length,
        completed: orders.filter(o => o.status === 'completed').length
    };
    updateStats(stats);
    renderOrdersTable(filtered);
}

function renderOrdersTable(orders) {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    if (orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 40px; color: var(--adm-text-muted);">
            <i class="fa-solid fa-inbox" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
            Заказы не найдены
        </td></tr>`;
        return;
    }

    tbody.innerHTML = orders.map(o => {
        const cleanPhone = (o.phone || '').replace(/[^0-9]/g, '');
        const waText = encodeURIComponent(`Здравствуйте, ${o.client_name || ''}! Вас беспокоит служба эвакуации Эвакуатор Атырау. Ваш автомобиль: ${o.car_model || ''}, адрес: ${o.location || ''}.`);

        return `
            <tr>
                <td style="font-weight: 700; color: var(--adm-primary);">#${o.id}</td>
                <td style="white-space: nowrap; font-size: 0.82rem; color: var(--adm-text-muted);">${o.created_at || '-'}</td>
                <td>
                    <div style="font-weight: 700;">${escapeHtml(o.client_name)}</div>
                    <div style="font-size: 0.85rem; color: var(--adm-text-muted);">${escapeHtml(o.phone)}</div>
                </td>
                <td>
                    <div style="font-weight: 600;">${escapeHtml(o.car_model || 'Не указано')}</div>
                </td>
                <td>
                    <div style="font-size: 0.88rem;"><i class="fa-solid fa-location-dot text-amber" style="margin-right: 4px;"></i> ${escapeHtml(o.location)}</div>
                    ${o.destination ? `<div style="font-size: 0.82rem; color: var(--adm-text-muted); margin-top: 4px;"><i class="fa-solid fa-flag-checkered" style="margin-right: 4px;"></i> ${escapeHtml(o.destination)}</div>` : ''}
                </td>
                <td>
                    <div style="font-weight: 600; font-size: 0.88rem;">${escapeHtml(o.service_name || 'Вызов эвакуатора')}</div>
                    <div style="font-size: 0.82rem; color: #10b981; font-weight: 700;">${escapeHtml(o.price || 'Договорная')}</div>
                    ${o.notes ? `<div style="font-size: 0.78rem; color: #94a3b8; margin-top: 4px;">"${escapeHtml(o.notes)}"</div>` : ''}
                </td>
                <td>
                    <select class="form-control" style="padding: 6px 10px; font-size: 0.82rem; width: auto;" onchange="changeOrderStatus(${o.id}, this.value)">
                        <option value="new" ${o.status === 'new' ? 'selected' : ''}>Новый</option>
                        <option value="accepted" ${o.status === 'accepted' ? 'selected' : ''}>Принят</option>
                        <option value="in_progress" ${o.status === 'in_progress' ? 'selected' : ''}>В работе</option>
                        <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>Завершен</option>
                        <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Отменен</option>
                    </select>
                </td>
                <td>
                    <div style="display: flex; gap: 6px;">
                        <a href="https://wa.me/${cleanPhone}?text=${waText}" target="_blank" class="btn-adm btn-adm-success btn-adm-sm" title="Написать в WhatsApp">
                            <i class="fa-brands fa-whatsapp"></i>
                        </a>
                        <a href="tel:${o.phone}" class="btn-adm btn-adm-outline btn-adm-sm" title="Позвонить">
                            <i class="fa-solid fa-phone"></i>
                        </a>
                        <button onclick="deleteOrder(${o.id})" class="btn-adm btn-adm-danger btn-adm-sm" title="Удалить">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function changeOrderStatus(id, newStatus) {
    if (isLocalFileMode) {
        const order = currentOrders.find(o => o.id === id);
        if (order) order.status = newStatus;
        localStorage.setItem('local_orders', JSON.stringify(currentOrders));
        loadOrders();
        showToast('Статус обновлен', 'success');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/admin_orders.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update_status', order_id: id, status: newStatus })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Статус успешно изменен', 'success');
            loadOrders();
        } else {
            alert(data.error);
        }
    } catch (err) {
        alert('Ошибка: ' + err.message);
    }
}

async function deleteOrder(id) {
    if (!confirm(`Вы действительно хотите удалить заказ №${id}?`)) return;

    if (isLocalFileMode) {
        currentOrders = currentOrders.filter(o => o.id !== id);
        localStorage.setItem('local_orders', JSON.stringify(currentOrders));
        loadOrders();
        showToast('Заказ удален', 'info');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/admin_orders.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', order_id: id })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Заказ удален', 'info');
            loadOrders();
        } else {
            alert(data.error);
        }
    } catch (err) {
        alert('Ошибка: ' + err.message);
    }
}

function filterOrdersByStatus(status, btn) {
    document.querySelectorAll('.filter-pills .pill-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadOrders();
}

function exportOrdersCSV() {
    if (isLocalFileMode) {
        alert('Экспорт в CSV доступен в серверном режиме (api/export_orders.php).');
        return;
    }
    window.location.href = `${API_BASE}/export_orders.php`;
}

function startAutoRefresh() {
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    autoRefreshTimer = setInterval(() => {
        const autoCheck = document.getElementById('autoRefreshCheck');
        if (autoCheck && autoCheck.checked) {
            loadOrders();
        }
    }, 25000);
}

// --- УПРАВЛЕНИЕ УСЛУГАМИ И ЦЕНАМИ (SERVICES & PRICING) ---
async function loadServices() {
    if (isLocalFileMode) {
        let saved = localStorage.getItem('local_services');
        currentServices = saved ? JSON.parse(saved) : defaultLocalServices;
        renderServicesAdminGrid(currentServices);
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/admin_services.php`);
        const data = await res.json();
        if (data.success) {
            currentServices = data.services || [];
            renderServicesAdminGrid(currentServices);
        }
    } catch (err) {
        console.error('Услуги не загрузились:', err);
    }
}

function renderServicesAdminGrid(services) {
    const grid = document.getElementById('servicesAdminGrid');
    if (!grid) return;

    if (services.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--adm-text-muted);">
            Услуги не найдены. Добавьте новую услугу!
        </div>`;
        return;
    }

    grid.innerHTML = services.map(s => `
        <div class="service-admin-card" style="${s.is_active ? '' : 'opacity: 0.6;'}">
            <div>
                <div class="service-admin-head">
                    <div class="service-admin-icon">
                        <i class="${escapeHtml(s.icon || 'fa-solid fa-truck-pickup')}"></i>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span class="badge-status ${s.is_active ? 'status-completed' : 'status-cancelled'}">
                            ${s.is_active ? 'Активна' : 'Скрыта'}
                        </span>
                    </div>
                </div>
                <h3 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 8px;">${escapeHtml(s.title)}</h3>
                <p style="font-size: 0.88rem; color: var(--adm-text-muted); line-height: 1.5; margin-bottom: 14px;">${escapeHtml(s.description || '')}</p>
                <div class="service-price-tag">
                    <i class="fa-solid fa-tag" style="font-size: 1rem; margin-right: 6px;"></i> ${escapeHtml(s.price)}
                </div>
            </div>
            <div style="border-top: 1px solid var(--adm-border); padding-top: 16px; margin-top: 16px; display: flex; justify-content: space-between; align-items: center;">
                <button onclick="openEditServiceModal(${s.id})" class="btn-adm btn-adm-outline btn-adm-sm">
                    <i class="fa-solid fa-pen-to-square"></i> Редактировать / Цена
                </button>
                <div style="display: flex; gap: 6px;">
                    <button onclick="toggleServiceActive(${s.id})" class="btn-adm btn-adm-outline btn-adm-sm" title="${s.is_active ? 'Скрыть' : 'Показать'}">
                        <i class="fa-solid ${s.is_active ? 'fa-eye-slash' : 'fa-eye'}"></i>
                    </button>
                    <button onclick="deleteService(${s.id})" class="btn-adm btn-adm-danger btn-adm-sm" title="Удалить">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function openAddServiceModal() {
    document.getElementById('serviceModalTitle').textContent = 'Добавить услугу';
    document.getElementById('serviceForm').reset();
    document.getElementById('serviceId').value = '';
    document.getElementById('serviceIsActive').checked = true;
    document.getElementById('serviceModal').classList.add('active');
}

function openEditServiceModal(id) {
    const s = currentServices.find(x => x.id === id);
    if (!s) return;

    document.getElementById('serviceModalTitle').textContent = 'Редактирование услуги и цены';
    document.getElementById('serviceId').value = s.id;
    document.getElementById('serviceTitle').value = s.title;
    document.getElementById('servicePrice').value = s.price;
    document.getElementById('serviceIcon').value = s.icon || 'fa-solid fa-truck-pickup';
    document.getElementById('serviceSort').value = s.sort_order || 0;
    document.getElementById('serviceDesc').value = s.description || '';
    document.getElementById('serviceIsActive').checked = (parseInt(s.is_active) === 1);

    document.getElementById('serviceModal').classList.add('active');
}

function closeServiceModal() {
    document.getElementById('serviceModal').classList.remove('active');
}

async function handleServiceSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('serviceId').value;
    const isEdit = Boolean(id);

    const payload = {
        action: isEdit ? 'update' : 'create',
        id: id ? parseInt(id) : undefined,
        title: document.getElementById('serviceTitle').value.trim(),
        price: document.getElementById('servicePrice').value.trim(),
        icon: document.getElementById('serviceIcon').value.trim(),
        sort_order: parseInt(document.getElementById('serviceSort').value) || 0,
        description: document.getElementById('serviceDesc').value.trim(),
        is_active: document.getElementById('serviceIsActive').checked ? 1 : 0
    };

    if (isLocalFileMode) {
        if (isEdit) {
            const idx = currentServices.findIndex(s => s.id === parseInt(id));
            if (idx !== -1) currentServices[idx] = { ...currentServices[idx], ...payload };
        } else {
            payload.id = Date.now();
            currentServices.push(payload);
        }
        localStorage.setItem('local_services', JSON.stringify(currentServices));
        closeServiceModal();
        loadServices();
        showToast('Услуга сохранена!', 'success');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/admin_services.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            closeServiceModal();
            loadServices();
            showToast(data.message || 'Успешно сохранено!', 'success');
        } else {
            alert(data.error);
        }
    } catch (err) {
        alert('Ошибка: ' + err.message);
    }
}

async function toggleServiceActive(id) {
    if (isLocalFileMode) {
        const s = currentServices.find(x => x.id === id);
        if (s) s.is_active = s.is_active ? 0 : 1;
        localStorage.setItem('local_services', JSON.stringify(currentServices));
        loadServices();
        showToast('Статус изменен', 'info');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/admin_services.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle_active', id: id })
        });
        const data = await res.json();
        if (data.success) {
            loadServices();
            showToast('Статус изменен', 'info');
        }
    } catch (err) {
        alert('Ошибка: ' + err.message);
    }
}

async function deleteService(id) {
    if (!confirm('Вы уверены, что хотите удалить эту услугу?')) return;

    if (isLocalFileMode) {
        currentServices = currentServices.filter(s => s.id !== id);
        localStorage.setItem('local_services', JSON.stringify(currentServices));
        loadServices();
        showToast('Услуга удалена', 'info');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/admin_services.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', id: id })
        });
        const data = await res.json();
        if (data.success) {
            loadServices();
            showToast('Услуга удалена', 'info');
        } else {
            alert(data.error);
        }
    } catch (err) {
        alert('Ошибка: ' + err.message);
    }
}

// --- НАСТРОЙКИ (SETTINGS) ---
async function loadSettings() {
    if (isLocalFileMode) {
        document.getElementById('setPhone').value = '+7 778 140 46 19';
        document.getElementById('setWhatsapp').value = '77781404619';
        document.getElementById('setCity').value = 'г. Атырау и область';
        document.getElementById('dbInfoBadge').textContent = 'SQLite (Локальное демо)';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/admin_settings.php`);
        const data = await res.json();
        if (data.success) {
            const s = data.settings || {};
            document.getElementById('setPhone').value = s.site_phone || '';
            document.getElementById('setWhatsapp').value = s.site_whatsapp || '';
            document.getElementById('setCity').value = s.site_city || '';
            document.getElementById('setHours').value = s.work_hours || '';

            const sys = data.system || {};
            document.getElementById('dbInfoBadge').textContent = `${sys.db_type.toUpperCase()} (PHP ${sys.php_version})`;
        }
    } catch (err) {
        console.error('Настройки не загрузились:', err);
    }
}

async function saveContactSettings(e) {
    e.preventDefault();
    const payload = {
        action: 'update_contacts',
        site_phone: document.getElementById('setPhone').value.trim(),
        site_whatsapp: document.getElementById('setWhatsapp').value.trim(),
        site_city: document.getElementById('setCity').value.trim(),
        work_hours: document.getElementById('setHours').value.trim()
    };

    if (isLocalFileMode) {
        showToast('Контактные данные сохранены (демо)', 'success');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/admin_settings.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            showToast('Настройки успешно сохранены!', 'success');
        } else {
            alert(data.error);
        }
    } catch (err) {
        alert('Ошибка: ' + err.message);
    }
}

async function changePassword(e) {
    e.preventDefault();
    const oldPass = document.getElementById('oldPassword').value.trim();
    const newPass = document.getElementById('newPassword').value.trim();

    if (!oldPass || !newPass) {
        alert('Введите текущий и новый пароль');
        return;
    }

    if (isLocalFileMode) {
        alert('Для изменения пароля запустите сайт на PHP сервере.');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/admin_settings.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'change_password', old_password: oldPass, new_password: newPass })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Пароль успешно обновлен!', 'success');
            document.getElementById('passwordForm').reset();
        } else {
            alert(data.error);
        }
    } catch (err) {
        alert('Ошибка: ' + err.message);
    }
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (HELPERS) ---
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.padding = '14px 24px';
    toast.style.borderRadius = '12px';
    toast.style.color = '#fff';
    toast.style.zIndex = '9999';
    toast.style.fontWeight = '600';
    toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
    toast.style.transition = 'all 0.3s';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '10px';

    if (type === 'success') {
        toast.style.background = '#10b981';
        toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${escapeHtml(message)}`;
    } else if (type === 'error') {
        toast.style.background = '#ef4444';
        toast.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(message)}`;
    } else {
        toast.style.background = '#3b82f6';
        toast.innerHTML = `<i class="fa-solid fa-info-circle"></i> ${escapeHtml(message)}`;
    }

    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
