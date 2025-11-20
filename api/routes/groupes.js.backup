"use strict";
const express = require("express");
const router = express.Router();
const { db } = require("../lib/db");

// === GET ALL GROUPES ===
router.get("/", (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT g.id, g.nom, g.description, g.contact_email, g.contact_tel, 
             g.evenement_id, g.created_at,
             u.username AS responsable,
             e.nom AS evenement_nom
      FROM groupes g
      LEFT JOIN users u ON g.responsable_id = u.id
      LEFT JOIN evenements e ON g.evenement_id = e.id
      ORDER BY g.id DESC
    `).all();
    res.json({ ok: true, groupes: rows });
  } catch (e) {
    console.error("[groupes/get]", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// === GET ONE GROUPE ===
router.get("/:id", (req, res) => {
  try {
    const row = db.prepare(`
      SELECT g.*, u.username AS responsable, e.nom AS evenement_nom
      FROM groupes g
      LEFT JOIN users u ON g.responsable_id = u.id
      LEFT JOIN evenements e ON g.evenement_id = e.id
      WHERE g.id = ?
    `).get(req.params.id);
    
    if (!row) {
      return res.status(404).json({ ok: false, error: "Groupe non trouvé" });
    }
    res.json({ ok: true, groupe: row });
  } catch (e) {
    console.error("[groupes/get/:id]", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// === CREATE GROUP ===
router.post("/", (req, res) => {
  const { 
    nom, 
    description = "", 
    contact_email = "", 
    contact_tel = "", 
    evenement_id = null,
    responsable_id = null 
  } = req.body;
  
  if (!nom) {
    return res.status(400).json({ ok: false, error: "Nom requis" });
  }
  
  try {
    const stmt = db.prepare(`
      INSERT INTO groupes (nom, description, contact_email, contact_tel, evenement_id, responsable_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(nom, description, contact_email, contact_tel, evenement_id, responsable_id);
    const inserted = db.prepare("SELECT * FROM groupes WHERE id=?").get(result.lastInsertRowid);
    res.json({ ok: true, groupe: inserted });
  } catch (e) {
    console.error("[groupes/post]", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// === UPDATE GROUP ===
router.put("/:id", (req, res) => {
  const { nom, description, contact_email, contact_tel, evenement_id, responsable_id } = req.body;
  
  try {
    const stmt = db.prepare(`
      UPDATE groupes SET
        nom = COALESCE(?, nom),
        description = COALESCE(?, description),
        contact_email = COALESCE(?, contact_email),
        contact_tel = COALESCE(?, contact_tel),
        evenement_id = COALESCE(?, evenement_id),
        responsable_id = COALESCE(?, responsable_id)
      WHERE id = ?
    `);
    stmt.run(nom, description, contact_email, contact_tel, evenement_id, responsable_id, req.params.id);
    
    const updated = db.prepare("SELECT * FROM groupes WHERE id=?").get(req.params.id);
    if (!updated) {
      return res.status(404).json({ ok: false, error: "Groupe non trouvé" });
    }
    res.json({ ok: true, groupe: updated });
  } catch (e) {
    console.error("[groupes/put]", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// === DELETE GROUP ===
router.delete("/:id", (req, res) => {
  try {
    const existing = db.prepare("SELECT * FROM groupes WHERE id=?").get(req.params.id);
    if (!existing) {
      return res.status(404).json({ ok: false, error: "Groupe non trouvé" });
    }
    
    db.prepare("DELETE FROM groupes WHERE id = ?").run(req.params.id);
    res.json({ ok: true, deleted: existing });
  } catch (e) {
    console.error("[groupes/delete]", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
