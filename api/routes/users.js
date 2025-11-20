
// api/routes/users_v2.js — Enhanced CRUD + extras (keeps original behavior)
// NOTE: mount under a different path to avoid overwriting existing routes.
// Example in app.js:
//   app.use("/api/users-v2", require("./routes/users_v2"));
"use strict";

const express = require("express");
const router = express.Router();
const { db } = require("../lib/db");
const bcrypt = require("bcryptjs");

// --- middleware: simple admin/superadmin guard (non-intrusive) ---
function requireAdmin(req, res, next) {
  try {
    // Expect req.user injected by your auth middleware
    const role = req?.user?.role || req?.auth?.user?.role;
    if (role === "admin" || role === "superadmin") return next();
    return res.status(403).json({ ok: false, error: "forbidden" });
  } catch (e) {
    return res.status(403).json({ ok: false, error: "forbidden" });
  }
}

// --- small helpers ---
function pick(o, keys) {
  const out = {};
  for (const k of keys) if (k in o) out[k] = o[k];
  return out;
}
function sanitizeEmail(v) {
  return String(v || "").trim().toLowerCase();
}
function nowISO() { return new Date().toISOString(); }

router.use((req, _res, next) => {
  console.log(`[users_v2] ${req.method} ${req.originalUrl}`);
  next();
});

// ========== ORIGINAL BEHAVIOR CLONE ==========
// GET all users
router.get("/", requireAdmin, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, username, email, role, is_active, created_at
      FROM users
      ORDER BY id DESC
    `).all();
    res.json({ ok: true, users: rows });
  } catch (err) {
    console.error("[users_v2/get]", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

// GET single user
router.get("/:id", requireAdmin, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, username, email, role, is_active, created_at
      FROM users WHERE id = ?
    `).get(req.params.id);
    if (!user) return res.status(404).json({ ok: false, error: "user not found" });
    res.json({ ok: true, user });
  } catch (err) {
    console.error("[users_v2/get/:id]", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

// CREATE user
router.post("/", requireAdmin, async (req, res) => {
  try {
    const { username, email, password, role = "user" } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ ok: false, error: "missing fields" });
    }
    const normEmail = sanitizeEmail(email);
    const exists = db.prepare("SELECT id FROM users WHERE email=?").get(normEmail);
    if (exists) return res.status(409).json({ ok: false, error: "email already used" });

    const hash = await bcrypt.hash(password, 10);
    const stmt = db.prepare(`
      INSERT INTO users (username, email, password, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))
    `);
    const now = nowISO();
    const result = stmt.run(username, normEmail, hash, role, now, now);

    const user = db.prepare(`
      SELECT id, username, email, role, is_active, created_at
      FROM users WHERE id = ?
    `).get(result.lastInsertRowid);
    res.json({ ok: true, user });
  } catch (err) {
    console.error("[users_v2/post]", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

// UPDATE user
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const existing = db.prepare("SELECT * FROM users WHERE id=?").get(id);
    if (!existing) return res.status(404).json({ ok: false, error: "user not found" });

    const { username, email, password, role } = req.body || {};
    const hash = password ? await bcrypt.hash(password, 10) : existing.password;
    const normEmail = email ? sanitizeEmail(email) : existing.email;

    db.prepare(`
      UPDATE users SET username=?, email=?, password=?, role=?, updated_at=COALESCE(?, datetime('now'))
      WHERE id=?
    `).run(
      username || existing.username,
      normEmail,
      hash,
      role || existing.role,
      nowISO(),
      id
    );

    const user = db.prepare(`
      SELECT id, username, email, role, is_active FROM users WHERE id=?
    `).get(id);
    res.json({ ok: true, user });
  } catch (err) {
    console.error("[users_v2/put]", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

// DELETE user
router.delete("/:id", requireAdmin, (req, res) => {
  try {
    const info = db.prepare("DELETE FROM users WHERE id=?").run(req.params.id);
    if (!info.changes) return res.status(404).json({ ok: false, error: "user not found" });
    res.json({ ok: true, deleted_id: req.params.id });
  } catch (err) {
    console.error("[users_v2/delete]", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

// PATCH active
router.patch("/:id/active", requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { is_active } = req.body || {};
    if (typeof is_active === "undefined") {
      return res.json({ ok: false, error: "missing is_active" });
    }
    const result = db.prepare("UPDATE users SET is_active=?, updated_at=COALESCE(?, datetime('now')) WHERE id=?")
      .run(is_active ? 1 : 0, nowISO(), id);
    if (!result.changes) return res.json({ ok: false, error: "user not found" });

    const user = db.prepare("SELECT id, username, email, role, is_active FROM users WHERE id=?").get(id);
    res.json({ ok: true, user });
  } catch (err) {
    console.error("[users_v2/patch active]", err);
    res.json({ ok: false, error: err.message });
  }
});

// ========== NEW ENDPOINTS (non-breaking) ==========

// GET /api/users-v2/search?q=...&limit=50&offset=0
router.get("/search/q", requireAdmin, (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);
    const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);

    if (!q) return res.json({ ok: true, users: [], total: 0 });
    const like = `%${q.replace(/[%_]/g, s => "\\" + s)}%`;

    const stmt = db.prepare(`
      SELECT id, username, email, role, is_active, created_at
      FROM users
      WHERE username LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\'
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `);
    const users = stmt.all(like, like, limit, offset);
    const total = db.prepare(`
      SELECT COUNT(*) as n
      FROM users
      WHERE username LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\'
    `).get(like, like).n;

    res.json({ ok: true, users, total, limit, offset, q });
  } catch (err) {
    console.error("[users_v2/search]", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

// PATCH /:id/password — change only password
router.patch("/:id/password", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ ok: false, error: "missing password" });
    const user = db.prepare("SELECT id FROM users WHERE id=?").get(id);
    if (!user) return res.status(404).json({ ok: false, error: "user not found" });

    const hash = await bcrypt.hash(password, 10);
    db.prepare("UPDATE users SET password=?, updated_at=COALESCE(?, datetime('now')) WHERE id=?")
      .run(hash, nowISO(), id);
    res.json({ ok: true });
  } catch (err) {
    console.error("[users_v2/patch password]", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

// PATCH /:id/role — change role
router.patch("/:id/role", requireAdmin, (req, res) => {
  try {
    const id = req.params.id;
    const { role } = req.body || {};
    if (!role) return res.status(400).json({ ok: false, error: "missing role" });
    const allowed = new Set(["user", "admin", "superadmin"]);
    if (!allowed.has(role)) return res.status(400).json({ ok: false, error: "invalid role" });

    const info = db.prepare("UPDATE users SET role=?, updated_at=COALESCE(?, datetime('now')) WHERE id=?")
      .run(role, nowISO(), id);
    if (!info.changes) return res.status(404).json({ ok: false, error: "user not found" });

    const user = db.prepare("SELECT id, username, email, role, is_active FROM users WHERE id=?").get(id);
    res.json({ ok: true, user });
  } catch (err) {
    console.error("[users_v2/patch role]", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

// GET /stats — counts per role and totals
router.get("/stats/basic", requireAdmin, (_req, res) => {
  try {
    const total = db.prepare("SELECT COUNT(*) as n FROM users").get().n;
    const byRole = db.prepare("SELECT role, COUNT(*) as n FROM users GROUP BY role ORDER BY role").all();
    const active = db.prepare("SELECT COUNT(*) as n FROM users WHERE is_active=1").get().n;
    res.json({ ok: true, total, active, byRole });
  } catch (err) {
    console.error("[users_v2/stats]", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

// POST /bulk — create multiple users at once
router.post("/bulk", requireAdmin, async (req, res) => {
  try {
    const entries = Array.isArray(req.body) ? req.body : [];
    if (!entries.length) return res.status(400).json({ ok: false, error: "empty payload" });

    const created = [];
    const errors = [];
    const insert = db.prepare(`
      INSERT INTO users (username, email, password, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))
    `);

    const now = nowISO();
    for (let i = 0; i < entries.length; i++) {
      const row = entries[i] || {};
      try {
        const username = row.username;
        const email = sanitizeEmail(row.email);
        const role = row.role || "user";
        const pwd  = row.password || Math.random().toString(36).slice(2,10);
        if (!username || !email) throw new Error("missing username/email");
        const exists = db.prepare("SELECT id FROM users WHERE email=?").get(email);
        if (exists) throw new Error("email already used");
        const hash = await bcrypt.hash(pwd, 10);
        const resu = insert.run(username, email, hash, role, now, now);
        created.push({ id: resu.lastInsertRowid, username, email, role });
      } catch (e) {
        errors.push({ index: i, email: row?.email, error: e.message });
      }
    }
    res.json({ ok: true, created_count: created.length, created, errors });
  } catch (err) {
    console.error("[users_v2/bulk]", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

// GET /export.csv — small CSV export
router.get("/export.csv", requireAdmin, (_req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, username, email, role, is_active, created_at
      FROM users ORDER BY id DESC
    `).all();
    const header = "id,username,email,role,is_active,created_at\n";
    const csv = header + rows.map(r => {
      const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      return [r.id, r.username, r.email, r.role, r.is_active, r.created_at].map(esc).join(",");
    }).join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=users_export.csv");
    res.send(csv);
  } catch (err) {
    console.error("[users_v2/export.csv]", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

module.exports = router;
