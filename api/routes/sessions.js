"use strict";

/**
 * /api/sessions — gestion simple des sessions actives
 * Simule une mémoire locale (pas de Redis nécessaire)
 */

const express = require("express");
const router = express.Router();

const sessions = new Map(); // clé: idSession => objet session

// === Middleware log ===
router.use((req, _res, next) => {
  console.log(`[sessions.js] ${req.method} ${req.originalUrl}`);
  next();
});

// --- GET /api/sessions ---
// Liste toutes les sessions connues
router.get("/", (req, res) => {
  try {
    const arr = Array.from(sessions.values());
    res.json({ ok: true, sessions: arr });
  } catch (e) {
    console.error("[sessions/get]", e);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

// --- POST /api/sessions (création simulée)
// Permet d'ajouter une session manuellement (pour test)
router.post("/", (req, res) => {
  try {
    const { username, role, ip, userAgent } = req.body || {};
    const id = Math.random().toString(36).substring(2, 10);
    const now = new Date().toISOString();
    const sess = {
      id,
      username: username || "inconnu",
      role: role || "user",
      ip: ip || req.ip,
      userAgent: userAgent || req.headers["user-agent"] || "—",
      createdAt: now,
      lastSeen: now,
      revoked: false,
    };
    sessions.set(id, sess);
    res.json({ ok: true, session: sess });
  } catch (e) {
    console.error("[sessions/post]", e);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

// --- DELETE /api/sessions/:id ---
// Supprime une session précise
router.delete("/:id", (req, res) => {
  try {
    const id = req.params.id;
    if (!sessions.has(id)) return res.status(404).json({ ok: false, error: "not_found" });
    sessions.delete(id);
    res.json({ ok: true, deleted: id });
  } catch (e) {
    console.error("[sessions/delete]", e);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

// --- POST /api/sessions/:id/kill ---
// Variante POST pour supprimer une session (fallback)
router.post("/:id/kill", (req, res) => {
  try {
    const id = req.params.id;
    if (!sessions.has(id)) return res.status(404).json({ ok: false, error: "not_found" });
    sessions.delete(id);
    res.json({ ok: true, killed: id });
  } catch (e) {
    console.error("[sessions/kill]", e);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

// --- POST /api/sessions/kill-others ---
// Supprime toutes les sessions sauf celle de l'appelant (simulé)
router.post("/kill-others", (req, res) => {
  try {
    // Simule une session "en cours" à garder
    const myId = req.headers["x-session-id"] || "myself";
    let killed = 0;
    for (const [id] of sessions) {
      if (id !== myId) {
        sessions.delete(id);
        killed++;
      }
    }
    res.json({ ok: true, killed });
  } catch (e) {
    console.error("[sessions/kill-others]", e);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

module.exports = router;
