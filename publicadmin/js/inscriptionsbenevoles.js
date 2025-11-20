// inscriptionsbenevoles.js — affiche les créneaux d'un bénévole avec panel détaillé

document.addEventListener("DOMContentLoaded", async () => {
  console.log("[InscriptionsBénévole] Page chargée");

  const urlParams = new URLSearchParams(window.location.search);
  const cible = urlParams.get("cible");
  console.log("[InscriptionsBénévole] Paramètre cible =", cible);

  const infoContainer = document.getElementById("info-container");
  const tableContainer = document.getElementById("creneaux-container");
  const detailPanel = document.getElementById("detailPanel");
  const panelOverlay = document.getElementById("panelOverlay");
  const panelContent = document.getElementById("panelContent");

  if (!cible) {
    console.warn("[InscriptionsBénévole] Aucun paramètre 'cible' détecté");
    infoContainer.outerHTML = `<div class="alert alert-warning">Paramètre "cible" manquant.</div>`;
    return;
  }

  // Fonction pour fermer le panel
  function closePanel() {
    detailPanel.classList.remove("open");
    panelOverlay.classList.remove("show");
  }

  // Fonction pour ouvrir le panel avec détails
  function openPanel(creneau, benevole) {
    const dateDebut = new Date(creneau.debut);
    const dateFin = new Date(creneau.fin);
    const tauxRemplissage = Math.round((creneau.nb_inscrits / creneau.nb_max) * 100);

    panelContent.innerHTML = `
      <!-- Informations du créneau -->
      <div class="mb-4">
        <h5 class="mb-3"><i class="bi bi-clock-history text-primary"></i> Horaires</h5>
        <div class="contact-item">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <strong>Début</strong>
            <span class="badge bg-primary">${dateDebut.toLocaleString('fr-FR')}</span>
          </div>
          <div class="d-flex justify-content-between align-items-center">
            <strong>Fin</strong>
            <span class="badge bg-secondary">${dateFin.toLocaleString('fr-FR')}</span>
          </div>
        </div>
      </div>

      <!-- Groupe -->
      <div class="mb-4">
        <h5 class="mb-3"><i class="bi bi-people text-success"></i> Groupe</h5>
        <div class="contact-item">
          <h6 class="mb-2">${creneau.nom_groupe || "Non défini"}</h6>
          ${creneau.groupe_description ? `<p class="text-muted small mb-2">${creneau.groupe_description}</p>` : ''}
          ${creneau.groupe_email ? `
            <div class="mb-1">
              <i class="bi bi-envelope me-2"></i>
              <a href="mailto:${creneau.groupe_email}">${creneau.groupe_email}</a>
            </div>
          ` : ''}
          ${creneau.groupe_tel ? `
            <div>
              <i class="bi bi-telephone me-2"></i>
              <a href="tel:${creneau.groupe_tel}">${creneau.groupe_tel}</a>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Inscrits -->
      <div class="mb-4">
        <h5 class="mb-3"><i class="bi bi-person-check text-info"></i> Participation</h5>
        <div class="contact-item">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span>Places occupées</span>
            <span class="badge badge-inscrits ${tauxRemplissage >= 100 ? 'bg-danger' : tauxRemplissage >= 75 ? 'bg-warning' : 'bg-success'}">
              ${creneau.nb_inscrits} / ${creneau.nb_max}
            </span>
          </div>
          <div class="progress" style="height: 20px;">
            <div class="progress-bar ${tauxRemplissage >= 100 ? 'bg-danger' : tauxRemplissage >= 75 ? 'bg-warning' : 'bg-success'}" 
                 style="width: ${Math.min(tauxRemplissage, 100)}%">
              ${tauxRemplissage}%
            </div>
          </div>
          <small class="text-muted mt-2 d-block">Minimum requis : ${creneau.nb_min} personne(s)</small>
        </div>
      </div>

      <!-- Contact du bénévole -->
      <div class="mb-4">
        <h5 class="mb-3"><i class="bi bi-person-badge text-warning"></i> Bénévole inscrit</h5>
        <div class="contact-item">
          <h6 class="mb-3">${benevole.username}</h6>
          ${benevole.email ? `
            <div class="mb-2">
              <i class="bi bi-envelope-fill me-2 text-primary"></i>
              <a href="mailto:${benevole.email}" class="text-decoration-none">${benevole.email}</a>
            </div>
          ` : ''}
          ${benevole.telephone ? `
            <div class="mb-2">
              <i class="bi bi-telephone-fill me-2 text-success"></i>
              <a href="tel:${benevole.telephone}" class="text-decoration-none">${benevole.telephone}</a>
            </div>
          ` : ''}
          <div class="mt-3 pt-3 border-top">
            <small class="text-muted">
              <i class="bi bi-calendar-plus me-1"></i>
              Inscrit le ${new Date(creneau.date_inscription).toLocaleString('fr-FR')}
            </small>
          </div>
        </div>
      </div>

      <!-- Notes -->
      ${creneau.notes || creneau.commentaire ? `
        <div class="mb-4">
          <h5 class="mb-3"><i class="bi bi-sticky text-secondary"></i> Notes</h5>
          <div class="contact-item">
            ${creneau.notes ? `<p class="mb-2"><strong>Créneau :</strong> ${creneau.notes}</p>` : ''}
            ${creneau.commentaire ? `<p class="mb-0"><strong>Commentaire :</strong> ${creneau.commentaire}</p>` : ''}
          </div>
        </div>
      ` : ''}

      <!-- Actions -->
      <div class="d-grid gap-2">
        <a href="/publicadmin/planning.html?groupe_id=${creneau.groupe_id}" class="btn btn-primary">
          <i class="bi bi-calendar-week me-2"></i>Voir le planning du groupe
        </a>
        <button class="btn btn-outline-secondary" onclick="document.getElementById('closePanel').click()">
          <i class="bi bi-x-circle me-2"></i>Fermer
        </button>
      </div>
    `;

    detailPanel.classList.add("open");
    panelOverlay.classList.add("show");
  }

  // Event listeners pour fermer le panel
  document.getElementById("closePanel").addEventListener("click", closePanel);
  panelOverlay.addEventListener("click", closePanel);

  // Fonction principale
  async function fetchCreneauxForBenevole(hash) {
    console.log("[InscriptionsBénévole] Récupération des créneaux pour le hash:", hash);

    try {
      const response = await fetch(`/api/inscriptionsbenevoles/${hash}`);
      const data = await response.json();

      console.log("[InscriptionsBénévole] Réponse API:", data);

      if (!data.ok) {
        infoContainer.outerHTML = `<div class="alert alert-danger">${data.error || "Erreur serveur"}</div>`;
        return;
      }

      if (!data.creneaux?.length) {
        infoContainer.outerHTML = `<div class="alert alert-info">Aucun créneau futur trouvé pour ce bénévole.</div>`;
        return;
      }

      const benevole = data.benevole;

      // En-tête d'information
      infoContainer.outerHTML = `
        <div class="card card-benevole">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-md-8">
                <h5 class="card-title mb-2">
                  <i class="bi bi-person-circle text-primary me-2"></i>
                  ${benevole.username}
                </h5>
                <div class="d-flex flex-wrap gap-3">
                  ${benevole.email ? `
                    <span>
                      <i class="bi bi-envelope me-1 text-muted"></i>
                      <a href="mailto:${benevole.email}">${benevole.email}</a>
                    </span>
                  ` : ''}
                  ${benevole.telephone ? `
                    <span>
                      <i class="bi bi-telephone me-1 text-muted"></i>
                      <a href="tel:${benevole.telephone}">${benevole.telephone}</a>
                    </span>
                  ` : ''}
                </div>
              </div>
              <div class="col-md-4 text-md-end mt-3 mt-md-0">
                <span class="badge bg-primary badge-lg">
                  ${data.creneaux.length} créneau${data.creneaux.length > 1 ? 'x' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      `;

      // Tableau des créneaux
      const rows = data.creneaux.map((c, index) => {
        const dateDebut = new Date(c.debut);
        const dateFin = new Date(c.fin);
        const tauxRemplissage = Math.round((c.nb_inscrits / c.nb_max) * 100);
        
        return `
        <tr data-index="${index}" style="cursor: pointer;">
          <td>
            <strong>${dateDebut.toLocaleDateString('fr-FR')}</strong><br>
            <small class="text-muted">${dateDebut.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}</small>
          </td>
          <td>
            <strong>${dateFin.toLocaleDateString('fr-FR')}</strong><br>
            <small class="text-muted">${dateFin.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}</small>
          </td>
          <td>
            <span class="badge bg-secondary">${c.nom_groupe || "-"}</span>
          </td>
          <td>
            <span class="badge ${tauxRemplissage >= 100 ? 'bg-danger' : tauxRemplissage >= 75 ? 'bg-warning' : 'bg-success'}">
              ${c.nb_inscrits}/${c.nb_max}
            </span>
          </td>
          <td>
            <small class="text-muted">${c.notes || ""}</small>
          </td>
          <td class="text-end">
            <i class="bi bi-chevron-right text-primary"></i>
          </td>
        </tr>
        `;
      }).join("");

      tableContainer.innerHTML = `
        <div class="card">
          <div class="card-body">
            <h5 class="card-title mb-3">
              <i class="bi bi-list-check text-success me-2"></i>
              Créneaux à venir
            </h5>
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Début</th>
                    <th>Fin</th>
                    <th>Groupe</th>
                    <th>Inscrits</th>
                    <th>Notes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody id="creneauxTableBody">
                  ${rows}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      // Ajouter les événements de clic sur chaque ligne
      data.creneaux.forEach((creneau, index) => {
        const row = document.querySelector(`tr[data-index="${index}"]`);
        if (row) {
          row.addEventListener("click", () => openPanel(creneau, benevole));
        }
      });

    } catch (err) {
      console.error("[InscriptionsBénévole] Erreur réseau ou JSON:", err);
      infoContainer.outerHTML = `<div class="alert alert-danger">Erreur réseau : ${err.message}</div>`;
    }
  }

  // Exécution principale
  fetchCreneauxForBenevole(cible);
});
