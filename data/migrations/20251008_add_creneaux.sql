-- Create creneaux table if not exists
CREATE TABLE IF NOT EXISTS creneaux (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  groupe_id INTEGER NOT NULL,
  debut TEXT NOT NULL,
  fin   TEXT NOT NULL,
  nb_min INTEGER DEFAULT 1,
  nb_max INTEGER DEFAULT 3,
  notes  TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (groupe_id) REFERENCES groupes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_creneaux_groupe_id ON creneaux(groupe_id);
