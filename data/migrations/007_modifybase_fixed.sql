-- 1. Nettoyer les tables temporaires
DROP TABLE IF EXISTS _tmp_users;

-- 2. Ajouter les champs manquants
ALTER TABLE inscriptions ADD COLUMN nom TEXT;
ALTER TABLE inscriptions ADD COLUMN prenom TEXT;
ALTER TABLE inscriptions ADD COLUMN email TEXT;
ALTER TABLE inscriptions ADD COLUMN telephone TEXT;

-- 3. Ajouter les index critiques pour les performances
CREATE INDEX IF NOT EXISTS idx_inscriptions_creneau ON inscriptions(creneau_id);
CREATE INDEX IF NOT EXISTS idx_inscriptions_user ON inscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_inscriptions_email ON inscriptions(email);
CREATE INDEX IF NOT EXISTS idx_creneaux_groupe ON creneaux(groupe_id);
CREATE INDEX IF NOT EXISTS idx_creneaux_dates ON creneaux(debut, fin);
CREATE INDEX IF NOT EXISTS idx_groupes_evenement ON groupes(evenement_id);

-- 4. Améliorer la vue des statistiques
DROP VIEW IF EXISTS v_creneaux_ratio;
CREATE VIEW v_creneaux_complet AS 
SELECT 
  c.id AS creneau_id,
  c.groupe_id,
  g.nom AS groupe_nom,
  g.contact_email,
  g.contact_tel,
  e.nom AS evenement_nom,
  c.debut,
  c.fin,
  c.nb_min,
  c.nb_max,
  c.notes,
  COUNT(i.id) FILTER (WHERE i.statut='confirmee') AS nb_inscrits,
  c.nb_max - COUNT(i.id) FILTER (WHERE i.statut='confirmee') AS places_restantes,
  CASE 
    WHEN COUNT(i.id) FILTER (WHERE i.statut='confirmee') < c.nb_min THEN 'critique'
    WHEN COUNT(i.id) FILTER (WHERE i.statut='confirmee') = c.nb_min THEN 'attention'
    ELSE 'ok'
  END AS statut,
  ROUND(100.0 * COUNT(i.id) FILTER (WHERE i.statut='confirmee') / NULLIF(c.nb_max,0), 1) AS taux_remplissage
FROM creneaux c
JOIN groupes g ON g.id = c.groupe_id
LEFT JOIN evenements e ON e.id = g.evenement_id
LEFT JOIN inscriptions i ON i.creneau_id = c.id
GROUP BY c.id;

-- 5. Vue pour les inscriptions publiques (sans user_id)
CREATE VIEW IF NOT EXISTS v_inscriptions_publiques AS
SELECT 
  i.id,
  i.creneau_id,
  i.nom,
  i.prenom,
  i.email,
  i.telephone,
  i.statut,
  i.date_inscription,
  c.debut,
  c.fin,
  g.nom as groupe_nom
FROM inscriptions i
JOIN creneaux c ON c.id = i.creneau_id
JOIN groupes g ON g.id = c.groupe_id
WHERE i.email IS NOT NULL;

-- 6. Trigger pour validation des créneaux
CREATE TRIGGER IF NOT EXISTS check_creneau_dates
BEFORE INSERT ON creneaux
BEGIN
  SELECT CASE 
    WHEN NEW.fin <= NEW.debut THEN
      RAISE(ABORT, 'La fin doit être après le début')
    WHEN NEW.nb_max < NEW.nb_min THEN
      RAISE(ABORT, 'nb_max doit être >= nb_min')
  END;
END;

-- 7. Trigger pour éviter les sur-inscriptions
CREATE TRIGGER IF NOT EXISTS check_max_inscriptions
BEFORE INSERT ON inscriptions
WHEN NEW.statut = 'confirmee'
BEGIN
  SELECT CASE
    WHEN (
      SELECT COUNT(*) FROM inscriptions 
      WHERE creneau_id = NEW.creneau_id 
      AND statut = 'confirmee'
    ) >= (
      SELECT nb_max FROM creneaux WHERE id = NEW.creneau_id
    ) THEN
      RAISE(ABORT, 'Créneau complet')
  END;
END;