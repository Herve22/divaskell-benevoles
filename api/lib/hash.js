"use strict";

/**
 * Encode / decode simple hash pour userId.
 * Exemple : User:12 => VXNlcjoxMg==
 */
function encodeUserId(id) {
  return Buffer.from(`User:${id}`).toString("base64url");
}

function decodeUserId(hash) {
  try {
    const decoded = Buffer.from(hash, "base64url").toString("utf8");
    if (decoded.startsWith("User:")) return parseInt(decoded.split(":")[1]);
  } catch (err) {
    console.error("[hash.js] decode error:", err);
  }
  return null;
}

module.exports = { encodeUserId, decodeUserId };
