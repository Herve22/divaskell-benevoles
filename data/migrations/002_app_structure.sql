-- ============================================================
-- STRUCTURE DE L’APPLICATION "Gestion de bénévoles"
-- Compatible avec ta base actuelle (users déjà existant)
-- ============================================================

PRAGMA foreign_keys = ON;

---------------------------------------------------------------
-- 1. TABLE GROUPES
---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS groupes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  description TEXT,
  contact_email TEXT,
  contact_tel TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

---------------------------------------------------------------
-- 2. TABLE CRENEAUX
---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS creneaux (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  groupe_id INTEGER NOT NULL,
  debut TEXT NOT NULL,          -- datetime de début
  fin TEXT NOT NULL,            -- datetime de fin
  nb_min INTEGER DEFAULT 1,
  nb_max INTEGER DEFAULT 3,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (groupe_id) REFERENCES groupes(id) ON DELETE CASCADE
);

---------------------------------------------------------------
-- 3. TABLE INSCRIPTIONS
---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  creneau_id INTEGER NOT NULL,
  statut TEXT DEFAULT 'confirmee',   -- confirmee / annulee
  commentaire TEXT,
  date_inscription TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, creneau_id),       -- un bénévole par créneau
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (creneau_id) REFERENCES creneaux(id) ON DELETE CASCADE
);

---------------------------------------------------------------
-- 4. TABLE RESPONSABLES DE GROUPE
---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS responsables_groupe (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  groupe_id INTEGER NOT NULL,
  UNIQUE(user_id, groupe_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (groupe_id) REFERENCES groupes(id) ON DELETE CASCADE
);

---------------------------------------------------------------
-- 5. VUES UTILES (facultatives)
---------------------------------------------------------------
-- Vue : ratio d’inscrits par créneau
CREATE VIEW IF NOT EXISTS v_creneaux_ratio AS
SELECT 
  c.id AS creneau_id,
  c.groupe_id,
  g.nom AS groupe_nom,
  c.debut,
  c.fin,
  c.nb_min,
  c.nb_max,
  COUNT(i.id) AS nb_inscrits,
  ROUND(100.0 * COUNT(i.id) / c.nb_max, 1) AS taux_completude
FROM creneaux c
JOIN groupes g ON g.id = c.groupe_id
LEFT JOIN inscriptions i ON i.creneau_id = c.id AND i.statut='confirmee'
GROUP BY c.id;

---------------------------------------------------------------
-- FIN
---------------------------------------------------------------
