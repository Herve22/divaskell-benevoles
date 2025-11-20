"use strict";

const express = require("express");
const router = express.Router();
const { db } = require("../lib/db");
const { decodeUserId } = require("../lib/hash");

// /api/inscriptionsbenevoles/:hash
router.get("/:hash", (req, res) => {
  try {
    const userId = decodeUserId(req.params.hash);
    if (!userId) return res.json({ ok: false, error: "Hash invalide" });

    // 1. Récupérer l'utilisateur depuis la table users
    const user = db.prepare(`
      SELECT id, username, email, phone, role, created_at
      FROM users
      WHERE id = ?
    `).get(userId);

    if (!user) return res.json({ ok: true, benevole: null, creneaux: [] });

    // 2. Récupérer toutes les inscriptions de cet utilisateur PAR EMAIL
    // Car les inscriptions publiques utilisent l'email, pas le user_id
    const creneaux = db.prepare(`
      SELECT 
        i.id AS inscription_id,
        i.statut,
        i.commentaire,
        i.date_inscription,
        c.id AS creneau_id,
        c.debut, 
        c.fin, 
        c.notes,
        c.nb_min,
        c.nb_max,
        g.id AS groupe_id, 
        g.nom AS nom_groupe,
        g.description AS groupe_description,
        g.contact_email AS groupe_email,
        g.contact_tel AS groupe_tel,
        (SELECT COUNT(*) FROM inscriptions WHERE creneau_id = c.id AND statut = 'confirmee') AS nb_inscrits
      FROM inscriptions i
      JOIN creneaux c ON c.id = i.creneau_id
      LEFT JOIN groupes g ON g.id = c.groupe_id
      WHERE i.email = ? AND datetime(c.fin) > datetime('now')
      ORDER BY c.debut ASC
    `).all(user.email);

    // 3. Formater les données du bénévole
    const benevole = {
      id: user.id,
      username: user.username,
      email: user.email,
      telephone: user.phone,
      role: user.role,
      membre_depuis: user.created_at
    };

    res.json({ ok: true, benevole, creneaux });
  } catch (err) {
    console.error("[inscriptionsbenevoles] erreur:", err);
    res.json({ ok: false, error: err.message });
  }
});

module.exports = router;
