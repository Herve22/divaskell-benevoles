// === Vérification d'accès admin ===
console.log("[Admin.js] Chargement du script...");

let userDataRaw = localStorage.getItem("user");
console.log("[Admin.js] Données brutes localStorage.user =", userDataRaw);

let user = null;
try {
  user = JSON.parse(userDataRaw);
} catch (e) {
  console.warn("[Admin.js] Erreur parsing JSON:", e);
}

if (!user) {
  console.warn("[Admin.js] Aucun utilisateur connecté -> redirection login");
  alert("Aucun utilisateur connecté.");
  window.location.href = "/public/index.html";
} else {
  console.log("[Admin.js] Utilisateur détecté:", user);
  if (user.role !== "admin" && user.role !== "superadmin") {
    console.warn("[Admin.js] Rôle non admin:", user.role);
    alert("Accès réservé à l'administration. Redirection...");
    window.location.href = "/public/index.html";
  } else {
    console.log("[Admin.js] Accès admin autorisé ✅");
  }
}

// === Affichage des infos utilisateur ===
document.addEventListener("DOMContentLoaded", () => {
  if (user) {
    const usernameEl = document.getElementById("username");
    const userroleEl = document.getElementById("userrole");
    if (usernameEl) usernameEl.textContent = user.username || "(inconnu)";
    if (userroleEl) userroleEl.textContent = "Rôle : " + (user.role || "non défini");
    console.log("[Admin.js] DOM prêt – utilisateur affiché:", user.username);
  } else {
    console.warn("[Admin.js] DOM prêt mais aucun user trouvé");
  }
});

// NOTE: La fonction logout() est maintenant dans menu.js
