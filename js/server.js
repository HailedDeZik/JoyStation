const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'joystation_secret_key';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));
app.use(express.static(path.join(__dirname, '../html')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../html/index.html'));
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  console.log('\n🔐 === ПРОВЕРКА ТОКЕНА ===');
  console.log('Authorization заголовок:', authHeader ? authHeader.substring(0, 40) + '...' : 'НЕТ');
  
  const token = authHeader && authHeader.split(' ')[1];
  console.log('Извлечён токен:', token ? token.substring(0, 30) + '...' : 'НЕТ');

  if (!token) {
    console.error('❌ Ошибка: токен не передан');
    return res.status(401).json({ message: 'Токен не найден' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('❌ Ошибка верификации JWT:', err.message);
      console.log('JWT_SECRET на сервере:', JWT_SECRET);
      return res.status(403).json({ message: 'Неверный токен - ' + err.message });
    }
    console.log('✅ Токен верный, пользователь:', user.email);
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: 'Требуются права администратора' });
  }
  next();
}

app.get('/api/products', (req, res) => {
  db.all('SELECT id, title, price, image FROM products', (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'Ошибка базы данных' });
    }
    res.json(rows);
  });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Заполните все поля' });
  }

  db.get('SELECT id FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Ошибка базы данных' });
    }
    if (user) {
      return res.status(409).json({ message: 'Пользователь уже зарегистрирован' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    db.run(
      'INSERT INTO users (name, email, passwordHash, isAdmin) VALUES (?, ?, ?, 0)',
      [name, email, passwordHash],
      function (insertErr) {
        if (insertErr) {
          return res.status(500).json({ message: 'Ошибка при создании пользователя' });
        }

        const token = jwt.sign({ id: this.lastID, name, email, isAdmin: 0 }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: this.lastID, name, email, isAdmin: 0 } });
      }
    );
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Заполните все поля' });
  }

  db.get('SELECT id, name, email, passwordHash, isAdmin FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Ошибка базы данных' });
    }
    if (!user) {
      return res.status(401).json({ message: 'Неверные данные' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Неверные данные' });
    }

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin } });
  });
});

app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
  db.all('SELECT id, name, email, isAdmin FROM users', (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'Ошибка базы данных' });
    }
    res.json(rows);
  });
});

app.post('/api/products', authenticateToken, requireAdmin, (req, res) => {
  const { title, price, image } = req.body;
  if (!title || !price || !image) {
    return res.status(400).json({ message: 'Заполните все поля' });
  }

  db.run('INSERT INTO products (title, price, image) VALUES (?, ?, ?)', [title, price, image], function (err) {
    if (err) {
      return res.status(500).json({ message: 'Ошибка базы данных' });
    }
    res.json({ id: this.lastID, title, price, image });
  });
});

app.delete('/api/products/:id', authenticateToken, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  db.run('DELETE FROM products WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ message: 'Ошибка базы данных' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Товар не найден' });
    }
    res.json({ message: 'Товар удалён' });
  });
});

app.put('/api/products/:id', authenticateToken, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { title, price, image } = req.body;

  if (!title || !price || !image) {
    return res.status(400).json({ message: 'Заполните все поля' });
  }

  db.run(
    'UPDATE products SET title = ?, price = ?, image = ? WHERE id = ?',
    [title, price, image, id],
    function (err) {
      if (err) {
        return res.status(500).json({ message: 'Ошибка базы данных' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: 'Товар не найден' });
      }
      res.json({ id, title, price, image });
    }
  );
});

// Удаление пользователя
app.delete('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const userId = Number(req.params.id);
  console.log('\n🗑️ === УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ ===');
  console.log('ID пользователя:', userId);
  console.log('ID админа:', req.user.id);
  
  if (userId === req.user.id) {
    return res.status(400).json({ message: 'Нельзя удалить свой аккаунт' });
  }

  db.run('DELETE FROM users WHERE id = ?', [userId], function (err) {
    if (err) {
      return res.status(500).json({ message: 'Ошибка базы данных' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    console.log('✅ Пользователь', userId, 'удалён');
    res.json({ message: 'Пользователь удалён' });
  });
});

// Выдача прав администратора
app.put('/api/users/:id/admin', authenticateToken, requireAdmin, (req, res) => {
  const userId = Number(req.params.id);
  const { isAdmin } = req.body;
  console.log('\n👑 === ИЗМЕНЕНИЕ ПРАВ ===');
  console.log('ID пользователя:', userId);
  console.log('Новое значение isAdmin:', isAdmin);
  
  if (userId === req.user.id && !isAdmin) {
    return res.status(400).json({ message: 'Нельзя отобрать свои права администратора' });
  }

  db.run('UPDATE users SET isAdmin = ? WHERE id = ?', [isAdmin ? 1 : 0, userId], function (err) {
    if (err) {
      return res.status(500).json({ message: 'Ошибка базы данных' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    console.log('✅ Статус пользователя', userId, 'изменён на isAdmin:', isAdmin);
    res.json({ message: isAdmin ? 'Права администратора выданы' : 'Права администратора отобраны' });
  });
});

// Функция генерации игрового ключа (15 символов)
function generateGameKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  for (let i = 0; i < 15; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key.match(/.{1,5}/g).join('-'); // XXXXX-XXXXX-XXXXX
}

// Оформление заказа (фейк оплата)
app.post('/api/orders', authenticateToken, (req, res) => {
  const { cartItems } = req.body;
  const userId = req.user.id;
  const userName = req.user.name;
  const userEmail = req.user.email;

  if (!cartItems || cartItems.length === 0) {
    return res.status(400).json({ message: 'Корзина пуста' });
  }

  // Имитация обработки платежа (фейк оплата)
  const totalAmount = cartItems.reduce((sum, item) => sum + item.price, 0);
  console.log(`\n💳 ФЕЙК ПЛАТЁЖ: ${totalAmount} ₽ от ${userName} (${userEmail})`);

  // Создаём заказы для каждого товара
  const orders = [];
  let processedCount = 0;

  cartItems.forEach((product) => {
    const gameKey = generateGameKey();
    db.run(
      'INSERT INTO orders (userId, productId, gameKey, total) VALUES (?, ?, ?, ?)',
      [userId, product.id, gameKey, product.price],
      function (err) {
        if (err) {
          console.error('Ошибка создания заказа:', err);
        } else {
          orders.push({
            orderId: this.lastID,
            productTitle: product.title,
            gameKey: gameKey,
            price: product.price
          });
          processedCount++;

          // Если все товары обработаны, отправляем ответ
          if (processedCount === cartItems.length) {
            console.log(`✅ Заказ #${orders[0]?.orderId} успешно оформлен`);
            res.json({
              message: 'Заказ успешно оформлен! Спасибо за покупку!',
              orders: orders,
              total: totalAmount
            });
          }
        }
      }
    );
  });
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
