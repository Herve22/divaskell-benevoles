-- Ajout colonnes pour inscriptions publiques (sans user_id obligatoire)
ALTER TABLE inscriptions ADD COLUMN nom TEXT;
ALTER TABLE inscriptions ADD COLUMN prenom TEXT;
ALTER TABLE inscriptions ADD COLUMN email TEXT;
ALTER TABLE inscriptions ADD COLUMN telephone TEXT;

-- Rendre user_id nullable
-- (SQLite ne supporte pas ALTER COLUMN, donc on doit recréer la table si nécessaire)
