# 🎯 Divaskell - Gestion de Bénévoles

Application web full-stack pour gérer des bénévoles, événements, groupes et créneaux horaires pour associations culturelles bretonnes.

**🌐 Production :** https://benevole.divaskellplougastell.fr

---

## ✨ Fonctionnalités

- **Multi-rôles** : Bénévole / Admin / Super-admin
- **Gestion complète** : Événements → Groupes → Créneaux → Inscriptions
- **QR Codes** pour pointage des bénévoles
- **Inscriptions publiques** sans compte
- **Filtres en cascade** dynamiques
- **Activation par email** sécurisée

---

## 🛠️ Stack Technique

- **Backend** : Node.js 18+, Express.js, JWT, bcrypt, Nodemailer
- **Frontend** : HTML5, CSS3, JavaScript, Bootstrap 5
- **Base de données** : SQLite3 (better-sqlite3)
- **Process Manager** : PM2

---

## 📁 Structure

- `api/` - Serveur Express (port 8888), routes REST, middlewares JWT
- `public/` - Interface bénévole
- `publicadmin/` - Interface admin
- `publicsuperadmin/` - Interface super-admin
- `data/` - Base SQLite + migrations

---

## 🗄️ Modèle de Données

Événement → Groupe → Créneau → Inscription

Relations directes via evenement_id, groupe_id, creneau_id.

---

## 🚀 Installation

1. Cloner le repo
2. `npm install` puis `cd api && npm install`
3. Configurer `.env` (SMTP, JWT_SECRET)
4. `node api/server.js` ou `pm2 start api/server.js --name benevoles`

---

## 🔐 Sécurité

- Mots de passe hashés (bcrypt)
- JWT avec cookies httpOnly
- Activation email obligatoire
- Middlewares d'autorisation par rôle

---

## 🎯 Résultat

**Gain de 5h par événement** grâce à l'automatisation de la gestion des inscriptions, affectations et suivi en temps réel.

---

**Développé en 10 jours** - Octobre 2025

MIT License
