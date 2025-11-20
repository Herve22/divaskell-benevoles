"use strict";

const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = path.resolve(__dirname, "../../data/db.db");
const db = new Database(DB_PATH);

try {
  const users = db.prepare("SELECT id, username, email, role FROM users ORDER BY id").all();
  if (users.length === 0) {
    console.log("Aucun utilisateur trouvé dans la table 'users'.");
  } else {
    console.table(users);
  }
} catch (err) {
  console.error("Erreur lors de la lecture des utilisateurs :", err);
}
