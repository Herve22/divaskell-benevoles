const { encodeUserId } = require("../lib/hash");
"use strict";

const express = require("express");
const router = express.Router();
const { db } = require("../lib/db");

// === /api/search?q=texte ===
router.get("/", (req, res) => {
  const q = (req.query.q || "").trim();
  if (q.length < 3) return res.json({ ok: true, results: [] });

  const like = `%${q}%`;

  try {
    // --- Bénévoles / utilisateurs connectés ---
   const users = db.prepare(`
  SELECT id, username AS label, email AS info
  FROM users
  WHERE username LIKE ? OR email LIKE ? OR phone LIKE ?
  LIMIT 10
`).all(like, like, like).map(r => ({
  type: "Utilisateur (compte connecté)",
  ...r,
  link: `/publicadmin/users.html?id=${r.id}`,
  publicLink: `/publicadmin/inscriptionsbenevoles.html?cible=${encodeUserId(r.id)}`
}));

    // --- Inscriptions (bénévoles manuels) ---
    const inscriptions = db.prepare(`
      SELECT id, prenom || ' ' || nom AS label, email || ' / ' || telephone AS info
      FROM inscriptions
      WHERE prenom LIKE ? OR nom LIKE ? OR email LIKE ? OR telephone LIKE ?
      LIMIT 10
    `).all(like, like, like, like).map(r => ({
      type: "Bénévole inscrit",
      ...r,
      link: `/publicadmin/inscriptions.html?id=${r.id}`
    }));

    // --- Créneaux ---
    const creneaux = db.prepare(`
      SELECT c.id, g.nom || ' — ' || c.notes AS label, c.debut || ' → ' || c.fin AS info
      FROM creneaux c
      LEFT JOIN groupes g ON g.id = c.groupe_id
      WHERE c.notes LIKE ? OR c.debut LIKE ? OR c.fin LIKE ? OR g.nom LIKE ?
      LIMIT 10
    `).all(like, like, like, like).map(r => ({
      type: "Créneau",
      ...r,
      link: `/publicadmin/creneaux.html?id=${r.id}`
    }));

    // --- Groupes ---
    const groupes = db.prepare(`
      SELECT id, nom AS label, description AS info
      FROM groupes
      WHERE nom LIKE ? OR description LIKE ? OR contact_email LIKE ? OR contact_tel LIKE ?
      LIMIT 10
    `).all(like, like, like, like).map(r => ({
      type: "Groupe",
      ...r,
      link: `/publicadmin/groupes.html?id=${r.id}`
    }));

    // --- Événements ---
    const evenements = db.prepare(`
      SELECT id, nom AS label, lieu || ' / ' || date_debut AS info
      FROM evenements
      WHERE nom LIKE ? OR lieu LIKE ?
      LIMIT 10
    `).all(like, like).map(r => ({
      type: "Événement",
      ...r,
      link: `/publicadmin/eventgroupes.html?id=${r.id}`
    }));

    // Combine et envoie
    const results = [...users, ...inscriptions, ...creneaux, ...groupes, ...evenements];
    res.json({ ok: true, results });
  } catch (e) {
    console.error("[search.js]", e);
    res.json({ ok: false, error: e.message });
  }
});

module.exports = router;
