"use strict";
const path = require("path");
const fs   = require("fs");
const Database = require("better-sqlite3");
 
const APP_ROOT = path.resolve(__dirname, "..", "..");
const DATA_DIR = path.join(APP_ROOT, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "db.db");
const db = new Database(DB_PATH);

function migrate() {
  const migDir = path.join(DATA_DIR, "migrations");
  if (!fs.existsSync(migDir)) return;
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    id TEXT PRIMARY KEY,
    applied_at TEXT DEFAULT (datetime('now'))
  )`);
  const files = fs.readdirSync(migDir).filter(f => f.endsWith(".sql")).sort();
  for (const f of files) {
    const exists = db.prepare("SELECT 1 FROM _migrations WHERE id=?").get(f);
    if (exists) continue;
    const sql = fs.readFileSync(path.join(migDir, f), "utf8");
    db.exec(sql);
    db.prepare("INSERT INTO _migrations (id) VALUES (?)").run(f);
    console.log("[db] migrated", f);
  }
}

module.exports = { db, migrate, APP_ROOT, DATA_DIR, DB_PATH };
 