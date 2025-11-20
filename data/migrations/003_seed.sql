-- ============================================================
-- DONNÉES D’EXEMPLE — GESTION BÉNÉVOLES
-- ============================================================

PRAGMA foreign_keys = ON;

---------------------------------------------------------------
-- 1️⃣  GROUPES
---------------------------------------------------------------
INSERT INTO groupes (nom, description, contact_email, contact_tel) VALUES
('Bar', 'Service des boissons et nettoyage du comptoir', 'bar@festnoz.test', '0601010101'),
('Entrée', 'Accueil et contrôle des billets', 'entree@festnoz.test', '0602020202');

---------------------------------------------------------------
-- 2️⃣  CRENEAUX (horaires fictifs)
---------------------------------------------------------------
INSERT INTO creneaux (groupe_id, debut, fin, nb_min, nb_max, notes) VALUES
(1, '2025-10-04 19:00:00', '2025-10-04 21:00:00', 2, 4, 'Mise en place du bar et service début de soirée'),
(1, '2025-10-04 21:00:00', '2025-10-04 23:00:00', 2, 4, 'Service pendant les concerts'),
(2, '2025-10-04 18:30:00', '2025-10-04 20:30:00', 2, 3, 'Contrôle d’entrée et billetterie début de soirée'),
(2, '2025-10-04 20:30:00', '2025-10-04 22:30:00', 2, 3, 'Deuxième rotation à l’accueil');

---------------------------------------------------------------
-- 3️⃣  RESPONSABLES DE GROUPE
---------------------------------------------------------------
-- ton admin (id=4) devient responsable des deux groupes
-- INSERT INTO responsables_groupe (user_id, groupe_id) VALUES (4, 1), (4, 2);

---------------------------------------------------------------
-- 4️⃣  INSCRIPTIONS (admin inscrit à quelques créneaux)
---------------------------------------------------------------
INSERT INTO inscriptions (user_id, creneau_id, statut, commentaire) VALUES
(4, 1, 'confirmee', 'Service au bar pour le démarrage'),
(4, 3, 'confirmee', 'Aide à la billetterie en début de soirée');

---------------------------------------------------------------
-- FIN
---------------------------------------------------------------
