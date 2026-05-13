const API_BASE = 'http://localhost:3000/api';

let cart = JSON.parse(localStorage.getItem("cart")) || [];

function getToken() {
  const token = localStorage.getItem('token');
  console.log('🔑 getToken():', token ? '✅ Токен найден' : '❌ Токена нет');
  return token;
}

function setToken(token) {
  console.log('💾 setToken():', token ? '✅ Сохраняю токен' : '❌ Пустой токен');
  localStorage.setItem('token', token);
  console.log('✔️ Проверка:', localStorage.getItem('token') ? 'Успешно сохранено' : 'ОШИБКА сохранения');
}

function removeToken() {
  localStorage.removeItem('token');
  console.log('🗑️ Токен удален');
}

function base64UrlDecode(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = base64 + (pad ? '='.repeat(4 - pad) : '');
  const decoded = atob(padded);

  try {
    return decodeURIComponent(decoded.split('').map(c => {
      const code = c.charCodeAt(0).toString(16).toUpperCase();
      return '%' + ('00' + code).slice(-2);
    }).join(''));
  } catch (e) {
    return decoded;
  }
}

function getCurrentUser() {
  const token = getToken();
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return payload;
  } catch (e) {
    console.error('Ошибка декодирования токена:', e);
    return null;
  }
}

function ensureAdminAccount() {
  // Админ теперь создаётся в базе данных
}

function getUsers() {
  // Теперь через API
  return [];
}

function saveUsers(users) {
  // Теперь через API
}

function getProducts() {
  return fetch(`${API_BASE}/products`)
    .then(response => response.json())
    .catch(error => {
      console.error('Ошибка загрузки продуктов:', error);
      return [];
    });
}

function saveProducts(products) {
  // Теперь через API
}

ensureAdminAccount();

function handleLogout(event) {
  event.preventDefault();
  removeToken();
  localStorage.removeItem("currentUser");
  alert("Вы вышли из аккаунта!");
  window.location.href = "index.html";
}

function updateUserInfo() {
  const currentUser = getCurrentUser();
  console.log('👤 getCurrentUser() returned:', currentUser);
  
  const userName = document.getElementById("userName");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginBtn = document.getElementById("loginBtn");
  const adminLink = document.getElementById("adminLink");

  if (currentUser) {
    const displayName = currentUser.name || "Пользователь";
    console.log('📝 Отображаем имя:', displayName, 'Тип:', typeof displayName);
    if (userName) {
      userName.textContent = "Привет, " + displayName + "!";
      console.log('✅ Имя установлено в DOM');
    }
    if (logoutBtn) logoutBtn.style.display = "block";
    if (loginBtn) loginBtn.style.display = "none";
    if (adminLink) adminLink.style.display = currentUser.isAdmin ? "inline-flex" : "none";
  } else {
    console.log('⚠️ Нет авторизованного пользователя');
    if (userName) userName.textContent = "";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (loginBtn) loginBtn.style.display = "block";
    if (adminLink) adminLink.style.display = "none";
  }
}

// Запускаем обновление пользователя при загрузке страницы
document.addEventListener("DOMContentLoaded", updateUserInfo);
window.addEventListener("load", updateUserInfo);

function addToCart(id) {
  getProducts().then(products => {
    const product = products.find(p => p.id === id);
    if (product) {
      cart.push(product);
      localStorage.setItem("cart", JSON.stringify(cart));
      alert("Товар добавлен!");
    } else {
      alert("Товар не найден!");
    }
  }).catch(error => {
    console.error('Ошибка добавления в корзину:', error);
    alert("Ошибка добавления товара в корзину");
  });
}

function processCheckout() {
  const token = getToken();
  console.log('📋 Токен при оформлении:', token ? 'Есть' : 'НЕТ ТОКЕНА');
  
  if (!token) {
    alert("Вы не авторизованы. Перенаправляю на вход...");
    window.location.href = "login.html";
    return;
  }

  if (cart.length === 0) {
    alert("Корзина пуста!");
    window.location.href = "cart.html";
    return;
  }

  console.log('📤 Отправляем заказ с товарами:', cart.length);

  // Отправляем заказ на сервер
  fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ cartItems: cart })
  })
  .then(response => {
    console.log('📥 Ответ сервера:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('✅ Данные ответа:', data);
    
    if (data.orders && data.message) {
      // Скрываем форму оформления
      document.getElementById('checkoutContent').style.display = 'none';
      
      // Показываем сообщение об успехе
      const successMsg = document.getElementById('successMessage');
      successMsg.style.display = 'block';
      
      // Выводим полученные ключи
      const keysDisplay = document.getElementById('keysDisplay');
      keysDisplay.innerHTML = '<h3 style="color: #0abdc6;">Ваши игровые ключи:</h3>';
      
      data.orders.forEach(order => {
        keysDisplay.innerHTML += `
          <div style="background: rgba(10,189,198,0.2); padding: 15px; margin: 10px 0; border-radius: 8px; text-align: left;">
            <p style="margin: 5px 0; color: #8bf0ff; font-weight: bold;">${order.productTitle}</p>
            <p style="margin: 5px 0; color: #0abdc6; font-size: 18px; font-weight: bold; font-family: monospace;">${order.gameKey}</p>
            <p style="margin: 5px 0; color: #999; font-size: 12px;">Цена: ${order.price} ₽</p>
          </div>
        `;
      });
      
      keysDisplay.innerHTML += `
        <hr style="border: none; border-top: 1px solid rgba(139,240,255,0.3); margin: 20px 0;">
        <p style="color: #0abdc6; font-weight: bold;">Итого: ${data.total} ₽</p>
      `;
      
      // Очищаем корзину
      localStorage.removeItem("cart");
      cart = [];
    } else {
      console.error('❌ Ошибка в ответе:', data);
      alert(data.message || "Ошибка оформления заказа");
    }
  })
  .catch(error => {
    console.error('❌ Ошибка сети:', error);
    alert("Ошибка при обработке заказа. Проверьте, что сервер запущен.");
  });
}

function displayCartOnCheckout() {
  const summary = document.getElementById('cartSummary');
  if (!summary) return;
  
  if (cart.length === 0) {
    summary.innerHTML = '<p style="color: #ea00d9;">Ваша корзина пуста. <a href="catalog.html">Вернуться в каталог</a></p>';
    document.getElementById('checkoutContent').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
    return;
  }
  
  summary.innerHTML = '<h3 style="color: #0abdc6;">Товары в заказе:</h3>';
  let total = 0;
  
  cart.forEach(item => {
    total += item.price;
    summary.innerHTML += `
      <div style="background: rgba(139,240,255,0.1); padding: 10px; margin: 5px 0; border-radius: 8px;">
        <strong>${item.title}</strong> — ${item.price} ₽
      </div>
    `;
  });
  
  summary.innerHTML += `
    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(139,240,255,0.3);">
      <p style="color: #0abdc6; font-weight: bold; font-size: 18px;">Итого: ${total} ₽</p>
    </div>
  `;
}

// Показываем корзину при загрузке страницы оформления
if (document.location.pathname.includes('checkout')) {
  document.addEventListener('DOMContentLoaded', displayCartOnCheckout);
}

function checkout() {
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;

  if (!name || !email) {
    alert("Заполните все поля!");
    return;
  }

  localStorage.removeItem("cart");

  alert("Заказ оформлен!");
  window.location.href = "index.html";
}

function removeFromCart(index) {
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
}

function renderCart() {
  const container = document.getElementById("cart");
  if (!container) return;

  container.innerHTML = "";

  let total = 0;

  cart.forEach((item, index) => {
    total += item.price;

    container.innerHTML += `
      <div class="card">
        <h3>${item.title}</h3>
        <p>${item.price} ₽</p>
        <button onclick="removeFromCart(${index})">Удалить</button>
      </div>
    `;
  });

  container.innerHTML += `
    <h2>Итого: ${total} ₽</h2>
    <a href="checkout.html">
      <button>Перейти к оформлению</button>
    </a>
  `;
}

function hideLoader() {
  const loader = document.getElementById("loader");
  if (loader) {
    loader.classList.add("fade-out");
    setTimeout(() => {
      loader.style.display = "none";
    }, 500);
  }
}

function animateProgressBar() {
  const progressBar = document.getElementById("progress-bar");
  if (!progressBar) return;

  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 30;
    if (progress > 90) {
      progress = 90;
    }
    progressBar.style.width = progress + "%";
    if (progress >= 90) {
      clearInterval(interval);
    }
  }, 200);

  // Завершаем на 100% через 1.5 секунды
  setTimeout(() => {
    clearInterval(interval);
    progressBar.style.width = "100%";
  }, 1500);
}

// Запускаем прогресс-бар сразу
animateProgressBar();

// Скрываем прелоадер только после полной загрузки страницы
window.addEventListener("load", () => {
  setTimeout(hideLoader, 1500);
});

// Резервное скрытие через 4 секунды, если загрузка виснет
setTimeout(() => {
  if (document.getElementById("loader")) {
    hideLoader();
  }
}, 4000);