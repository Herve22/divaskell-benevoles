"use strict";

const express = require("express");
const router = express.Router();
const { db } = require("../lib/db");
const { notifierInscription } = require("../lib/mailer");

function log(...args) {
  console.log(new Date().toISOString(), "[creneaux-publics]", ...args);
}

// GET créneaux du prochain événement (PUBLIC - sans auth)
router.get("/", (req, res) => {
  try {
    log("🔥 Requête GET /api/creneaux-publics");

    // 1. Trouver le prochain événement (date_debut >= aujourd'hui)
    const now = new Date().toISOString();
    log("🕐 Date actuelle:", now);

    // D'abord, voir tous les événements
    const allEvents = db.prepare("SELECT * FROM evenements ORDER BY date_debut ASC").all();
    log("📋 Tous les événements:", allEvents.length);
    allEvents.forEach(e => {
      log(`   - ID ${e.id}: ${e.nom} | Début: ${e.date_debut} | Statut: ${e.statut}`);
    });

    const prochainEvent = db.prepare(`
      SELECT * FROM evenements 
      WHERE date_debut >= ? 
      AND statut != 'brouillon'
      ORDER BY date_debut ASC 
      LIMIT 1
    `).get(now);

    log("🎯 Prochain événement trouvé:", prochainEvent ? prochainEvent.nom : "AUCUN");

    if (!prochainEvent) {
      log("❌ Aucun événement à venir trouvé");
      return res.json({ 
        ok: true, 
        evenement: null, 
        creneaux: [] 
      });
    }

    log("✅ Événement sélectionné:", {
      id: prochainEvent.id,
      nom: prochainEvent.nom,
      date_debut: prochainEvent.date_debut,
      statut: prochainEvent.statut
    });

    // 2. Récupérer tous les créneaux de cet événement avec infos groupe
    const creneaux = db.prepare(`
      SELECT 
        c.id,
        c.groupe_id,
        c.debut,
        c.fin,
        c.nb_min,
        c.nb_max,
        c.notes,
        g.nom as groupe_nom,
        g.description as groupe_description
      FROM creneaux c
      INNER JOIN groupes g ON c.groupe_id = g.id
      WHERE g.evenement_id = ?
      AND c.debut >= ?
      ORDER BY c.debut ASC
    `).all(prochainEvent.id, now);

    log(`📅 Créneaux trouvés pour l'événement ${prochainEvent.id}:`, creneaux.length);

    // Si aucun créneau, voir pourquoi
    if (creneaux.length === 0) {
      const allGroupes = db.prepare("SELECT * FROM groupes WHERE evenement_id = ?").all(prochainEvent.id);
      log("🔍 Groupes de cet événement:", allGroupes.length);
      
      const allCreneaux = db.prepare("SELECT * FROM creneaux").all();
      log("🔍 Total créneaux en base:", allCreneaux.length);
    }

    // 3. Compter les inscriptions pour chaque créneau
    const creneauxAvecPlaces = creneaux.map(creneau => {
      const nbInscrits = db.prepare(`
        SELECT COUNT(*) as count 
        FROM inscriptions 
        WHERE creneau_id = ? 
        AND statut = 'confirmee'
      `).get(creneau.id).count;

      const placesDisponibles = creneau.nb_max - nbInscrits;
      
      // Calculer la durée en minutes
      const debut = new Date(creneau.debut);
      const fin = new Date(creneau.fin);
      const dureeMinutes = Math.round((fin - debut) / 60000);

      log(`   - Créneau ${creneau.id}: ${creneau.groupe_nom} | ${creneau.debut} | ${nbInscrits}/${creneau.nb_max} inscrits`);

      return {
        ...creneau,
        nb_inscrits: nbInscrits,
        places_disponibles: placesDisponibles,
        duree_minutes: dureeMinutes,
        complet: placesDisponibles <= 0
      };
    });

    log("✅ Réponse finale:", {
      evenement: prochainEvent.nom,
      nb_creneaux: creneauxAvecPlaces.length
    });

    res.json({
      ok: true,
      evenement: prochainEvent,
      creneaux: creneauxAvecPlaces
    });
  } catch (e) {
    log("❌ ERREUR:", e.message);
    console.error("[creneaux-publics] Stack:", e.stack);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST inscription publique (sans user_id)
router.post("/inscription", (req, res) => {
  try {
    log("📝 Inscription:", req.body);

    const { creneau_id, nom, prenom, email, telephone, commentaire } = req.body;

    if (!creneau_id || !email) {
      log("❌ Champs manquants");
      return res.status(400).json({ 
        ok: false, 
        error: "Créneau et email requis" 
      });
    }

    // Vérifier que le créneau existe et a des places
    const creneau = db.prepare("SELECT * FROM creneaux WHERE id=?").get(creneau_id);
    if (!creneau) {
      log("❌ Créneau introuvable:", creneau_id);
      return res.status(404).json({ ok: false, error: "Créneau introuvable" });
    }

    const nbInscrits = db.prepare(`
      SELECT COUNT(*) as count 
      FROM inscriptions 
      WHERE creneau_id = ? 
      AND statut = 'confirmee'
    `).get(creneau_id).count;

    log(`📊 Places: ${nbInscrits}/${creneau.nb_max}`);

    if (nbInscrits >= creneau.nb_max) {
      log("❌ Créneau complet");
      return res.status(400).json({ 
        ok: false, 
        error: "Plus de places disponibles" 
      });
    }

    // Vérifier si déjà inscrit avec cet email
    const existante = db.prepare(`
      SELECT id FROM inscriptions 
      WHERE creneau_id = ? 
      AND email = ?
      AND statut = 'confirmee'
    `).get(creneau_id, email);

    if (existante) {
      log("❌ Déjà inscrit:", email);
      return res.status(400).json({ 
        ok: false, 
        error: "Vous êtes déjà inscrit à ce créneau" 
      });
    }

    // Créer l'inscription
    const stmt = db.prepare(`
      INSERT INTO inscriptions 
      (creneau_id, nom, prenom, email, telephone, commentaire, statut, user_id)
      VALUES (?, ?, ?, ?, ?, ?, 'confirmee', NULL)
    `);
    
    const info = stmt.run(
      creneau_id, 
      nom || '', 
      prenom || '', 
      email, 
      telephone || '', 
      commentaire || ''
    );

    const inscription = db.prepare("SELECT * FROM inscriptions WHERE id=?").get(info.lastInsertRowid);

    log("✅ Inscription créée:", inscription.id, email);

    // 🔔 Envoi de la notification au responsable (async, ne bloque pas)
    notifierInscription(inscription.id).catch(err => {
      console.error('[creneaux-publics/inscription] Erreur notification:', err);
    });

    res.json({ 
      ok: true, 
      inscription,
      message: "Inscription confirmée !" 
    });
  } catch (e) {
    log("❌ ERREUR inscription:", e.message);
    console.error("[creneaux-publics/inscription] Stack:", e.stack);
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;