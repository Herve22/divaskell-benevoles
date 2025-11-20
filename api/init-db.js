// init-db.js — initialise db.db avec table users + admin par défaut
"use strict";

const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const dbFile = path.join(__dirname, "db.db");

// Si le fichier existe déjà, on l'efface (optionnel)
if (fs.existsSync(dbFile)) {
  console.log("⚠️ db.db déjà présent, suppression...");
  fs.unlinkSync(dbFile);
}

const db = new sqlite3.Database(dbFile);

db.serialize(() => {
  // Création table
  db.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'user'
    )
  `);

  // Insertion d'un utilisateur admin par défaut
  db.run(
    `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`,
    ["admin", "test123", "admin"],
    function (err) {
      if (err) console.error("Erreur insertion:", err.message);
      else console.log("✅ Admin inséré avec id:", this.lastID);
    }
  );
});

db.close(() => {
  console.log("🎉 Base db.db initialisée !");
});
