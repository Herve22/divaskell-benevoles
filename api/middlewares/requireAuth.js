// api/middlewares/requireAuth.js
"use strict";

const jwt = require("jsonwebtoken");
const { open } = require("../lib/db");

const JWT_SECRET = process.env.JWT_SECRET || "change-me-secret";

/**
 * Middleware d’authentification
 * @param {Array<string>} allowedRoles - ex: ["admin"] ou ["admin","superadmin"]
 */
function requireAuth(allowedRoles = []) {
  return async function (req, res, next) {
    try {
      const auth = req.headers.authorization;
      if (!auth) return res.status(401).json({ ok: false, error: "missing authorization" });

      const parts = auth.split(" ");
      if (parts.length !== 2 || parts[0] !== "Bearer") {
        return res.status(401).json({ ok: false, error: "bad auth header" });
      }

      const token = parts[1];
      let payload;
      try {
        payload = jwt.verify(token, JWT_SECRET);
      } catch (e) {
        return res.status(401).json({ ok: false, error: "invalid token" });
      }

      // si on veut vérifier en DB que l’utilisateur existe encore
      const db = open();
      const user = await db.get("SELECT id, username, role FROM users WHERE id = ?", [payload.uid]);
      await db.close();
      if (!user) return res.status(401).json({ ok: false, error: "user not found" });

      // Vérification rôle
      if (allowedRoles.length && !allowedRoles.includes(user.role)) {
        return res.status(403).json({ ok: false, error: "forbidden" });
      }

      // injecte user dans req
      req.user = user;
      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: "server_error" });
    }
  };
}

module.exports = requireAuth; 