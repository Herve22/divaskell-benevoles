"use strict";

require("dotenv").config();
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const path = require("path");

// === Connexion à la base ===
const dbPath = path.join(__dirname, "../../data/db.db");
const db = new Database(dbPath);

// === Création d’un utilisateur ===
async function run() {
  const [,, username, password, role] = process.argv;
  if (!username || !password || !role) {
    console.log("❌ Usage: node api/tools/create-user.js <username> <password> <role>");
    console.log("Exemple: node api/tools/create-user.js admin motdepasse admin");
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, 10);

  try {
    const stmt = db.prepare(`
      INSERT INTO users (username, password, role)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(username, hashed, role);
    console.log(`✅ Utilisateur '${username}' créé avec succès (role=${role}, id=${result.lastInsertRowid})`);
  } catch (e) {
    console.error("❌ Erreur SQL:", e.message);
  } finally {
    db.close();
  }
}

run();
