let evenements = [];
let groupes = [];
let creneaux = [];
let creneauxFiltres = [];

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 [CRENEAUX] Page chargée");
  
  const user = JSON.parse(localStorage.getItem("user") || "null");
  
  if (!user || user.role !== "user") {
    console.log("❌ [CRENEAUX] User non connecté ou mauvais rôle");
    window.location.replace("/public/index.html");
    return;
  }
  
  console.log("✅ [CRENEAUX] User connecté:", user);
  document.getElementById("user-name").textContent = user.username || user.email;
  
  await chargerDonnees();
  remplirFiltres();
  afficherCreneaux();
  
  document.getElementById("filtreEvenement").addEventListener("change", onChangeFiltres);
  document.getElementById("filtreGroupe").addEventListener("change", onChangeFiltres);
  document.getElementById("searchInput").addEventListener("input", onChangeFiltres);
  
  document.getElementById("inscriptionForm").addEventListener("submit", soumetreInscription);
});

async function chargerDonnees() {
  console.log("📡 [CHARGEMENT] Début du chargement des données...");
  
  try {
    const token = localStorage.getItem("token");
    console.log("🔑 [CHARGEMENT] Token:", token ? "Présent" : "Absent");
    
    const headers = { "Authorization": `Bearer ${token}` };
    
    console.log("📡 [CHARGEMENT] Fetch evenements, groupes, creneaux...");
    const [resEvenements, resGroupes, resCreneaux] = await Promise.all([
      fetch("/api/evenements", { headers }),
      fetch("/api/groupes", { headers }),
      fetch("/api/creneaux", { headers })
    ]);
    
    console.log("📊 [CHARGEMENT] Status:", {
      evenements: resEvenements.status,
      groupes: resGroupes.status,
      creneaux: resCreneaux.status
    });
    
    const dataEvenements = await resEvenements.json();
    const dataGroupes = await resGroupes.json();
    const dataCreneaux = await resCreneaux.json();
    
    console.log("📦 [CHARGEMENT] Données brutes:", {
      evenements: dataEvenements,
      groupes: dataGroupes,
      creneaux: dataCreneaux
    });
    
    // ✅ APRÈS (correct)
evenements = Array.isArray(dataEvenements) 
  ? dataEvenements 
  : (dataEvenements.evenements || []);
  
groupes = Array.isArray(dataGroupes) 
  ? dataGroupes 
  : (dataGroupes.groupes || []);
  
creneaux = Array.isArray(dataCreneaux) 
  ? dataCreneaux 
  : (dataCreneaux.creneaux || []);
    
    console.log("✅ [CHARGEMENT] Données transformées:", {
      evenements: evenements.length,
      groupes: groupes.length,
      creneaux: creneaux.length
    });
    
    console.log("📋 [DEBUG] Détail groupes:", groupes);
    console.log("📋 [DEBUG] Détail événements:", evenements);
    console.log("📋 [DEBUG] Détail créneaux:", creneaux);
    
    console.log("🔄 [CHARGEMENT] Enrichissement des créneaux avec inscriptions...");
    
    creneaux = await Promise.all(creneaux.map(async (c, index) => {
      console.log(`📋 [CRENEAU ${index + 1}/${creneaux.length}] Créneau brut:`, c);
      console.log(`  ├─ ID=${c.id}, groupe_id=${c.groupe_id}`);
      
      const groupe = groupes.find(g => g.id === c.groupe_id);
      console.log(`  ├─ Recherche groupe avec id=${c.groupe_id} dans:`, groupes.map(g => ({id: g.id, nom: g.nom, evenement_id: g.evenement_id})));
      console.log(`  ├─ Groupe trouvé:`, groupe);
      
      if (groupe) {
        console.log(`  ├─ Groupe.evenement_id = ${groupe.evenement_id} (type: ${typeof groupe.evenement_id})`);
      }
      
      const evenement = groupe ? evenements.find(e => e.id === groupe.evenement_id) : null;
      console.log(`  ├─ Recherche événement avec id=${groupe?.evenement_id} dans:`, evenements.map(e => ({id: e.id, nom: e.nom})));
      console.log(`  ├─ Événement trouvé:`, evenement);
      
      console.log(`  ├─ Fetch inscriptions pour créneau ${c.id}...`);
      const resInscriptions = await fetch(`/api/inscriptions?creneau_id=${c.id}&statut=confirmee`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      console.log(`  ├─ Status inscriptions: ${resInscriptions.status}`);
      
      const inscriptionsData = await resInscriptions.json();
      const inscriptions = Array.isArray(inscriptionsData) ? inscriptionsData : [];
      const nbInscrits = inscriptions.length;
      
      console.log(`  └─ Inscriptions: ${nbInscrits}/${c.nb_max}`);
      
      const creneauEnrichi = {
        ...c,
        groupe_nom: groupe?.nom || "Sans groupe",
        evenement_nom: evenement?.nom || "Sans événement",
        evenement_id: evenement?.id || null,
        nb_inscrits: nbInscrits,
        places_restantes: c.nb_max - nbInscrits
      };
      
      console.log(`  🎯 [CRENEAU ENRICHI]:`, creneauEnrichi);
      
      return creneauEnrichi;
    }));
    
    console.log("✅ [CHARGEMENT] Créneaux enrichis:", creneaux);
    
    creneauxFiltres = [...creneaux];
    console.log("✅ [CHARGEMENT] Terminé avec succès");
    
  } catch (err) {
    console.error("❌ [CHARGEMENT] Erreur:", err);
    document.getElementById("creneaux-container").innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle"></i> Erreur lors du chargement des données
        <pre>${err.message}</pre>
      </div>
    `;
  }
}

function remplirFiltres() {
  console.log("🔧 [FILTRES] Remplissage des filtres...");
  console.log("🔧 [FILTRES] Créneaux disponibles:", creneaux.length);
  console.log("🔧 [FILTRES] Événements disponibles:", evenements.length);
  console.log("🔧 [FILTRES] Créneaux détaillés:", creneaux);
  
  const selectEvenement = document.getElementById("filtreEvenement");
  
  const evenementsIds = creneaux
    .map(c => {
      console.log(`  🔍 Extraction evenement_id du créneau ${c.id}: ${c.evenement_id} (type: ${typeof c.evenement_id})`);
      return c.evenement_id;
    })
    .filter(id => {
      const isValid = id !== null && id !== undefined;
      console.log(`  ✔️ ID ${id} valide ? ${isValid}`);
      return isValid;
    });
  
  const evenementsUniques = [...new Set(evenementsIds)];
  
  console.log("🔧 [FILTRES] IDs événements dans créneaux:", evenementsIds);
  console.log("🔧 [FILTRES] Événements uniques:", evenementsUniques);
  
  selectEvenement.innerHTML = '<option value="">Tous les événements</option>';
  
  if (evenementsUniques.length === 0) {
    console.warn("⚠️ [FILTRES] Aucun événement unique trouvé");
  }
  
  evenementsUniques.forEach(id => {
    const evt = evenements.find(e => e.id === id);
    if (evt) {
      console.log(`  ├─ Ajout événement: ${evt.nom} (id=${id})`);
      const option = document.createElement("option");
      option.value = id;
      option.textContent = evt.nom;
      selectEvenement.appendChild(option);
    } else {
      console.warn(`  ├─ ⚠️ Événement ID=${id} introuvable dans la liste`);
    }
  });
  
  console.log("✅ [FILTRES] Options événements ajoutées:", selectEvenement.options.length - 1);
  
  updateFiltreGroupes();
  console.log("✅ [FILTRES] Filtres remplis");
}

function updateFiltreGroupes() {
  console.log("🔄 [UPDATE GROUPES] Mise à jour des groupes...");
  
  const evenementId = document.getElementById("filtreEvenement").value;
  console.log("🔄 [UPDATE GROUPES] Événement sélectionné:", evenementId || "Tous");
  
  const selectGroupe = document.getElementById("filtreGroupe");
  selectGroupe.innerHTML = '<option value="">Tous les groupes</option>';
  
  let groupesFiltres = [...groupes];
  if (evenementId) {
    groupesFiltres = groupes.filter(g => g.evenement_id === parseInt(evenementId));
    console.log(`🔍 [UPDATE GROUPES] ${groupesFiltres.length} groupes trouvés pour événement ${evenementId}`);
  }
  
  groupesFiltres.forEach(g => {
    console.log(`  ├─ Ajout groupe: ${g.nom} (id=${g.id})`);
    const option = document.createElement("option");
    option.value = g.id;
    option.textContent = g.nom;
    selectGroupe.appendChild(option);
  });
  
  console.log("✅ [UPDATE GROUPES] Terminé -", selectGroupe.options.length - 1, "options");
}

function onChangeFiltres() {
  console.log("🔍 [FILTRES] Application des filtres...");
  
  const evenementId = document.getElementById("filtreEvenement").value;
  const groupeId = document.getElementById("filtreGroupe").value;
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  
  console.log("🔍 [FILTRES] Critères:", { evenementId, groupeId, searchTerm });
  
  updateFiltreGroupes();
  
  creneauxFiltres = creneaux.filter(c => {
    let match = true;
    
    if (evenementId && c.evenement_id !== parseInt(evenementId)) {
      match = false;
    }
    
    if (groupeId && c.groupe_id !== parseInt(groupeId)) {
      match = false;
    }
    
    if (searchTerm) {
      const searchableText = `${c.evenement_nom} ${c.groupe_nom} ${c.notes || ""}`.toLowerCase();
      if (!searchableText.includes(searchTerm)) {
        match = false;
      }
    }
    
    return match;
  });
  
  console.log(`✅ [FILTRES] ${creneauxFiltres.length} créneaux après filtrage`);
  
  afficherCreneaux();
}

function afficherCreneaux() {
  console.log("🎨 [AFFICHAGE] Affichage de", creneauxFiltres.length, "créneaux");
  
  const container = document.getElementById("creneaux-container");
  
  if (creneauxFiltres.length === 0) {
    console.log("📭 [AFFICHAGE] Aucun créneau à afficher");
    container.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-calendar-x text-white"></i>
        <h4 class="text-white">Aucun créneau disponible</h4>
        <p class="text-white-50">Essayez de modifier vos filtres</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = creneauxFiltres.map((c, index) => {
    const dateDebut = new Date(c.debut);
    const dateFin = new Date(c.fin);
    const complet = c.places_restantes <= 0;
    
    return `
      <div class="creneau-card ${complet ? 'complet' : ''}">
        <div class="row align-items-center">
          <div class="col-lg-8">
            <h5 class="mb-2">
              <i class="bi bi-calendar-event text-primary"></i> ${c.evenement_nom}
            </h5>
            <p class="mb-2">
              <i class="bi bi-people text-secondary"></i> 
              <strong>${c.groupe_nom}</strong>
            </p>
            <p class="mb-2">
              <i class="bi bi-clock text-secondary"></i> 
              ${formatDate(dateDebut)} → ${formatDate(dateFin)}
            </p>
            ${c.notes ? `<p class="mb-0 text-muted"><small>${c.notes}</small></p>` : ''}
          </div>
          <div class="col-lg-4 text-lg-end mt-3 mt-lg-0">
            <div class="mb-3">
              ${complet 
                ? '<span class="badge bg-danger badge-places"><i class="bi bi-x-circle"></i> Complet</span>'
                : `<span class="badge bg-success badge-places"><i class="bi bi-check-circle"></i> ${c.places_restantes} place(s)</span>`
              }
            </div>
            <button 
              class="btn btn-inscrire" 
              onclick="ouvrirModalInscription(${c.id})"
              ${complet ? 'disabled' : ''}
            >
              <i class="bi bi-pencil-square"></i> ${complet ? 'Complet' : "S'inscrire"}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  console.log("✅ [AFFICHAGE] Terminé");
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

function ouvrirModalInscription(creneauId) {
  console.log("📝 [MODAL] Ouverture pour créneau", creneauId);
  
  const creneau = creneaux.find(c => c.id === creneauId);
  if (!creneau) {
    console.error("❌ [MODAL] Créneau introuvable:", creneauId);
    return;
  }
  
  console.log("✅ [MODAL] Créneau trouvé:", creneau);
  
  document.getElementById("modal-creneau-id").value = creneauId;
  
  const user = JSON.parse(localStorage.getItem("user"));
  if (user) {
    console.log("✅ [MODAL] Pré-remplissage avec user:", user);
    document.getElementById("modal-nom").value = user.username || "";
    document.getElementById("modal-email").value = user.email || "";
  }
  
  const dateDebut = new Date(creneau.debut);
  const dateFin = new Date(creneau.fin);
  
  document.getElementById("creneau-info").innerHTML = `
    <strong>${creneau.evenement_nom}</strong><br>
    ${creneau.groupe_nom}<br>
    <i class="bi bi-clock"></i> ${formatDate(dateDebut)} → ${formatDate(dateFin)}
  `;
  
  const modal = new bootstrap.Modal(document.getElementById("inscriptionModal"));
  modal.show();
  console.log("✅ [MODAL] Modal affiché");
}

async function soumetreInscription(e) {
  e.preventDefault();
  console.log("📤 [INSCRIPTION] Soumission du formulaire...");
  
  const creneauId = document.getElementById("modal-creneau-id").value;
  const nom = document.getElementById("modal-nom").value.trim();
  const prenom = document.getElementById("modal-prenom").value.trim();
  const email = document.getElementById("modal-email").value.trim();
  const telephone = document.getElementById("modal-telephone").value.trim();
  const commentaire = document.getElementById("modal-commentaire").value.trim();
  
  console.log("📤 [INSCRIPTION] Données:", { creneauId, nom, prenom, email, telephone, commentaire });
  
  try {
    const res = await fetch("/api/inscriptions/public", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creneau_id: parseInt(creneauId),
        nom,
        prenom,
        email,
        telephone: telephone || null,
        commentaire: commentaire || null
      })
    });
    
    console.log("📤 [INSCRIPTION] Status:", res.status);
    
    const data = await res.json();
    console.log("📤 [INSCRIPTION] Réponse:", data);
    
    if (data.ok) {
      console.log("✅ [INSCRIPTION] Succès !");
      
      const modal = bootstrap.Modal.getInstance(document.getElementById("inscriptionModal"));
      modal.hide();
      
      alert("Inscription confirmée !");
      
      document.getElementById("inscriptionForm").reset();
      
      await chargerDonnees();
      onChangeFiltres();
    } else {
      console.error("❌ [INSCRIPTION] Erreur:", data.error);
      alert(data.error || "Erreur lors de l'inscription");
    }
  } catch (err) {
    console.error("❌ [INSCRIPTION] Erreur réseau:", err);
    alert("Erreur réseau");
  }
}
