/**
 * Эвакуатор Атырау — Основная клиентская логика (App JS)
 * Загрузка услуг и цен из базы данных и отправка заказа
 */

const API_SERVICES = 'api/get_services.php';
const API_ORDER = 'api/create_order.php';

// Услуги по умолчанию (резервная копия, если сервер не запущен)
const fallbackServices = [
    {
        id: 1,
        title: 'Эвакуация после ДТП',
        description: 'Аккуратно погрузим аварийный автомобиль и безопасно доставим по указанному адресу.',
        price: 'от 10 000 ₸',
        icon: 'fa-solid fa-car-burst'
    },
    {
        id: 2,
        title: 'Перевозка неисправных авто',
        description: 'Если отказал двигатель или коробка передач — оперативно доставим до автосервиса.',
        price: 'от 8 000 ₸',
        icon: 'fa-solid fa-screwdriver-wrench'
    },
    {
        id: 3,
        title: 'Прикурить аккумулятор',
        description: 'Если сел аккумулятор, поможем завести автомобиль с помощью пускового устройства.',
        price: 'от 5 000 ₸',
        icon: 'fa-solid fa-car-battery'
    },
    {
        id: 4,
        title: 'Эвакуация внедорожников и микроавтобусов',
        description: 'Мощный эвакуатор с усиленной платформой для тяжелых джипов и коммерческого транспорта.',
        price: 'от 12 000 ₸',
        icon: 'fa-solid fa-truck-pickup'
    },
    {
        id: 5,
        title: 'Буксировка из грязи и песка',
        description: 'Вытащим автомобиль из кювета, глубокой грязи, снега или песка в Атырау и пригороде.',
        price: 'от 10 000 ₸',
        icon: 'fa-solid fa-anchor'
    },
    {
        id: 6,
        title: 'Междугородняя перевозка',
        description: 'Надежная доставка автомобиля из Атырау в другие города (Кульсары, Актау, Уральск и др.).',
        price: 'Договорная (от 250 ₸/км)',
        icon: 'fa-solid fa-route'
    }
];

document.addEventListener('DOMContentLoaded', () => {
    loadDynamicServices();
    initOrderForm();
});

// 1. Загрузка услуг из базы данных
async function loadDynamicServices() {
    const container = document.getElementById('servicesContainer');
    const selectEl = document.getElementById('orderService');
    if (!container) return;

    let services = fallbackServices;

    // Если в localStorage сохранены услуги (для тестирования через file:///)
    if (window.location.protocol === 'file:') {
        const saved = localStorage.getItem('local_services');
        if (saved) {
            try {
                services = JSON.parse(saved).filter(s => parseInt(s.is_active) === 1);
            } catch (_) {}
        }
    } else {
        // Получение с реального PHP-сервера
        try {
            const res = await fetch(API_SERVICES);
            const data = await res.json();
            if (data.success && Array.isArray(data.services) && data.services.length > 0) {
                services = data.services;
            }
        } catch (err) {
            console.log('Не удалось загрузить из БД, используются услуги по умолчанию:', err);
        }
    }

    // Обновление сетки услуг
    renderServicesGrid(container, services);

    // Заполнение выпадающего списка в форме
    if (selectEl) {
        selectEl.innerHTML = `
            <option value="">Все услуги / По выбору</option>
            ${services.map(s => `<option value="${s.id}" data-price="${escapeAttr(s.price)}">${escapeHtml(s.title)} (${escapeHtml(s.price)})</option>`).join('')}
        `;
    }
}

function renderServicesGrid(container, services) {
    container.innerHTML = services.map((s, idx) => `
        <div class="card service-card" data-aos="fade-up" data-aos-delay="${(idx % 3 + 1) * 100}">
            <div>
                <div class="icon-box"><i class="${escapeAttr(s.icon || 'fa-solid fa-truck-pickup')}"></i></div>
                <h3>${escapeHtml(s.title)}</h3>
                <p>${escapeHtml(s.description || '')}</p>
            </div>
            <div>
                <div class="service-card-price">
                    <i class="fa-solid fa-tag" style="margin-right: 4px; font-size: 0.9rem;"></i> ${escapeHtml(s.price)}
                </div>
                <button type="button" class="btn-service-order" onclick="selectServiceForOrder(${s.id}, '${escapeAttr(s.title)}')">
                    <i class="fa-solid fa-truck-pickup"></i> Заказать
                </button>
            </div>
        </div>
    `).join('');
}

// 2. Выбор услуги и прокрутка к форме заказа
window.selectServiceForOrder = function(serviceId, serviceTitle) {
    const selectEl = document.getElementById('orderService');
    if (selectEl) {
        selectEl.value = serviceId;
    }
    const orderSection = document.getElementById('orderFormSection');
    if (orderSection) {
        orderSection.scrollIntoView({ behavior: 'smooth' });
    }
    const phoneInput = document.getElementById('orderPhone');
    if (phoneInput) {
        setTimeout(() => phoneInput.focus(), 600);
    }
};

// 3. Обработка формы заказа
function initOrderForm() {
    const form = document.getElementById('towOrderForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('submitOrderBtn');
        const originalBtnText = submitBtn.innerHTML;

        const name = document.getElementById('orderName').value.trim() || 'Клиент';
        const phone = document.getElementById('orderPhone').value.trim();
        const car = document.getElementById('orderCar').value.trim();
        const location = document.getElementById('orderLocation').value.trim();
        const dest = document.getElementById('orderDestination').value.trim();
        const serviceSelect = document.getElementById('orderService');
        const serviceId = serviceSelect ? serviceSelect.value : '';
        const serviceName = serviceSelect && serviceSelect.selectedIndex >= 0 ? serviceSelect.options[serviceSelect.selectedIndex].text : '';
        const notes = document.getElementById('orderNotes').value.trim();

        if (!phone) {
            alert('Пожалуйста, укажите ваш номер телефона!');
            return;
        }

        if (!location) {
            alert('Пожалуйста, укажите ваше местоположение (адрес)!');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Отправка заявки...';

        const payload = {
            name: name,
            phone: phone,
            car_model: car,
            location: location,
            destination: dest,
            service_id: serviceId,
            service_name: serviceName,
            notes: notes
        };

        // Если открыто по протоколу file:///
        if (window.location.protocol === 'file:') {
            setTimeout(() => {
                let saved = localStorage.getItem('local_orders');
                let orders = saved ? JSON.parse(saved) : [];
                payload.id = Date.now();
                payload.client_name = name;
                payload.status = 'new';
                payload.created_at = new Date().toLocaleString('ru-RU');
                orders.unshift(payload);
                localStorage.setItem('local_orders', JSON.stringify(orders));

                form.reset();
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                showOrderSuccessModal();
            }, 600);
            return;
        }

        // Отправка на PHP сервер
        try {
            const res = await fetch(API_ORDER, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;

            if (data.success) {
                form.reset();
                showOrderSuccessModal();
            } else {
                alert('Ошибка: ' + (data.error || 'Не удалось отправить заявку'));
            }
        } catch (err) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            alert('Ошибка связи с сервером: ' + err.message);
        }
    });
}

function showOrderSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.add('active');
    } else {
        alert('Ваш заказ принят! Наш водитель свяжется с вами через 2-3 минуты.');
    }
}

window.closeSuccessModal = function() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.remove('active');
    }
};

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
