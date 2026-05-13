const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

// Создаём папку database, если её нет
const dbDir = path.join(__dirname, '../database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(path.join(dbDir, 'database.sqlite'));

const adminPassword = bcrypt.hashSync('admin123', 10);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      isAdmin INTEGER NOT NULL DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      price INTEGER NOT NULL,
      image TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      gameKey TEXT NOT NULL,
      orderDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      total INTEGER NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (productId) REFERENCES products(id)
    )
  `);

  db.get(`SELECT id FROM users WHERE email = ?`, ['admin@joystation.ru'], (err, row) => {
    if (err) {
      console.error('Ошибка проверки администратора:', err);
      return;
    }

    if (!row) {
      db.run(
        `INSERT INTO users (name, email, passwordHash, isAdmin) VALUES (?, ?, ?, ?)`,
        ['Админ', 'admin@joystation.ru', adminPassword, 1],
        (insertErr) => {
          if (insertErr) {
            console.error('Ошибка добавления администратора:', insertErr);
          } else {
            console.log('Админ создан: admin@joystation.ru / admin123');
          }
        }
      );
    }
  });

  db.get(`SELECT id FROM products LIMIT 1`, (err, row) => {
    if (err) {
      console.error('Ошибка проверки товаров:', err);
      return;
    }

    if (!row) {
      const defaultProducts = [
        ["Cyberpunk 2077", 1999, "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=400&q=80"],
        ["GTA V", 999, "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=80"],
        ["Crimson Desert", 999, "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=400&q=80"],
        ["Dying Light: The Beast", 999, "https://images.unsplash.com/photo-1508704019882-f9cf40e475b4?auto=format&fit=crop&w=400&q=80"],
        ["ARC Raiders", 999, "https://images.unsplash.com/photo-1525182008055-f88b95ff7980?auto=format&fit=crop&w=400&q=80"],
        ["HELLDIVERS 2", 999, "https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=400&q=80"],
        ["Death Stranding 2: On the Beach", 999, "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=80"]
      ];

      const stmt = db.prepare(`INSERT INTO products (title, price, image) VALUES (?, ?, ?)`);
      defaultProducts.forEach((product) => stmt.run(product));
      stmt.finalize();
      console.log('Добавлены стандартные продукты.');
    }
  });
});

module.exports = db;
