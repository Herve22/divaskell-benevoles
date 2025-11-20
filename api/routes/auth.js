"use strict";

const express = require("express");
const router = express.Router();
const { db } = require("../lib/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const JWT_SECRET = process.env.JWT_SECRET || "change-me-secret";

function log(...args) {
  console.log(new Date().toISOString(), "[auth]", ...args);
}

// === ACTIVATION DU COMPTE ===
router.get("/activate", (req, res) => {
  const { token } = req.query;
  log("GET /activate token=", token ? token.slice(0, 8) + "..." : "null");

  if (!token) {
    log("activate: token missing");
    return res.status(400).json({ ok: false, error: "Aucun token d'activation fourni." });
  }

  const user = db
    .prepare("SELECT id, username, email, is_active FROM users WHERE token_activation=?")
    .get(token);

  if (!user) {
    log("activate: token not found");
    return res.status(404).json({ ok: false, error: "Le lien d'activation est invalide ou a expiré." });
  }

  if (user.is_active) {
    log("activate: already active", user.username);
    return res.status(200).json({ ok: true, message: "Compte déjà activé !" });
  }

  db.prepare("UPDATE users SET is_active=1, token_activation=NULL WHERE id=?").run(user.id);
  log("activate: activated", user.username, user.email);
  
  // ✅ Retourner JSON au lieu de redirection
  res.status(200).json({ ok: true, message: "Compte activé avec succès !" });
});

// === INSCRIPTION ===
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, role = "user" } = req.body;
    log("POST /register", email, username);

    if (!username || !email || !password) {
      log("register: missing fields");
      return res.status(400).json({ ok: false, error: "missing fields" });
    }

    const exists = db.prepare("SELECT id FROM users WHERE email=?").get(email);
    if (exists) {
      log("register: email exists", email);
      return res.status(409).json({ ok: false, error: "email already used" });
    }

    const hash = await bcrypt.hash(password, 10);
    const tokenActivation = crypto.randomBytes(32).toString("hex");

    db.prepare(
      "INSERT INTO users (username, email, password, role, token_activation, is_active) VALUES (?, ?, ?, ?, ?, 0)"
    ).run(username, email, hash, role, tokenActivation);

    // Envoi du mail
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    // ✅ CORRECTION : Lien vers la page HTML au lieu de l'API directement
    const activationUrl = `${process.env.APP_URL}/public/activation.html?token=${tokenActivation}`;

    await transporter.sendMail({
      from: `"Bénévoles" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Activation de votre compte bénévole 🎉",
      html: `
        <p>Bonjour <b>${username}</b>,</p>
        <p>Merci de votre inscription sur l'application des bénévoles 💚</p>
        <p>👉 Cliquez sur le lien suivant pour activer votre compte :</p>
        <p><a href="${activationUrl}">${activationUrl}</a></p>
        <p>À bientôt 👋</p>
      `,
    });

    log("register: mail sent to", email);
    res.json({ ok: true, message: "Activation mail sent" });
  } catch (err) {
    log("register: error", err.message || err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

// === CONNEXION ===
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;
    log("POST /login", identifier);

    if (!identifier || !password) {
      log("login: missing fields");
      return res.status(400).json({ ok: false, error: "missing fields" });
    }

    const user = db
      .prepare("SELECT id, username, email, password, role, is_active FROM users WHERE username = ? OR email = ?")
      .get(identifier, identifier);

    if (!user) {
      log("login: user not found for", identifier);
      return res.status(401).json({ ok: false, error: "invalid credentials" });
    }

    if (!user.is_active) {
      log("login: attempt before activation for", user.email);
      return res.status(403).json({ ok: false, error: "account not activated" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      log("login: invalid password for", identifier);
      return res.status(401).json({ ok: false, error: "invalid credentials" });
    }

    const token = jwt.sign(
      { uid: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 7 * 24 * 3600 * 1000,
      path: "/",
    });

    log("login: success for", user.username, "role=", user.role);
    
    return res.json({
      ok: true,
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    log("login: error", err.message || err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

// === DÉCONNEXION ===
router.post("/logout", (req, res) => {
  res.clearCookie("token", { path: "/" });
  log("logout");
  res.json({ ok: true });
});

// === VERIFY TOKEN ===
router.get("/verify", (req, res) => {
  const auth = req.headers.authorization || "";
  const parts = auth.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    log("verify: bad auth header");
    return res.status(401).json({ ok: false, error: "missing or bad auth header" });
  }

  try {
    const payload = jwt.verify(parts[1], JWT_SECRET);
    const user = db
      .prepare("SELECT id, username, email, role FROM users WHERE id = ?")
      .get(payload.uid);
    if (!user) {
      log("verify: user not found uid=", payload.uid);
      return res.status(401).json({ ok: false, error: "user not found" });
    }
    log("verify: ok", user.username);
    res.json({ ok: true, user });
  } catch (err) {
    log("verify: invalid token", err.message || err);
    res.status(401).json({ ok: false, error: "invalid token" });
  }
});

module.exports = router;