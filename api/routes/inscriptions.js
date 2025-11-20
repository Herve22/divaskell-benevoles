"use strict";
const express = require("express");
const router = express.Router();
const { db } = require("../lib/db");
const { requireAuth, requireAdmin } = require("../middlewares/auth");
const { notifierInscription, notifierAnnulation } = require("../lib/mailer");

// ROUTE PUBLIQUE - Inscription sans auth
router.post("/public", (req, res) => {
  const { creneau_id, nom, prenom, email, telephone, commentaire } = req.body;
  
  try {
    if (!creneau_id || !nom || !prenom || !email) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Les champs créneau, nom, prénom et email sont obligatoires' 
      });
    }

    const creneau = db.prepare('SELECT * FROM creneaux WHERE id = ?').get(creneau_id);
    if (!creneau) {
      return res.status(404).json({ ok: false, error: 'Créneau introuvable' });
    }

    const { count } = db.prepare(`
      SELECT COUNT(*) as count 
      FROM inscriptions 
      WHERE creneau_id = ? AND statut = 'confirmee'
    `).get(creneau_id);

    if (count >= creneau.nb_max) {
      return res.status(400).json({ ok: false, error: 'Ce créneau est complet' });
    }

    const existing = db.prepare(`
      SELECT id FROM inscriptions 
      WHERE email = ? AND creneau_id = ? AND statut = 'confirmee'
    `).get(email, creneau_id);
    
    if (existing) {
      return res.status(409).json({ ok: false, error: "Déjà inscrit" });
    }
    
    const result = db.prepare(`
      INSERT INTO inscriptions (creneau_id, nom, prenom, email, telephone, commentaire, statut)
      VALUES (?, ?, ?, ?, ?, ?, 'confirmee')
    `).run(creneau_id, nom, prenom, email, telephone || null, commentaire || null);
    
    const inscription_id = result.lastInsertRowid;

    // 🔔 Envoi de la notification au responsable (async, ne bloque pas)
    notifierInscription(inscription_id).catch(err => {
      console.error('[inscriptions/public] Erreur notification:', err);
    });

    res.json({ ok: true, id: inscription_id });
  } catch (err) {
    console.error('[inscriptions/public]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/inscriptions - Liste inscriptions (ACCESSIBLE AUX USERS)
router.get("/", requireAuth, (req, res) => {
  try {
    const { creneau_id, groupe_id, evenement_id, statut } = req.query;

    let query = `
      SELECT 
        i.*,
        c.debut, c.fin, c.notes as creneau_notes,
        g.nom as groupe_nom,
        e.nom as evenement_nom
      FROM inscriptions i
      LEFT JOIN creneaux c ON i.creneau_id = c.id
      LEFT JOIN groupes g ON c.groupe_id = g.id
      LEFT JOIN evenements e ON g.evenement_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (creneau_id) {
      query += ' AND i.creneau_id = ?';
      params.push(creneau_id);
    }

    if (groupe_id) {
      query += ' AND c.groupe_id = ?';
      params.push(groupe_id);
    }

    if (evenement_id) {
      query += ' AND g.evenement_id = ?';
      params.push(evenement_id);
    }

    if (statut) {
      query += ' AND i.statut = ?';
      params.push(statut);
    }

    query += ' ORDER BY i.date_inscription DESC';

    const inscriptions = db.prepare(query).all(...params);
    res.json(inscriptions);

  } catch (error) {
    console.error('[inscriptions/list]', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/inscriptions/:id - Détails (ACCESSIBLE AUX USERS)
router.get("/:id", requireAuth, (req, res) => {
  try {
    const inscription = db.prepare(`
      SELECT 
        i.*,
        c.debut, c.fin, c.nb_min, c.nb_max, c.notes as creneau_notes,
        g.nom as groupe_nom, g.description as groupe_description,
        e.nom as evenement_nom, e.lieu as evenement_lieu
      FROM inscriptions i
      LEFT JOIN creneaux c ON i.creneau_id = c.id
      LEFT JOIN groupes g ON c.groupe_id = g.id
      LEFT JOIN evenements e ON g.evenement_id = e.id
      WHERE i.id = ?
    `).get(req.params.id);

    if (!inscription) {
      return res.status(404).json({ ok: false, error: 'Inscription introuvable' });
    }

    res.json(inscription);

  } catch (error) {
    console.error('[inscriptions/get]', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// POST /api/inscriptions - Créer (ADMIN UNIQUEMENT)
router.post("/", requireAuth, requireAdmin, (req, res) => {
  try {
    const { creneau_id, nom, prenom, email, telephone, commentaire, statut } = req.body;

    if (!creneau_id || !nom || !prenom || !email) {
      return res.status(400).json({ 
        ok: false,
        error: 'Les champs créneau, nom, prénom et email sont obligatoires' 
      });
    }

    const result = db.prepare(`
      INSERT INTO inscriptions (
        creneau_id, nom, prenom, email, telephone, commentaire, statut
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      creneau_id, 
      nom, 
      prenom, 
      email, 
      telephone || null, 
      commentaire || null,
      statut || 'confirmee'
    );

    res.status(201).json({
      ok: true,
      message: 'Inscription créée avec succès',
      id: result.lastInsertRowid
    });

  } catch (error) {
    console.error('[inscriptions/create]', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// PUT /api/inscriptions/:id - Modifier (ADMIN UNIQUEMENT)
router.put("/:id", requireAuth, requireAdmin, (req, res) => {
  try {
    const { nom, prenom, email, telephone, commentaire, statut } = req.body;

    const result = db.prepare(`
      UPDATE inscriptions 
      SET nom = ?, prenom = ?, email = ?, telephone = ?, commentaire = ?, statut = ?
      WHERE id = ?
    `).run(nom, prenom, email, telephone, commentaire, statut, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ ok: false, error: 'Inscription introuvable' });
    }

    res.json({ ok: true, message: 'Inscription mise à jour avec succès' });

  } catch (error) {
    console.error('[inscriptions/update]', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// DELETE /api/inscriptions/:id - Supprimer (ADMIN UNIQUEMENT)
router.delete("/:id", requireAuth, requireAdmin, (req, res) => {
  try {
    // 🔔 Notifier AVANT la suppression (on a encore les données)
    notifierAnnulation(req.params.id).catch(err => {
      console.error('[inscriptions/delete] Erreur notification:', err);
    });

    const result = db.prepare('DELETE FROM inscriptions WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ ok: false, error: 'Inscription introuvable' });
    }

    res.json({ ok: true, message: 'Inscription supprimée avec succès' });

  } catch (error) {
    console.error('[inscriptions/delete]', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// PATCH /api/inscriptions/:id/statut - Changer statut (ACCESSIBLE AUX USERS pour annuler leur propre inscription)
router.patch("/:id/statut", requireAuth, (req, res) => {
  try {
    const { statut } = req.body;

    if (!['confirmee', 'annulee'].includes(statut)) {
      return res.status(400).json({ 
        ok: false,
        error: 'Statut invalide (confirmee ou annulee uniquement)' 
      });
    }

    const result = db.prepare(`
      UPDATE inscriptions SET statut = ? WHERE id = ?
    `).run(statut, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ ok: false, error: 'Inscription introuvable' });
    }

    // 🔔 Si annulation, notifier le responsable
    if (statut === 'annulee') {
      notifierAnnulation(req.params.id).catch(err => {
        console.error('[inscriptions/statut] Erreur notification:', err);
      });
    }

    res.json({ ok: true, message: 'Statut mis à jour avec succès' });

  } catch (error) {
    console.error('[inscriptions/patch]', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;