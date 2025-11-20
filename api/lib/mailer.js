"use strict";

const nodemailer = require("nodemailer");
const { db } = require("./db");

function log(...args) {
  console.log(new Date().toISOString(), "[mailer]", ...args);
}

// Configuration du transporteur SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Récupère les statistiques d'un groupe
 */
function getGroupeStats(groupe_id) {
  // Total inscrits confirmés pour tous les créneaux du groupe
  const stats = db.prepare(`
    SELECT 
      COUNT(DISTINCT i.id) as total_inscrits,
      COUNT(DISTINCT i.creneau_id) as nb_creneaux_avec_inscrits,
      SUM(c.nb_max) as total_places,
      GROUP_CONCAT(DISTINCT c.id) as creneau_ids
    FROM creneaux c
    LEFT JOIN inscriptions i ON c.id = i.creneau_id AND i.statut = 'confirmee'
    WHERE c.groupe_id = ?
  `).get(groupe_id);

  // Détail par créneau
  const creneaux = db.prepare(`
    SELECT 
      c.id,
      c.debut,
      c.fin,
      c.nb_min,
      c.nb_max,
      COUNT(i.id) as nb_inscrits
    FROM creneaux c
    LEFT JOIN inscriptions i ON c.id = i.creneau_id AND i.statut = 'confirmee'
    WHERE c.groupe_id = ?
    GROUP BY c.id
    ORDER BY c.debut ASC
  `).all(groupe_id);

  return { ...stats, creneaux };
}

/**
 * Formate une date pour l'affichage
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Génère le HTML du point sur le groupe
 */
function genererPointGroupe(stats, groupe) {
  const tauxRemplissage = stats.total_places > 0 
    ? Math.round((stats.total_inscrits / stats.total_places) * 100) 
    : 0;

  let html = `
    <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #0369a1; margin-top: 0;">📊 Point sur le groupe "${groupe.nom}"</h3>
      
      <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <p style="margin: 5px 0;"><strong>Total inscrits confirmés :</strong> ${stats.total_inscrits}</p>
        <p style="margin: 5px 0;"><strong>Total places disponibles :</strong> ${stats.total_places}</p>
        <p style="margin: 5px 0;"><strong>Taux de remplissage :</strong> ${tauxRemplissage}%</p>
      </div>

      <h4 style="color: #0369a1;">Détail par créneau :</h4>
  `;

  stats.creneaux.forEach((creneau, index) => {
    const placesRestantes = creneau.nb_max - creneau.nb_inscrits;
    const couleur = placesRestantes === 0 ? "#dc2626" : placesRestantes < 3 ? "#f59e0b" : "#16a34a";
    
    html += `
      <div style="background: white; padding: 12px; border-left: 4px solid ${couleur}; margin: 10px 0; border-radius: 4px;">
        <p style="margin: 5px 0; font-weight: bold;">${formatDate(creneau.debut)}</p>
        <p style="margin: 5px 0;">
          <span style="color: ${couleur}; font-weight: bold;">
            ${creneau.nb_inscrits}/${creneau.nb_max} inscrits
          </span>
          ${placesRestantes === 0 ? " - ❌ COMPLET" : ` - ${placesRestantes} place(s) restante(s)`}
        </p>
      </div>
    `;
  });

  html += `</div>`;
  return html;
}

/**
 * Envoie un email au responsable lors d'une nouvelle inscription
 */
async function notifierInscription(inscription_id) {
  try {
    log("🔔 Notification inscription ID:", inscription_id);

    // Récupérer les infos complètes
    const data = db.prepare(`
      SELECT 
        i.nom, i.prenom, i.email, i.telephone, i.commentaire,
        c.debut, c.fin, c.nb_max,
        g.id as groupe_id, g.nom as groupe_nom, g.description as groupe_description,
        e.nom as evenement_nom, e.lieu as evenement_lieu,
        u.email as responsable_email, u.username as responsable_nom
      FROM inscriptions i
      JOIN creneaux c ON i.creneau_id = c.id
      JOIN groupes g ON c.groupe_id = g.id
      JOIN evenements e ON g.evenement_id = e.id
      LEFT JOIN users u ON g.responsable_id = u.id
      WHERE i.id = ?
    `).get(inscription_id);

    if (!data) {
      log("❌ Inscription introuvable:", inscription_id);
      return;
    }

    if (!data.responsable_email) {
      log("⚠️ Pas de responsable avec email pour le groupe:", data.groupe_nom);
      return;
    }

    // Récupérer les stats du groupe
    const stats = getGroupeStats(data.groupe_id);

    // Construire l'email
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">✅ Nouvelle inscription !</h2>
        
        <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">👤 Bénévole</h3>
          <p><strong>Nom :</strong> ${data.prenom} ${data.nom}</p>
          <p><strong>Email :</strong> ${data.email}</p>
          ${data.telephone ? `<p><strong>Téléphone :</strong> ${data.telephone}</p>` : ""}
          ${data.commentaire ? `<p><strong>Commentaire :</strong> ${data.commentaire}</p>` : ""}
        </div>

        <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">📅 Créneau</h3>
          <p><strong>Événement :</strong> ${data.evenement_nom}</p>
          <p><strong>Groupe :</strong> ${data.groupe_nom}</p>
          <p><strong>Date :</strong> ${formatDate(data.debut)}</p>
        </div>

        ${genererPointGroupe(stats, { nom: data.groupe_nom })}

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          Vous recevez cet email car vous êtes responsable du groupe "${data.groupe_nom}".
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: data.responsable_email,
      subject: `✅ Nouvelle inscription - ${data.groupe_nom}`,
      html,
    });

    log("✅ Email envoyé à:", data.responsable_email);
  } catch (error) {
    log("❌ Erreur envoi email inscription:", error.message);
    // On ne bloque pas l'inscription si l'email échoue
  }
}

/**
 * Envoie un email au responsable lors d'une annulation
 */
async function notifierAnnulation(inscription_id) {
  try {
    log("🔔 Notification annulation ID:", inscription_id);

    // Récupérer les infos complètes
    const data = db.prepare(`
      SELECT 
        i.nom, i.prenom, i.email,
        c.debut, c.fin,
        g.id as groupe_id, g.nom as groupe_nom,
        e.nom as evenement_nom,
        u.email as responsable_email, u.username as responsable_nom
      FROM inscriptions i
      JOIN creneaux c ON i.creneau_id = c.id
      JOIN groupes g ON c.groupe_id = g.id
      JOIN evenements e ON g.evenement_id = e.id
      LEFT JOIN users u ON g.responsable_id = u.id
      WHERE i.id = ?
    `).get(inscription_id);

    if (!data) {
      log("❌ Inscription introuvable:", inscription_id);
      return;
    }

    if (!data.responsable_email) {
      log("⚠️ Pas de responsable avec email pour le groupe:", data.groupe_nom);
      return;
    }

    // Récupérer les stats du groupe
    const stats = getGroupeStats(data.groupe_id);

    // Construire l'email
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">❌ Annulation d'inscription</h2>
        
        <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">👤 Bénévole</h3>
          <p><strong>Nom :</strong> ${data.prenom} ${data.nom}</p>
          <p><strong>Email :</strong> ${data.email}</p>
        </div>

        <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">📅 Créneau annulé</h3>
          <p><strong>Événement :</strong> ${data.evenement_nom}</p>
          <p><strong>Groupe :</strong> ${data.groupe_nom}</p>
          <p><strong>Date :</strong> ${formatDate(data.debut)}</p>
        </div>

        ${genererPointGroupe(stats, { nom: data.groupe_nom })}

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          Vous recevez cet email car vous êtes responsable du groupe "${data.groupe_nom}".
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: data.responsable_email,
      subject: `❌ Annulation - ${data.groupe_nom}`,
      html,
    });

    log("✅ Email annulation envoyé à:", data.responsable_email);
  } catch (error) {
    log("❌ Erreur envoi email annulation:", error.message);
    // On ne bloque pas l'annulation si l'email échoue
  }
}

module.exports = {
  notifierInscription,
  notifierAnnulation,
};