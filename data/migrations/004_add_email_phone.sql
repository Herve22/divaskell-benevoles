-- Ajout conditionnel de la colonne email
PRAGMA foreign_keys=off;

BEGIN TRANSACTION;

-- Ajouter la colonne email seulement si elle n'existe pas
CREATE TABLE IF NOT EXISTS _tmp_users AS SELECT * FROM users LIMIT 0;

-- Email
ALTER TABLE users ADD COLUMN email TEXT;

COMMIT;
PRAGMA foreign_keys=on;

-- Créer un index unique sur email si non existant
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
