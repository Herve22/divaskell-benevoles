document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  
  if (!user || user.role !== "user") {
    return;
  }
  
  const currentPath = window.location.pathname;
  
  const menuHTML = `
    <nav class="navbar navbar-expand-lg sticky-top" style="background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); box-shadow: 0 2px 20px rgba(0,0,0,0.1);">
      <div class="container">
        <a class="navbar-brand fw-bold text-primary" href="/public/creneaux-publics.html">
          <i class="bi bi-calendar-heart"></i> Bénévoles
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav ms-auto align-items-center">
            <li class="nav-item">
              <a class="nav-link ${currentPath.includes('creneaux-publics.html') ? 'active fw-bold' : ''}" href="/public/creneaux-publics.html">
                <i class="bi bi-calendar-event"></i> Créneaux publics
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link ${currentPath.includes('mes-inscriptions.html') ? 'active fw-bold' : ''}" href="/public/mes-inscriptions.html">
                <i class="bi bi-list-check"></i> Mes inscriptions
              </a>
            </li>
            <li class="nav-item ms-3">
              <span class="badge bg-primary" id="user-name">${user.username || user.email}</span>
            </li>
            <li class="nav-item ms-2">
              <button class="btn btn-outline-danger btn-sm" onclick="logout()">
                <i class="bi bi-box-arrow-right"></i> Déconnexion
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  `;
  
  document.body.insertAdjacentHTML('afterbegin', menuHTML);
});

function logout() {
  fetch("/api/auth/logout", { method: "POST" })
    .then(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.replace("/public/index.html");
    })
    .catch(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.replace("/public/index.html");
    });
}
