"use strict";

const express = require("express");
const router = express.Router();
const { db } = require("../lib/db");
const { requireAuth, requireAdmin } = require("../middlewares/auth");

function isIsoUtc(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(s);
}

function assertBody(body) {
  const errors = [];
  if (!body.groupe_id) errors.push("groupe_id manquant");
  if (!body.debut || !isIsoUtc(body.debut)) errors.push("debut (UTC ISO) invalide");
  if (!body.fin   || !isIsoUtc(body.fin))   errors.push("fin (UTC ISO) invalide");

  const nb_min = body.nb_min ?? 1;
  const nb_max = body.nb_max ?? 3;
  if (nb_min != null && nb_max != null && Number(nb_min) > Number(nb_max)) {
    errors.push("nb_min doit être ≤ nb_max");
  }
  if (Date.parse(body.debut) >= Date.parse(body.fin)) {
    errors.push("fin doit être > debut");
  }
  return errors;
}

// Liste creneaux (accessible aux users en lecture)
router.get("/", requireAuth, (req, res) => {
  try {
    const { groupe_id, search } = req.query;
    
    let sql = "SELECT * FROM creneaux";
    let params = [];
    
    if (groupe_id) {
      sql += " WHERE groupe_id = ?";
      params.push(groupe_id);
    }
    
    sql += " ORDER BY debut ASC";
    
    let rows = db.prepare(sql).all(...params);

    if (search && String(search).trim().length) {
      const q = String(search).toLowerCase();
      rows = rows.filter(r =>
        (r.notes || "").toLowerCase().includes(q) ||
        String(r.nb_min ?? "").includes(q) ||
        String(r.nb_max ?? "").includes(q) ||
        (r.debut || "").toLowerCase().includes(q) ||
        (r.fin   || "").toLowerCase().includes(q)
      );
    }

    res.json(rows);
  } catch (e) {
    console.error("[creneaux/list]", e);
    res.status(500).json({ ok:false, error:e.message });
  }
});

// Get by id (accessible aux users en lecture)
router.get("/:id", requireAuth, (req, res) => {
  try {
    const row = db.prepare("SELECT * FROM creneaux WHERE id=?").get(req.params.id);
    if (!row) return res.status(404).json({ ok:false, error:"Not found" });
    res.json({ ok:true, creneau: row });
  } catch (e) {
    console.error("[creneaux/get]", e);
    res.status(500).json({ ok:false, error:e.message });
  }
});

// Create (admin uniquement)
router.post("/", requireAuth, requireAdmin, (req, res) => {
  try {
    const errors = assertBody(req.body || {});
    if (errors.length) return res.status(400).json({ ok:false, error: errors.join(", ") });

    const stmt = db.prepare(`
      INSERT INTO creneaux (groupe_id, debut, fin, nb_min, nb_max, notes)
      VALUES (@groupe_id, @debut, @fin, COALESCE(@nb_min,1), COALESCE(@nb_max,3), @notes)
    `);
    const info = stmt.run(req.body);
    const created = db.prepare("SELECT * FROM creneaux WHERE id=?").get(info.lastInsertRowid);
    res.json({ ok:true, creneau: created });
  } catch (e) {
    console.error("[creneaux/create]", e);
    res.status(500).json({ ok:false, error:e.message });
  }
});

// Update (admin uniquement)
router.put("/:id", requireAuth, requireAdmin, (req, res) => {
  try {
    const existing = db.prepare("SELECT * FROM creneaux WHERE id=?").get(req.params.id);
    if (!existing) return res.status(404).json({ ok:false, error:"Not found" });

    const payload = { ...existing, ...req.body, id: existing.id };
    const errors = assertBody(payload);
    if (errors.length) return res.status(400).json({ ok:false, error: errors.join(", ") });

    const stmt = db.prepare(`
      UPDATE creneaux SET
        groupe_id=@groupe_id, debut=@debut, fin=@fin,
        nb_min=COALESCE(@nb_min,1), nb_max=COALESCE(@nb_max,3),
        notes=@notes
      WHERE id=@id
    `);
    stmt.run(payload);

    const updated = db.prepare("SELECT * FROM creneaux WHERE id=?").get(existing.id);
    res.json({ ok:true, creneau: updated });
  } catch (e) {
    console.error("[creneaux/update]", e);
    res.status(500).json({ ok:false, error:e.message });
  }
});

// Delete (admin uniquement)
router.delete("/:id", requireAuth, requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    const getC = db.prepare("SELECT * FROM creneaux WHERE id=?").get(id);
    if (!getC) return res.status(404).json({ ok:false, error:"Not found" });

    db.transaction(() => {
      try {
        const hasInscriptions = db.prepare(`
          SELECT 1 FROM sqlite_master
          WHERE type='table' AND name='inscriptions'
        `).get();

        if (hasInscriptions) {
          db.prepare("DELETE FROM inscriptions WHERE creneau_id=?").run(id);
        }
      } catch (_) {}

      db.prepare("DELETE FROM creneaux WHERE id=?").run(id);
    })();

    res.json({ ok:true, deleted_id: id });
  } catch (e) {
    console.error("[creneaux/delete]", e);
    res.status(500).json({ ok:false, error:e.message });
  }
});

module.exports = router;
