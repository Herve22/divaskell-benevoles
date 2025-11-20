"use strict";

const express = require("express");
const router = express.Router();
const { db } = require("../lib/db");
const { requireAuth, requireAdmin } = require("../middlewares/auth");

// === Liste événements (accessible à tous les users connectés) ===
router.get("/", requireAuth, (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM evenements ORDER BY date_debut DESC").all();
    res.json(rows);
  } catch (e) {
    console.error("[evenements/list]", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// === Détails événement (accessible à tous les users connectés) ===
router.get("/:id", requireAuth, (req, res) => {
  try {
    const row = db.prepare("SELECT * FROM evenements WHERE id=?").get(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: "Not found" });
    res.json(row);
  } catch (e) {
    console.error("[evenements/get]", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// === Create (admin uniquement) ===
router.post("/", requireAuth, requireAdmin, (req, res) => {
  try {
    const { nom, description, lieu, date_debut, date_fin, responsable_id, statut } = req.body;
    
    if (!nom) {
      return res.status(400).json({ ok: false, error: "Le nom est obligatoire" });
    }

    const stmt = db.prepare(`
      INSERT INTO evenements (nom, description, lieu, date_debut, date_fin, responsable_id, statut)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      nom,
      description || null,
      lieu || null,
      date_debut || null,
      date_fin || null,
      responsable_id || null,
      statut || 'brouillon'
    );

    const created = db.prepare("SELECT * FROM evenements WHERE id=?").get(info.lastInsertRowid);
    res.json({ ok: true, evenement: created });
  } catch (e) {
    console.error("[evenements/create]", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// === Update (admin uniquement) ===
router.put("/:id", requireAuth, requireAdmin, (req, res) => {
  try {
    const existing = db.prepare("SELECT * FROM evenements WHERE id=?").get(req.params.id);
    if (!existing) return res.status(404).json({ ok: false, error: "Not found" });

    const { nom, description, lieu, date_debut, date_fin, responsable_id, statut } = req.body;

    const stmt = db.prepare(`
      UPDATE evenements 
      SET nom=?, description=?, lieu=?, date_debut=?, date_fin=?, responsable_id=?, statut=?
      WHERE id=?
    `);

    stmt.run(
      nom !== undefined ? nom : existing.nom,
      description !== undefined ? description : existing.description,
      lieu !== undefined ? lieu : existing.lieu,
      date_debut !== undefined ? date_debut : existing.date_debut,
      date_fin !== undefined ? date_fin : existing.date_fin,
      responsable_id !== undefined ? responsable_id : existing.responsable_id,
      statut !== undefined ? statut : existing.statut,
      req.params.id
    );

    const updated = db.prepare("SELECT * FROM evenements WHERE id=?").get(req.params.id);
    res.json({ ok: true, evenement: updated });
  } catch (e) {
    console.error("[evenements/update]", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// === Delete (admin uniquement) ===
router.delete("/:id", requireAuth, requireAdmin, (req, res) => {
  try {
    const result = db.prepare("DELETE FROM evenements WHERE id=?").run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ ok: false, error: "Not found" });
    }
    res.json({ ok: true, deleted_id: req.params.id });
  } catch (e) {
    console.error("[evenements/delete]", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// === Groupes liés à un événement (accessible à tous) ===
router.get("/:id/groupes", requireAuth, (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM groupes WHERE evenement_id=?").all(req.params.id);
    res.json(rows);
  } catch (e) {
    console.error("[evenements/groupes]", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;