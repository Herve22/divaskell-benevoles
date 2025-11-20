const API = "/api/evenements";
const TOKEN = localStorage.getItem("token");

async function loadEvents() {
  document.getElementById("message").textContent = "";
  try {
    const res = await fetch(API, {
      headers: { "Authorization": "Bearer " + TOKEN }
    });
    const data = await res.json();
    
    // CORRECTION: Gérer les deux formats (tableau direct ou objet)
    const evenements = Array.isArray(data) ? data : (data.evenements || []);
    
    const tbody = document.querySelector("#events-table tbody");
    tbody.innerHTML = "";
    
    if (evenements.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center">Aucun événement</td></tr>';
      return;
    }

    evenements.forEach(evt => {
      const statutBadge = getStatutBadge(evt.statut);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${evt.id}</td>
        <td><strong>${evt.nom}</strong></td>
        <td>${evt.lieu || "-"}</td>
        <td>${formatDate(evt.date_debut)}</td>
        <td>${formatDate(evt.date_fin)}</td>
        <td>${statutBadge}</td>
        <td>
          <a href="/publicadmin/eventgroupes.html?id=${evt.id}" class="btn btn-info btn-sm">👥 Groupes</a>
        </td>
        <td>
          <button class="btn btn-warning btn-sm" onclick='editEvent(${JSON.stringify(evt)})'>✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteEvent(${evt.id})">🗑️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("[Events] Erreur:", err);
    showMessage("Erreur réseau", "error");
  }
}

function getStatutBadge(statut) {
  const badges = {
    "brouillon": '<span class="badge bg-warning text-dark">Brouillon</span>',
    "ouvert": '<span class="badge bg-success">Ouvert</span>',
    "clos": '<span class="badge bg-danger">Clos</span>'
  };
  return badges[statut] || statut;
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleString("fr-FR", { 
    day: "2-digit", 
    month: "2-digit", 
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function openModal(event = null) {
  const modal = document.getElementById("modal");
  const title = document.getElementById("modal-title");
  const form = document.getElementById("eventForm");
  
  if (event) {
    title.textContent = "Modifier l'événement";
    document.getElementById("event-id").value = event.id;
    document.getElementById("nom").value = event.nom;
    document.getElementById("lieu").value = event.lieu || "";
    document.getElementById("date_debut").value = event.date_debut ? event.date_debut.slice(0, 16) : "";
    document.getElementById("date_fin").value = event.date_fin ? event.date_fin.slice(0, 16) : "";
    document.getElementById("statut").value = event.statut || "brouillon";
    document.getElementById("description").value = event.description || "";
  } else {
    title.textContent = "Nouvel événement";
    form.reset();
    document.getElementById("event-id").value = "";
  }
  
  modal.style.display = "flex";
}

function editEvent(event) { openModal(event); }
function closeModal() { document.getElementById("modal").style.display = "none"; }

async function saveEvent(e) {
  e.preventDefault();
  const id = document.getElementById("event-id").value;
  const payload = {
    nom: document.getElementById("nom").value.trim(),
    lieu: document.getElementById("lieu").value.trim(),
    date_debut: document.getElementById("date_debut").value || null,
    date_fin: document.getElementById("date_fin").value || null,
    statut: document.getElementById("statut").value,
    description: document.getElementById("description").value.trim()
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
      showMessage(id ? "✅ Événement modifié" : "✅ Événement créé", "success");
      closeModal();
      loadEvents();
    } else showMessage("❌ Erreur: " + data.error, "error");
  } catch (err) {
    console.error("[SaveEvent] Erreur:", err);
    showMessage("❌ Erreur réseau", "error");
  }
}

async function deleteEvent(id) {
  if (!confirm("Supprimer cet événement ?")) return;
  try {
    const res = await fetch(`${API}/${id}`, {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + TOKEN }
    });
    const data = await res.json();
    if (data.ok) {
      showMessage("✅ Événement supprimé", "success");
      loadEvents();
    } else showMessage("❌ Erreur: " + data.error, "error");
  } catch (err) {
    console.error("[DeleteEvent] Erreur:", err);
    showMessage("❌ Erreur réseau", "error");
  }
}

function showMessage(text, type) {
  const msg = document.getElementById("message");
  msg.textContent = text;
  msg.className = type === "success" ? "success" : "error";
  setTimeout(() => msg.textContent = "", 3000);
}

document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
window.addEventListener("DOMContentLoaded", loadEvents);
