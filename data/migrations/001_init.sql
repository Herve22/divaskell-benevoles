CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Créer un admin par défaut (mot de passe: admin123)
INSERT OR IGNORE INTO users (username, password, role) 
VALUES ('admin', '$2a$10$xQkZv.xLqY4b8F8VXZ7qYeZ3GxYqY7qYVPvKvxq7qYVPvKvxq7qY', 'admin');