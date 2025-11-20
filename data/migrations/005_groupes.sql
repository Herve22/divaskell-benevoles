-- Migration 005 : création des tables pour la gestion des groupes

CREATE TABLE IF NOT EXISTS groupes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  description TEXT,
  responsable_id INTEGER,
  evenement_id INTEGER,
  date_creation TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (responsable_id) REFERENCES benevoles(id),
  FOREIGN KEY (evenement_id) REFERENCES evenements(id)
);

CREATE TABLE IF NOT EXISTS groupe_responsables (
  groupe_id INTEGER,
  benevole_id INTEGER,
  PRIMARY KEY (groupe_id, benevole_id),
  FOREIGN KEY (groupe_id) REFERENCES groupes(id),
  FOREIGN KEY (benevole_id) REFERENCES benevoles(id)
);
