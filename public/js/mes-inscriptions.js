let inscriptions = [];

document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  
  if (!user || user.role !== "user") {
    window.location.replace("/public/index.html");
    return;
  }
  
  document.getElementById("user-name").textContent = user.username || user.email;
  
  await chargerInscriptions();
  afficherInscriptions();
  afficherStatistiques();
});

async function chargerInscriptions() {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");
    
    const res = await fetch(`/api/inscriptions?statut=confirmee`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    const data = await res.json();
    const toutesInscriptions = Array.isArray(data) ? data : [];
    
    inscriptions = toutesInscriptions.filter(i => 
      i.email === user.email || i.user_id === user.id
    );
    
    inscriptions.sort((a, b) => new Date(b.date_inscription) - new Date(a.date_inscription));
    
  } catch (err) {
    console.error("Erreur chargement inscriptions:", err);
    document.getElementById("inscriptions-container").innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle"></i> Erreur lors du chargement de vos inscriptions
      </div>
    `;
  }
}

function afficherStatistiques() {
  const total = inscriptions.length;
  const confirmees = inscriptions.filter(i => i.statut === "confirmee").length;
  
  const maintenant = new Date();
  const prochains = inscriptions.filter(i => {
    return i.debut && new Date(i.debut) > maintenant && i.statut === "confirmee";
  }).length;
  
  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-confirmees").textContent = confirmees;
  document.getElementById("stat-prochains").textContent = prochains;
}

function afficherInscriptions() {
  const container = document.getElementById("inscriptions-container");
  
  if (inscriptions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-inbox"></i>
        <h4>Aucune inscription</h4>
        <p class="text-muted">Vous n'êtes pas encore inscrit à un créneau</p>
        <a href="/public/creneaux.html" class="btn btn-primary mt-3">
          <i class="bi bi-calendar-plus"></i> Voir les créneaux disponibles
        </a>
      </div>
    `;
    return;
  }
  
  container.innerHTML = inscriptions.map(i => {
    const dateInscription = new Date(i.date_inscription);
    const dateDebut = i.debut ? new Date(i.debut) : null;
    const dateFin = i.fin ? new Date(i.fin) : null;
    const estPasse = dateDebut && dateDebut < new Date();
    
    return `
      <div class="inscription-card ${i.statut === 'annulee' ? 'annulee' : ''}">
        <div class="row align-items-center">
          <div class="col-lg-9">
            <div class="d-flex align-items-start mb-3">
              <div class="flex-grow-1">
                <h5 class="mb-1">
                  <i class="bi bi-calendar-event text-primary"></i> 
                  ${i.evenement_nom || "Événement"}
                </h5>
                <p class="mb-2 text-muted">
                  <i class="bi bi-people"></i> ${i.groupe_nom || "Groupe"}
                </p>
              </div>
              <div>
                ${i.statut === 'confirmee' 
                  ? '<span class="badge bg-success"><i class="bi bi-check-circle"></i> Confirmée</span>'
                  : '<span class="badge bg-danger"><i class="bi bi-x-circle"></i> Annulée</span>'
                }
              </div>
            </div>
            
            ${dateDebut && dateFin ? `
              <p class="mb-2">
                <i class="bi bi-clock text-secondary"></i> 
                <strong>${formatDate(dateDebut)}</strong> → ${formatDate(dateFin)}
                ${estPasse ? '<span class="badge bg-secondary ms-2">Passé</span>' : '<span class="badge bg-info ms-2">À venir</span>'}
              </p>
            ` : ''}
            
            <p class="mb-2">
              <i class="bi bi-person text-secondary"></i> 
              ${i.prenom} ${i.nom}
            </p>
            
            <p class="mb-2">
              <i class="bi bi-envelope text-secondary"></i> 
              ${i.email}
            </p>
            
            ${i.telephone ? `
              <p class="mb-2">
                <i class="bi bi-telephone text-secondary"></i> 
                ${i.telephone}
              </p>
            ` : ''}
            
            ${i.commentaire ? `
              <p class="mb-2">
                <i class="bi bi-chat-left-text text-secondary"></i> 
                <em>"${i.commentaire}"</em>
              </p>
            ` : ''}
            
            <p class="mb-0 text-muted small">
              <i class="bi bi-calendar-check"></i> 
              Inscrit le ${formatDate(dateInscription)}
            </p>
          </div>
          
          <div class="col-lg-3 text-lg-end mt-3 mt-lg-0">
            ${i.statut === 'confirmee' && !estPasse ? `
              <button class="btn btn-outline-danger w-100" onclick="annulerInscription(${i.id})">
                <i class="bi bi-x-circle"></i> Annuler
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function formatDate(date) {
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function annulerInscription(id) {
  if (!confirm("Êtes-vous sûr de vouloir annuler cette inscription ?")) {
    return;
  }
  
  try {
    const token = localStorage.getItem("token");
    
    const res = await fetch(`/api/inscriptions/${id}/statut`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ statut: "annulee" })
    });
    
    const data = await res.json();
    
    if (data.ok) {
      alert("Inscription annulée avec succès");
      await chargerInscriptions();
      afficherInscriptions();
      afficherStatistiques();
    } else {
      alert(data.error || "Erreur lors de l'annulation");
    }
  } catch (err) {
    console.error("Erreur annulation:", err);
    alert("Erreur réseau");
  }
}
