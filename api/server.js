"use strict";

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const morgan = require("morgan");
const { migrate } = require("./lib/db");
const { requireAuth, requireAdmin } = require("./middlewares/auth");

const app = express();
const PORT = process.env.PORT || 8888;

/* === LOGGING === */
const accessLogStream = fs.createWriteStream(path.join(__dirname, "access.log"), { flags: "a" });
 
 const searchRouter = require("./routes/search");
app.use("/api/search", searchRouter);

app.use("/api/inscriptionsbenevoles", require("./routes/inscriptionsbenevoles"));
app.use("/favicon.ico", express.static(path.join(__dirname, "../public/favicon.ico")));

app.use(morgan("combined", { stream: accessLogStream }));
app.use(morgan("dev"));


/* === CORE MIDDLEWARES === */
app.set("trust proxy", 1);
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
 
/* === STATIC FILES === */
app.use("/public", express.static(path.join(__dirname, "../public")));
app.use("/publicadmin", express.static(path.join(__dirname, "../publicadmin")));

/* === ROUTES === */

app.use("/api/superadmin", requireAuth, require("./routes/superadmin"));


app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", requireAuth, requireAdmin, require("./routes/users"));
app.use("/api/groupes", require("./routes/groupes"));
app.use("/api/creneaux", require("./routes/creneaux"));
app.use("/api/inscriptions", require("./routes/inscriptions"));
app.use("/api/responsables", require("./routes/responsables"));
app.use("/api/evenements", require("./routes/evenements"));
app.use("/api", require("./routes/index"));

app.use("/api/creneaux-publics", require("./routes/creneaux-publics"));


/* === HEALTH === */
app.get("/api/ping", (req, res) => res.json({ ok: true, msg: "pong" }));
app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/sessions", require("./routes/sessions"));

/* === EXAMPLE PROTECTED === */
app.get("/api/me", requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

/* === ERROR HANDLING === */
app.use((err, req, res, next) => {
  console.error("[Error]", err);
  res.status(500).json({ ok: false, error: "internal server error" });
});

app.use((req, res) => res.status(404).json({ ok: false, error: "not found" }));

app.listen(PORT, () => console.log(`[api] listening on :${PORT}`));

