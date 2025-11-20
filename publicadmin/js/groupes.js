const API = "/api/groupes";
const TOKEN = localStorage.getItem("token");

let currentModal = null;
let isEditMode = false;

console.log("[GROUPES] Script chargé, TOKEN:", TOKEN ? "présent" : "absent");

function showMessage(text, type = "info") {
  console.log("[showMessage]", type, text);
  const msg = document.getElementById("message");
  if (!msg) {
    console.error("[showMessage] Element #message introuvable");
    return;
  }
  msg.textContent = text;
  msg.className = `alert alert-${type}`;
  msg.classList.remove("d-none");
  setTimeout(() => msg.classList.add("d-none"), 4000);
}

async function loadGroupes() {
  console.log("[loadGroupes] Début du chargement...");
  const container = document.getElementById("groupes-list");
  if (!container) {
    console.error("[loadGroupes] Element #groupes-list introuvable");
    return;
  }
  
  container.innerHTML = '<div class="col-12 text-center"><div class="spinner-border"></div></div>';

  try {
    console.log("[loadGroupes] Fetch vers", API);
    const res = await fetch(API, {
      headers: { "Authorization": "Bearer " + TOKEN }
    });
    console.log("[loadGroupes] Response status:", res.status);
    const data = await res.json();
    console.log("[loadGroupes] Data reçue:", data);

    // CORRECTION: Gérer les deux formats
    const groupes = Array.isArray(data) ? data : (data.groupes || []);
    console.log("[loadGroupes] Groupes après transformation:", groupes);

    if (groupes.length === 0) {
      console.log("[loadGroupes] Aucun groupe");
      container.innerHTML = '<div class="col-12 text-center text-muted">Aucun groupe créé</div>';
      return;
    }

    console.log("[loadGroupes] Nombre de groupes:", groupes.length);
    container.innerHTML = "";
    
    groupes.forEach((grp, index) => {
      console.log(`[loadGroupes] Traitement groupe #${index}:`, grp);
      
      const col = document.createElement("div");
      col.className = "col-md-6 col-lg-4 mb-3";
      
      const responsable = grp.responsable || "Non assigné";
      const evenement = grp.evenement_nom || "Aucun événement";
      
      col.innerHTML = `
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <h5 class="card-title">${grp.nom}</h5>
            <p class="card-text text-muted">${grp.description || "Pas de description"}</p>
            <hr>
            <p class="mb-1"><small><strong>👤 Responsable:</strong> ${responsable}</small></p>
            <p class="mb-1"><small><strong>📅 Événement:</strong> ${evenement}</small></p>
            ${grp.contact_email ? `<p class="mb-1"><small><strong>📧</strong> ${grp.contact_email}</small></p>` : ''}
            ${grp.contact_tel ? `<p class="mb-1"><small><strong>📞</strong> ${grp.contact_tel}</small></p>` : ''}
          </div>
          <div class="card-footer d-flex justify-content-between bg-light">
            <button class="btn btn-sm btn-warning" onclick="editGroupe(${grp.id})">
              <i class="bi bi-pencil"></i> Modifier
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteGroupe(${grp.id})">
              <i class="bi bi-trash"></i> Supprimer
            </button>
          </div>
        </div>
      `;
      
      container.appendChild(col);
    });
    
    console.log("[loadGroupes] Tous les groupes ajoutés");

  } catch (err) {
    console.error("[loadGroupes] Exception:", err);
    container.innerHTML = '<div class="col-12"><div class="alert alert-danger">Erreur réseau: ' + err.message + '</div></div>';
  }
}

async function loadResponsables(selectId = "groupeResp") {
  console.log("[loadResponsables] Chargement pour", selectId);
  const select = document.getElementById(selectId);
  if (!select) {
    console.error(`[loadResponsables] Element #${selectId} introuvable`);
    return;
  }
  
  try {
    const res = await fetch("/api/users", {
      headers: { "Authorization": "Bearer " + TOKEN }
    });
    const data = await res.json();
    
    // CORRECTION: Gérer les deux formats
    const users = Array.isArray(data) ? data : (data.users || []);
    
    select.innerHTML = '<option value="">-- Aucun --</option>';
    const filtered = users.filter(u => u.role === "admin" || u.role === "user");
    
    filtered.forEach(u => {
      const opt = document.createElement("option");
      opt.value = u.id;
      opt.textContent = `${u.username} (${u.role})`;
      select.appendChild(opt);
    });
    console.log("[loadResponsables] Select rempli avec", filtered.length, "options");
  } catch (err) {
    console.error("[loadResponsables] Exception:", err);
  }
}

async function loadEvenements(selectId = "groupeEvent") {
  console.log("[loadEvenements] Chargement pour", selectId);
  const select = document.getElementById(selectId);
  if (!select) {
    console.error(`[loadEvenements] Element #${selectId} introuvable`);
    return;
  }
  
  try {
    const res = await fetch("/api/evenements", {
      headers: { "Authorization": "Bearer " + TOKEN }
    });
    const data = await res.json();
    
    // CORRECTION: Gérer les deux formats
    const evenements = Array.isArray(data) ? data : (data.evenements || []);
    
    select.innerHTML = '<option value="">-- Aucun --</option>';
    
    evenements.forEach(e => {
      const opt = document.createElement("option");
      opt.value = e.id;
      opt.textContent = e.nom;
      select.appendChild(opt);
    });
    console.log("[loadEvenements] Select rempli avec", evenements.length, "événements");
  } catch (err) {
    console.error("[loadEvenements] Exception:", err);
  }
}

function openCreateModal() {
  console.log("[openCreateModal] Ouverture modale création");
  isEditMode = false;
  document.getElementById("modalGroupeTitle").textContent = "➕ Créer un groupe";
  document.getElementById("formGroupe").reset();
  document.getElementById("groupeId").value = "";
  
  loadResponsables("groupeResp");
  loadEvenements("groupeEvent");
  
  if (!currentModal) {
    currentModal = new bootstrap.Modal(document.getElementById("modalGroupe"));
  }
  currentModal.show();
}

async function editGroupe(id) {
  console.log("[editGroupe] ID:", id);
  try {
    const res = await fetch(`${API}/${id}`, {
      headers: { "Authorization": "Bearer " + TOKEN }
    });
    const data = await res.json();
    
    // CORRECTION: Gérer les deux formats
    const grp = data.groupe || data;
    
    if (!grp || !grp.id) {
      console.error("[editGroupe] Groupe introuvable");
      showMessage("Groupe introuvable", "danger");
      return;
    }

    isEditMode = true;
    
    document.getElementById("modalGroupeTitle").textContent = "✏️ Modifier le groupe";
    document.getElementById("groupeId").value = grp.id;
    document.getElementById("groupeNom").value = grp.nom;
    document.getElementById("groupeDesc").value = grp.description || "";
    document.getElementById("groupeEmail").value = grp.contact_email || "";
    document.getElementById("groupeTel").value = grp.contact_tel || "";
    
    await loadResponsables("groupeResp");
    await loadEvenements("groupeEvent");
    
    document.getElementById("groupeResp").value = grp.responsable_id || "";
    document.getElementById("groupeEvent").value = grp.evenement_id || "";
    
    if (!currentModal) {
      currentModal = new bootstrap.Modal(document.getElementById("modalGroupe"));
    }
    currentModal.show();
    
  } catch (err) {
    console.error("[editGroupe] Exception:", err);
    showMessage("Erreur réseau", "danger");
  }
}

async function saveGroupe(e) {
  e.preventDefault();
  console.log("[saveGroupe] Début sauvegarde");
  
  const id = document.getElementById("groupeId").value;
  const payload = {
    nom: document.getElementById("groupeNom").value.trim(),
    description: document.getElementById("groupeDesc").value.trim(),
    contact_email: document.getElementById("groupeEmail").value.trim() || null,
    contact_tel: document.getElementById("groupeTel").value.trim() || null,
    responsable_id: document.getElementById("groupeResp").value || null,
    evenement_id: document.getElementById("groupeEvent").value || null
  };

  try {
    const url = id ? `${API}/${id}` : API;
    const method = id ? "PUT" : "POST";
    
    const res = await fetch(url, {
      method,
      headers: {
        "Authorization": "Bearer " + TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    
    if (data.ok) {
      showMessage(id ? "✅ Groupe modifié" : "✅ Groupe créé", "success");
      if (currentModal) currentModal.hide();
      loadGroupes();
    } else {
      showMessage("❌ Erreur: " + data.error, "danger");
    }
    
  } catch (err) {
    console.error("[saveGroupe] Exception:", err);
    showMessage("❌ Erreur réseau", "danger");
  }
}

async function deleteGroupe(id) {
  console.log("[deleteGroupe] ID:", id);
  if (!confirm("⚠️ Supprimer ce groupe définitivement ?")) return;
  
  try {
    const res = await fetch(`${API}/${id}`, {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + TOKEN }
    });
    const data = await res.json();
    
    if (data.ok) {
      showMessage("✅ Groupe supprimé", "success");
      loadGroupes();
    } else {
      showMessage("❌ Erreur: " + data.error, "danger");
    }
    
  } catch (err) {
    console.error("[deleteGroupe] Exception:", err);
    showMessage("❌ Erreur réseau", "danger");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  console.log("[INIT] DOMContentLoaded - Démarrage initialisation");
  
  loadGroupes();
  
  const btnNew = document.getElementById("btnNewGroupe");
  if (btnNew) {
    console.log("[INIT] Bouton #btnNewGroupe trouvé ✅");
    btnNew.addEventListener("click", openCreateModal);
  } else {
    console.error("[INIT] Bouton #btnNewGroupe introuvable ❌");
  }
  
  const form = document.getElementById("formGroupe");
  if (form) {
    console.log("[INIT] Formulaire #formGroupe trouvé ✅");
    form.addEventListener("submit", saveGroupe);
  } else {
    console.error("[INIT] Formulaire #formGroupe introuvable ❌");
  }
  
  console.log("[INIT] Initialisation terminée");
});
