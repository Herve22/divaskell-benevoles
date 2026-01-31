// === Vérification du rôle et redirection automatique ===
document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const path = window.location.pathname;

  if (!user || !user.role) return; // pas connecté

  // Si un ADMIN essaie d'accéder au dossier du superadmin
  if (user.role === "admin" && path.includes("/publicsuperadmin/")) {
    console.warn("[Redirect] Un admin ne peut pas accéder à publicsuperadmin → redirection vers publicadmin");
    window.location.replace("/publicadmin/index.html");
    return;
  }

  // Si un USER essaie d'accéder à publicadmin
  if (user.role === "user" && path.includes("/publicadmin/")) {
    console.warn("[Redirect] Un utilisateur ne peut pas accéder à publicadmin → redirection vers public");
    window.location.replace("/public/index.html");
    return;
  }

  // Si un SUPERADMIN essaie d’accéder à publicadmin
  if (user.role === "superadmin" && path.includes("/publicadmin/")) {
    console.warn("[Redirect] Superadmin → redirection vers publicsuperadmin");
    window.location.replace("/publicsuperadmin/superadmin.html");
    return;
  }
});

// --- Menu Bootstrap Superadmin ---
document.addEventListener("DOMContentLoaded", () => {
  const nav = document.createElement("nav");
  nav.className = "navbar navbar-expand-lg navbar-dark bg-success fixed-top shadow";
  nav.innerHTML = `
    <div class="container-fluid">
      <a class="navbar-brand fw-bold" href="#">🌿 Superadmin</a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav ms-auto">
          <li class="nav-item"><a class="nav-link" href="users.html">👥 Utilisateurs</a></li>
          <li class="nav-item"><a class="nav-link" href="sql.html">🧩 SQL</a></li>
          <li class="nav-item"><a class="nav-link" href="/public/index.html">⬅️ Retour</a></li>
          <li class="nav-item"><a class="nav-link text-danger fw-bold" href="#" id="btn-logout">🚪 Déconnexion</a></li>
        </ul>
      </div>
    </div>
  `;

  document.body.insertBefore(nav, document.body.firstChild);

  // Active link highlighting
  const path = location.pathname.split("/").pop();
  document.querySelectorAll(".navbar-nav a").forEach(a => {
    if (a.href.endsWith(path)) a.classList.add("active");
  });

  // === Gestion de la déconnexion ===
  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("🚪 Déconnexion...");
      
      // Supprimer les données de session
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      // Rediriger vers la page de connexion
      window.location.replace("/public/index.html");
    });
  }
});