// api/middlewares/auth.js
"use strict";

const jwt = require("jsonwebtoken");
const { db } = require("../lib/db");

const JWT_SECRET = process.env.JWT_SECRET || "change-me-secret";

/**
 * Vérifie la présence et la validité du token JWT.
 * Injecte req.user si valide.
 */
function requireAuth(req, res, next) {
  try {
    // Token possible via Authorization header ou cookie
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ ok: false, error: "missing token" });
    }

    // Vérifie et décode le token
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db
      .prepare("SELECT id, username, role FROM users WHERE id = ?")
      .get(decoded.uid);

    if (!user) {
      return res.status(401).json({ ok: false, error: "user not found" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("[requireAuth]", err.message);
    return res.status(401).json({ ok: false, error: "invalid or expired token" });
  }
}

/**
 * Vérifie que l'utilisateur est un administrateur.
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ ok: false, error: "not authenticated" });
  }
  if (req.user.role !== "admin" && req.user.role !== "superadmin") {
    return res.status(403).json({ ok: false, error: "admin only" });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
