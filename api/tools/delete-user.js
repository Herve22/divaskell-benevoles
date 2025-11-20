"use strict";

const path = require("path");
const Database = require("better-sqlite3");

// --- Connexion à la base ---
const DB_PATH = path.resolve(__dirname, "../../data/db.db");
const db = new Database(DB_PATH);

// --- Lecture arguments ---
const arg = process.argv[2];
if (!arg) {
  console.error("Usage: node delete-user.js <id|email>");
  process.exit(1);
}

let info;

// --- Suppression par ID ou email ---
if (/^\d+$/.test(arg)) {
  info = db.prepare("SELECT id, username, email FROM users WHERE id = ?").get(arg);
  if (!info) {
    console.log("❌ Aucun utilisateur avec cet ID");
    process.exit(0);
  }
  db.prepare("DELETE FROM users WHERE id = ?").run(arg);
  console.log(`✅ Utilisateur supprimé (ID ${info.id}, ${info.email})`);
} else {
  info = db.prepare("SELECT id, username, email FROM users WHERE email = ?").get(arg);
  if (!info) {
    console.log("❌ Aucun utilisateur avec cet email");
    process.exit(0);
  }
  db.prepare("DELETE FROM users WHERE email = ?").run(arg);
  console.log(`✅ Utilisateur supprimé (${info.email}, ID ${info.id})`);
}

