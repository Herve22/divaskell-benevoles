"use strict";
const express = require("express");
const router = express.Router();

router.get("/", (req, res) => res.json({ ok: true, route: "GET /api/responsables" }));
router.post("/", (req, res) => res.json({ ok: true, route: "POST /api/responsables" }));
router.delete("/:id", (req, res) => res.json({ ok: true, route: "DELETE /api/responsables/:id" }));

module.exports = router;
