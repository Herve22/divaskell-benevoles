document.addEventListener("DOMContentLoaded", () => {
  const current = window.location.pathname.split("/").pop();
  const navHTML = `
    <nav class="navbar-bottom">
      <a href="/public/index.html" class="${current.includes('index') ? 'active' : ''}">
        <i class="bi bi-house-door-fill"></i><span>Accueil</span>
      </a>
      <a href="/public/creneaux-publics.html" class="${current.includes('creneaux') ? 'active' : ''}">
        <i class="bi bi-calendar-heart-fill"></i><span>Créneaux</span>
      </a>
      <a href="/public/mes-inscriptions.html" class="${current.includes('mes-inscriptions') ? 'active' : ''}">
        <i class="bi bi-person-check-fill"></i><span>Inscriptions</span>
      </a>
    </nav>
  `;
  document.body.insertAdjacentHTML("beforeend", navHTML);

  // Ajout dynamique des icônes si absentes
  if (!document.querySelector('link[href*="bootstrap-icons"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css";
    document.head.appendChild(link);
  }
});
