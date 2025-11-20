-- ✅ Ajoute la colonne event_id à la table groupes si elle n'existe pas encore
PRAGMA foreign_keys = OFF;

-- Vérifie si la colonne existe déjà
CREATE TABLE IF NOT EXISTS _tmp_check (
  name TEXT
);

INSERT INTO _tmp_check
SELECT name FROM pragma_table_info('groupes') WHERE name='event_id';

-- Si aucune ligne trouvée, on ajoute la colonne
DELETE FROM _tmp_check WHERE name IS NOT 'event_id';

-- Ajout de la colonne event_id si absente
ALTER TABLE groupes ADD COLUMN event_id INTEGER REFERENCES evenements(id);

DROP TABLE IF EXISTS _tmp_check;

PRAGMA foreign_keys = ON;
