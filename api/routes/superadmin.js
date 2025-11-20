//superadmin.js
"use strict";
const express = require("express");
const router = express.Router();
const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "../../data/db.db"));

// Middleware de sécurité : vérifie le rôle (si requireAuth est monté avant)
router.use((req, res, next) => {
  if (!req.user || req.user.role !== "superadmin") {
    return res.status(403).json({ ok: false, error: "forbidden" });
  }
  next();
});


// =====================================================
// 🧩 Exécution SQL libre (lecture ou écriture)
// =====================================================
router.post("/sql", (req, res) => {
  try {
    const { sql, readOnly } = req.body;
    if (!sql) return res.json({ ok: false, error: "missing sql" });

    console.log("[superadmin/sql]", sql);

    if (readOnly) {
      const rows = db.prepare(sql).all();
      return res.json({ ok: true, rows });
    } else {
      const result = db.prepare(sql).run();
      return res.json({ ok: true, changes: result.changes });
    }
  } catch (err) {
    console.error("[superadmin/sql]", err.message);
    res.json({ ok: false, error: err.message });
  }
});


// Lecture SQL
router.post("/read", (req, res) => {
  const { sql } = req.body;
  if (!sql) return res.status(400).json({ ok: false, error: "missing sql" });

  try {
    const rows = db.prepare(sql).all();
    res.json({ ok: true, rows });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// Écriture SQL
router.post("/write", (req, res) => {
  const { sql } = req.body;
  if (!sql) return res.status(400).json({ ok: false, error: "missing sql" });

  try {
    const stmt = db.prepare(sql);
    const result = stmt.run();
    res.json({ ok: true, changes: result.changes });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

module.exports = router;
