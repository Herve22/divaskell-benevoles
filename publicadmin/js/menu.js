// === MENU ADMIN AUTO-INJECTÉ ===
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("globalSearchOverlay")) {
    return;
  }

  const menuHTML = `
  <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
    <div class="container-fluid">
      <a class="navbar-brand" href="/publicadmin/index.html">
        <i class="bi bi-shield-check"></i> Admin Bénévoles
      </a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav me-auto">
          <li class="nav-item"><a class="nav-link" href="/publicadmin/index.html"><i class="bi bi-house"></i> Accueil</a></li>
          <li class="nav-item"><a class="nav-link" href="/publicadmin/evenements.html"><i class="bi bi-calendar-event"></i> Événements</a></li>
          <li class="nav-item"><a class="nav-link" href="/publicadmin/groupes.html"><i class="bi bi-people"></i> Groupes</a></li>
          <li class="nav-item"><a class="nav-link" href="/publicadmin/eventgroupes.html"><i class="bi bi-diagram-3"></i> Événements-Groupes</a></li>
          <li class="nav-item"><a class="nav-link" href="/publicadmin/inscriptions.html"><i class="bi bi-person-check"></i> Inscriptions</a></li>
          <li class="nav-item"><a class="nav-link" href="/publicadmin/planning.html"><i class="bi bi-calendar-week"></i> Planning</a></li>
          <li class="nav-item"><a class="nav-link" href="#" id="menu-open-search"><i class="bi bi-search"></i> Recherche</a></li>
        </ul>

        <div class="d-flex gap-2 align-items-center">
          <button class="btn btn-outline-light btn-sm" id="btn-global-search" title="Rechercher (Ctrl+K)">
            <i class="bi bi-search"></i>
          </button>
          <button class="btn btn-outline-light btn-sm" onclick="logout()" title="Déconnexion">
            <i class="bi bi-box-arrow-right"></i>
          </button>
        </div>
      </div>
    </div>
  </nav>

  <!-- === MODALE DE RECHERCHE === -->
  <div id="globalSearchOverlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.75); z-index: 2000; display: none; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 80px;">
    <div style="background: white; border-radius: 1rem; box-shadow: 0 0.5rem 1rem rgba(0,0,0,0.15); padding: 1.5rem; width: 75%; max-width: 800px;">
      <div class="d-flex align-items-center mb-3">
        <i class="bi bi-search me-2 text-secondary"></i>
        <input id="globalSearchInput" type="text" class="form-control form-control-lg flex-grow-1" placeholder="Rechercher un bénévole, un créneau, un groupe...">
        <button class="btn btn-outline-secondary ms-2" id="closeGlobalSearch"><i class="bi bi-x-lg"></i></button>
      </div>
      <div id="globalSearchResults" style="max-height:60vh; overflow-y:auto;"></div>
    </div>
  </div>
  `;

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = menuHTML;
  
  while (tempDiv.firstChild) {
    document.body.insertBefore(tempDiv.firstChild, document.body.firstChild);
  }

  if (!document.querySelector('link[href*="bootstrap-icons"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css";
    document.head.appendChild(link);
  }

  const overlay = document.getElementById("globalSearchOverlay");
  const input = document.getElementById("globalSearchInput");
  const results = document.getElementById("globalSearchResults");

  function openSearch() {
    overlay.style.display = "flex";
    input.value = "";
    results.innerHTML = "";
    setTimeout(() => input.focus(), 100);
  }

  function closeSearch() {
    overlay.style.display = "none";
  }

  document.getElementById("btn-global-search").addEventListener("click", openSearch);
  document.getElementById("menu-open-search").addEventListener("click", (e) => {
    e.preventDefault();
    openSearch();
  });
  document.getElementById("closeGlobalSearch").addEventListener("click", closeSearch);

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openSearch();
    }
    if (e.key === "Escape") closeSearch();
  });

  let timer = null;
  input.addEventListener("input", () => {
    const q = input.value.trim();
    if (q.length < 3) {
      results.innerHTML = "<div class='text-muted text-center py-3'>Tapez au moins 3 caractères...</div>";
      return;
    }

    clearTimeout(timer);
    timer = setTimeout(async () => {
      results.innerHTML = "<div class='text-center py-3 text-secondary'><div class='spinner-border spinner-border-sm'></div> Recherche...</div>";
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { credentials: "include" });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Erreur recherche");

        if (!data.results.length) {
          results.innerHTML = "<div class='text-muted text-center py-3'>Aucun résultat.</div>";
          return;
        }

        results.innerHTML = data.results.map(r => `<div class="border-bottom py-2 px-3 bg-white hover-bg-light rounded-3 shadow-sm mb-2">
            <div class="d-flex justify-content-between align-items-start">
              <div class="flex-grow-1">
                <strong class="d-block">${r.label}</strong>
                <span class="text-muted small d-block mb-1">(${r.type})</span>
                <span class="text-muted small">${r.info || ""}</span>
              </div>
              <div class="d-flex flex-column ms-2">
                ${r.link ? `<a href="${r.link}" class="btn btn-sm btn-outline-secondary mb-1" title="Voir dans l'administration"><i class="bi bi-gear"></i></a>` : ""}
                ${r.publicLink ? `<a href="${r.publicLink}" class="btn btn-sm btn-outline-primary" title="Ouvrir la page publique"><i class="bi bi-box-arrow-up-right"></i></a>` : ""}
              </div>
            </div>
          </div>
        `).join("");

      } catch (err) {
        console.error("[Search] erreur:", err);
        results.innerHTML = `<div class='text-danger text-center py-3'>Erreur serveur : ${err.message}</div>`;
      }
    }, 400);
  });
});

async function logout() {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch (err) {
    console.error("[Menu] Erreur logout API:", err);
  }
  localStorage.clear();
  window.location.replace("/public/index.html");
}
window.logout = logout;