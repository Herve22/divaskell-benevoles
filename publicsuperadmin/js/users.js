// publicsuperadmin/js/users.js
document.addEventListener("DOMContentLoaded", () => {
  loadUsers();
});


async function toggleActive(id, newState) {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Session expirée, reconnecte-toi.");
    return;
  }

  try {
    const res = await fetch(`/api/users/${id}/active`, {
      method: "PATCH",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ is_active: newState })
    });

    const data = await res.json();
    console.log(`[Superadmin] PATCH /users/${id}/active réponse:`, data);

    if (!data.ok) {
      alert("Erreur: " + data.error);
      return;
    }

    // ✅ Rafraîchir visuellement sans recharger toute la page
    const row = document.querySelector(`#user-row-${id}`);
    if (row) {
      const badge = row.querySelector(".badge-active");
      if (badge) {
        badge.className = `badge badge-active bg-${newState ? "success" : "danger"}`;
        badge.textContent = newState ? "✔️ Actif" : "❌ Inactif";
      }
      const btn = row.querySelector(".btn-toggle-active");
      if (btn) {
        btn.className = `btn btn-sm btn-${newState ? "outline-danger" : "outline-success"} btn-toggle-active`;
        btn.innerHTML = newState ? '<i class="bi bi-toggle-off"></i>' : '<i class="bi bi-toggle-on"></i>';
        btn.setAttribute("onclick", `toggleActive(${id}, ${!newState})`);
      }
    }

    // 🔁 Recharge aussi la liste après 1 seconde (sécurité)
    setTimeout(loadUsers, 1000);

  } catch (err) {
    console.error("Erreur toggleActive:", err);
    alert("Erreur de communication avec le serveur");
  }
}



async function loadUsers() {
  const container = document.getElementById("users-container");
  container.innerHTML = "Chargement...";

  const token = localStorage.getItem("token");
  if (!token) {
    container.innerHTML = "🚫 Token manquant — reconnecte-toi.";
    return;
  }

  try {
    const res = await fetch("/api/users", {
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      }
    });
    const data = await res.json();
    console.log("[Superadmin] /api/users réponse:", data);

    if (!data.ok) {
      container.innerHTML = `Erreur : ${data.error || "chargement des utilisateurs"}`;
      return;
    }

    if (!data.users || !data.users.length) {
      container.innerHTML = "Aucun utilisateur trouvé.";
      return;
    }

    // === 🧾 Log clair des utilisateurs ===
    console.groupCollapsed("📋 Liste des utilisateurs (" + data.users.length + ")");
    data.users.forEach(u => {
      console.log(
        `#${u.id} | ${u.username || "(sans nom)"} | ${u.email || "-"} | rôle=${u.role} | actif=${u.is_active ? "✅" : "❌"}`
      );
    });
    console.groupEnd();

    // === Génération du tableau ===
    let html = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h2 class="h5 mb-0"><i class="bi bi-people"></i> Liste des utilisateurs</h2>
        <div>
          <button class="btn btn-outline-success btn-sm me-2" id="addUserBtn">
            <i class="bi bi-person-plus"></i> Ajouter
          </button>
          <button class="btn btn-success btn-sm" id="refreshBtn">
            <i class="bi bi-arrow-clockwise"></i> Rafraîchir
          </button>
        </div>
      </div>

      <div class="table-responsive shadow-sm rounded">
        <table class="table table-hover table-bordered align-middle mb-0">
          <thead class="table-success text-dark">
            <tr>
              <th>ID</th>
              <th>Nom</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Actif</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
    `;

    for (const u of data.users) {
      const isActive = !!u.is_active;

      html += `
        <tr>
          <td class="fw-semibold">${u.id}</td>
          <td>${u.username || "-"}</td>
          <td>${u.email || "-"}</td>
          <td>
            <span class="badge bg-${u.role === "superadmin" ? "danger" : u.role === "admin" ? "primary" : "secondary"}">
              ${u.role}
            </span>
          </td>
          <td class="text-center">
            <button 
              class="btn btn-sm toggle-active ${isActive ? "btn-success" : "btn-outline-danger"}"
              data-id="${u.id}"
              data-active="${isActive}"
            >
              ${isActive ? "✅ Actif" : "❌ Inactif"}
            </button>
          </td>
         <td class="actions-cell">
        <div class="btn-group btn-group-sm" role="group">
          <button class="btn btn-outline-primary" title="Éditer"
            onclick="editUser(${u.id}, '${u.username}', '${u.email}', '${u.role}', ${u.is_active})">
            <i class="bi bi-pencil-square"></i>
          </button>
          <button class="btn btn-outline-danger" title="Supprimer"
            onclick="deleteUser(${u.id})">
            <i class="bi bi-trash"></i>
          </button>
          <button class="btn btn-outline-${u.is_active ? "warning" : "success"}"
            title="${u.is_active ? "Désactiver" : "Activer"}"
            onclick="toggleActive(${u.id}, ${!u.is_active})">
            <i class="bi bi-${u.is_active ? "toggle-off" : "toggle-on"}"></i>
          </button>
        </div>
      </td>
        </tr>`;
    }

    html += `
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;

    document.getElementById("refreshBtn").addEventListener("click", loadUsers);
    document.getElementById("addUserBtn").addEventListener("click", openAddUserModal);

    initToggleButtons();

  } catch (err) {
    console.error("[Superadmin] Erreur JS :", err);
    container.innerHTML = `<p class="text-danger">Erreur: ${err.message}</p>`;
  }
}



// === ACTIVATION / DÉSACTIVATION ===
async function toggleUserActive(id, newState) {
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`/api/users/${id}/active`, {
      method: "PATCH",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ is_active: newState })
    });
    const data = await res.json();
    console.log("[Superadmin] toggle active:", data);

    // ✅ Rafraîchit visuellement le bouton
    const btn = document.querySelector(`.toggle-active[data-id="${id}"]`);
    if (btn) {
      const state = Boolean(newState);
      btn.dataset.active = state ? "true" : "false";
      btn.classList.toggle("btn-success", state);
      btn.classList.toggle("btn-outline-danger", !state);
      btn.innerHTML = state ? "✅ Actif" : "❌ Inactif";
    }
  } catch (err) {
    console.error("[toggleUserActive] Erreur:", err);
    alert("Erreur activation utilisateur: " + err.message);
  }
}

// === Ajout des écouteurs ===
function initToggleButtons() {
  document.querySelectorAll(".toggle-active").forEach(el => {
    el.addEventListener("click", async () => {
      const id = el.dataset.id;
      const isActive = el.dataset.active === "true";
      await toggleUserActive(id, !isActive);
    });
  });
}


// === MODALE AJOUT UTILISATEUR ===
function openAddUserModal() {
  const modalHtml = `
  <div class="modal fade" id="addUserModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header bg-success text-white">
          <h5 class="modal-title"><i class="bi bi-person-plus"></i> Ajouter un utilisateur</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <form id="addUserForm">
            <div class="mb-3">
              <label class="form-label">Nom</label>
              <input type="text" class="form-control" id="newUsername" required>
            </div>
            <div class="mb-3">
              <label class="form-label">Email</label>
              <input type="email" class="form-control" id="newEmail" required>
            </div>
            <div class="mb-3">
              <label class="form-label">Mot de passe</label>
              <input type="password" class="form-control" id="newPassword" required>
            </div>
            <div class="mb-3">
              <label class="form-label">Rôle</label>
              <select id="newRole" class="form-select">
                <option value="user" selected>Utilisateur</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
          <button class="btn btn-primary" id="saveNewUserBtn">💾 Créer</button>
        </div>
      </div>
    </div>
  </div>`;

  const existing = document.getElementById("addUserModal");
  if (existing) existing.remove();
  document.body.insertAdjacentHTML("beforeend", modalHtml);

  const modal = new bootstrap.Modal(document.getElementById("addUserModal"));
  modal.show();

  document.getElementById("saveNewUserBtn").addEventListener("click", async () => {
    await createUser();
    modal.hide();
    loadUsers();
  });
}

async function createUser() {
  const token = localStorage.getItem("token");
  const payload = {
    username: document.getElementById("newUsername").value,
    email: document.getElementById("newEmail").value,
    password: document.getElementById("newPassword").value,
    role: document.getElementById("newRole").value
  };

  try {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log("[Superadmin] create user:", data);
  } catch (err) {
    alert("Erreur création utilisateur: " + err.message);
  }
}

// === ÉDITION / SUPPRESSION ===
function editUser(id, username, email, role, active) {
  alert("📝 Édition à venir pour " + username);
}

async function deleteUser(id) {
  if (!confirm("❌ Supprimer définitivement l’utilisateur #" + id + " ?")) return;
  const token = localStorage.getItem("token");
  try {
    await fetch(`/api/users/${id}`, { method: "DELETE", headers: { "Authorization": "Bearer " + token } });
    loadUsers();
  } catch (err) {
    alert("Erreur suppression utilisateur: " + err.message);
  }
}
