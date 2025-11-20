// Gestion des inscriptions
let inscriptions = [];
let evenements = [];
let groupes = [];
let creneaux = [];
let modaleInscription;

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 [INSCRIPTIONS] Page chargée, initialisation...');
  modaleInscription = new bootstrap.Modal(document.getElementById('modaleInscription'));
  chargerDonnees();
  
  // Ajouter les écouteurs d'événements pour la cascade de filtres
  document.getElementById('filtreEvenement').addEventListener('change', onChangeFiltreEvenement);
  document.getElementById('filtreGroupe').addEventListener('change', onChangeFiltreGroupe);
  console.log('✅ [INSCRIPTIONS] Événements de filtres attachés');
});

async function chargerDonnees() {
  console.log('📡 [CHARGEMENT] Début du chargement des données...');
  try {
    // Charger événements, groupes, créneaux et inscriptions
    const [respEvenements, respGroupes, respCreneaux, respInscriptions] = await Promise.all([
      fetch('/api/evenements', { credentials: 'include' }),
      fetch('/api/groupes', { credentials: 'include' }),
      fetch('/api/creneaux', { credentials: 'include' }),
      fetch('/api/inscriptions', { credentials: 'include' })
    ]);

    console.log('📊 [CHARGEMENT] Status des réponses:', {
      evenements: respEvenements.status,
      groupes: respGroupes.status,
      creneaux: respCreneaux.status,
      inscriptions: respInscriptions.status
    });

    const dataEvenements = await respEvenements.json();
    const dataGroupes = await respGroupes.json();
    const dataCreneaux = await respCreneaux.json();
    const dataInscriptions = await respInscriptions.json();

    console.log('📦 [CHARGEMENT] Données brutes reçues:', {
      dataEvenements,
      dataGroupes,
      dataCreneaux,
      dataInscriptions
    });

    // Gérer les deux formats possibles (array ou objet)
    evenements = Array.isArray(dataEvenements) ? dataEvenements : (dataEvenements.evenements || []);
    groupes = Array.isArray(dataGroupes) ? dataGroupes : (dataGroupes.groupes || []);
    creneaux = Array.isArray(dataCreneaux) ? dataCreneaux : (dataCreneaux.creneaux || []);
    inscriptions = Array.isArray(dataInscriptions) ? dataInscriptions : (dataInscriptions.inscriptions || []);

    console.log('✅ [CHARGEMENT] Données chargées et parsées:', { 
      evenements: evenements.length + ' événements', 
      groupes: groupes.length + ' groupes',
      creneaux: creneaux.length + ' créneaux',
      inscriptions: inscriptions.length + ' inscriptions'
    });

    console.log('🔍 [DETAILS] Événements:', evenements);
    console.log('🔍 [DETAILS] Groupes:', groupes);
    console.log('🔍 [DETAILS] Créneaux:', creneaux);
    console.log('🔍 [DETAILS] Inscriptions:', inscriptions);

    remplirFiltres();
    afficherInscriptions();
    calculerStatistiques();

  } catch (error) {
    console.error('❌ [ERREUR] Erreur chargement données:', error);
    alert('Erreur lors du chargement des données');
  }
}

function remplirFiltres() {
  console.log('🔧 [FILTRES] Remplissage des filtres...');
  
  // Filtres événements (toujours tous les événements)
  const selectEvenement = document.getElementById('filtreEvenement');
  selectEvenement.innerHTML = '<option value="">Tous les événements</option>';
  evenements.forEach(evt => {
    selectEvenement.innerHTML += `<option value="${evt.id}">${evt.nom}</option>`;
  });
  console.log(`✅ [FILTRES] ${evenements.length} événements ajoutés au filtre`);

  // Remplir les autres filtres selon la sélection actuelle
  updateFiltreGroupes();
  updateFiltreCreneaux();
}

function onChangeFiltreEvenement() {
  const evenementId = document.getElementById('filtreEvenement').value;
  console.log(`🔄 [EVENEMENT CHANGE] Événement sélectionné: ${evenementId}`);
  
  // Réinitialiser les filtres en aval
  document.getElementById('filtreGroupe').value = '';
  document.getElementById('filtreCreneau').value = '';
  
  // Mettre à jour les options disponibles
  updateFiltreGroupes();
  updateFiltreCreneaux();
}

function onChangeFiltreGroupe() {
  const groupeId = document.getElementById('filtreGroupe').value;
  console.log(`🔄 [GROUPE CHANGE] Groupe sélectionné: ${groupeId}`);
  
  // Réinitialiser le filtre créneaux
  document.getElementById('filtreCreneau').value = '';
  
  // Mettre à jour les créneaux disponibles
  updateFiltreCreneaux();
}

function updateFiltreGroupes() {
  const evenementId = document.getElementById('filtreEvenement').value;
  console.log(`🔧 [UPDATE GROUPES] Événement: ${evenementId}`);
  
  const selectGroupe = document.getElementById('filtreGroupe');
  selectGroupe.innerHTML = '<option value="">Tous les groupes</option>';
  
  // Filtrer les groupes selon l'événement sélectionné
  let groupesFiltres = groupes;
  
  if (evenementId) {
    console.log(`🔍 [UPDATE GROUPES] Filtrage pour événement ${evenementId}`);
    console.log('🔍 [UPDATE GROUPES] Tous les groupes:', groupes);
    
    // Les groupes ont un evenement_id direct
    groupesFiltres = groupes.filter(g => {
      console.log(`  → Groupe ${g.id} "${g.nom}": evenement_id=${g.evenement_id}`);
      return g.evenement_id === parseInt(evenementId);
    });
    
    console.log(`✅ [UPDATE GROUPES] ${groupesFiltres.length} groupes filtrés:`, groupesFiltres);
  } else {
    console.log(`✅ [UPDATE GROUPES] Tous les groupes affichés (${groupes.length})`);
  }
  
  groupesFiltres.forEach(grp => {
    selectGroupe.innerHTML += `<option value="${grp.id}">${grp.nom}</option>`;
  });
  
  console.log(`✅ [UPDATE GROUPES] ${groupesFiltres.length} groupes ajoutés au select`);
}

function updateFiltreCreneaux() {
  const evenementId = document.getElementById('filtreEvenement').value;
  const groupeId = document.getElementById('filtreGroupe').value;
  console.log(`🔧 [UPDATE CRENEAUX] Événement: ${evenementId}, Groupe: ${groupeId}`);
  
  const selectCreneau = document.getElementById('filtreCreneau');
  selectCreneau.innerHTML = '<option value="">Tous les créneaux</option>';
  
  // Filtrer les créneaux
  let creneauxFiltres = creneaux;
  console.log(`🔍 [UPDATE CRENEAUX] Créneaux de départ: ${creneauxFiltres.length}`);
  
  // Si un événement est sélectionné, filtrer via les groupes
  if (evenementId) {
    console.log(`🔍 [UPDATE CRENEAUX] Filtrage par événement ${evenementId}`);
    const groupeIdsDeEvenement = groupes
      .filter(g => g.evenement_id === parseInt(evenementId))
      .map(g => g.id);
    
    console.log(`🔍 [UPDATE CRENEAUX] IDs des groupes de l'événement:`, groupeIdsDeEvenement);
    
    creneauxFiltres = creneauxFiltres.filter(c => {
      const match = groupeIdsDeEvenement.includes(c.groupe_id);
      console.log(`  → Créneau ${c.id}: groupe_id=${c.groupe_id}, match=${match}`);
      return match;
    });
    
    console.log(`✅ [UPDATE CRENEAUX] ${creneauxFiltres.length} créneaux après filtre événement`);
  }
  
  // Si un groupe est sélectionné, filtrer directement
  if (groupeId) {
    console.log(`🔍 [UPDATE CRENEAUX] Filtrage par groupe ${groupeId}`);
    creneauxFiltres = creneauxFiltres.filter(c => {
      const match = c.groupe_id === parseInt(groupeId);
      console.log(`  → Créneau ${c.id}: groupe_id=${c.groupe_id}, match=${match}`);
      return match;
    });
    console.log(`✅ [UPDATE CRENEAUX] ${creneauxFiltres.length} créneaux après filtre groupe`);
  }
  
  // Trier par date
  creneauxFiltres.sort((a, b) => new Date(a.debut) - new Date(b.debut));
  
  creneauxFiltres.forEach(cre => {
    const debut = formatDate(cre.debut);
    const groupe = groupes.find(g => g.id === cre.groupe_id);
    selectCreneau.innerHTML += `<option value="${cre.id}">${groupe?.nom || 'N/A'} - ${debut}</option>`;
  });
  
  console.log(`✅ [UPDATE CRENEAUX] ${creneauxFiltres.length} créneaux ajoutés au select`);
}

async function chargerInscriptions() {
  console.log('📡 [CHARGER INSCRIPTIONS] Début du chargement...');
  
  try {
    const filtreEvenement = document.getElementById('filtreEvenement').value;
    const filtreGroupe = document.getElementById('filtreGroupe').value;
    const filtreCreneau = document.getElementById('filtreCreneau').value;
    const filtreStatut = document.getElementById('filtreStatut').value;

    console.log('🔍 [CHARGER INSCRIPTIONS] Filtres actifs:', {
      evenement: filtreEvenement,
      groupe: filtreGroupe,
      creneau: filtreCreneau,
      statut: filtreStatut
    });

    const params = new URLSearchParams();
    if (filtreEvenement) params.append('evenement_id', filtreEvenement);
    if (filtreGroupe) params.append('groupe_id', filtreGroupe);
    if (filtreCreneau) params.append('creneau_id', filtreCreneau);
    if (filtreStatut) params.append('statut', filtreStatut);

    const url = `/api/inscriptions?${params}`;
    console.log('📡 [CHARGER INSCRIPTIONS] URL:', url);

    const response = await fetch(url, {
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Erreur chargement inscriptions');

    const data = await response.json();
    console.log('📦 [CHARGER INSCRIPTIONS] Données reçues:', data);
    
    inscriptions = Array.isArray(data) ? data : (data.inscriptions || []);
    console.log(`✅ [CHARGER INSCRIPTIONS] ${inscriptions.length} inscriptions chargées`);
    
    afficherInscriptions();
    calculerStatistiques();

  } catch (error) {
    console.error('❌ [ERREUR] Erreur chargement inscriptions:', error);
    alert('Erreur lors du chargement des inscriptions');
  }
}

function afficherInscriptions() {
  console.log(`📋 [AFFICHER] Affichage de ${inscriptions.length} inscriptions`);
  const tbody = document.getElementById('tableauInscriptions');

  if (inscriptions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="text-center">Aucune inscription trouvée</td></tr>';
    console.log('⚠️ [AFFICHER] Aucune inscription à afficher');
    return;
  }

  tbody.innerHTML = inscriptions.map(ins => {
    const badgeStatut = ins.statut === 'confirmee' 
      ? '<span class="badge bg-success">Confirmée</span>'
      : '<span class="badge bg-secondary">Annulée</span>';

    return `
      <tr>
        <td>${ins.id}</td>
        <td><strong>${ins.prenom} ${ins.nom}</strong></td>
        <td>${ins.email}</td>
        <td>${ins.telephone || '-'}</td>
        <td>${ins.evenement_nom || '-'}</td>
        <td>${ins.groupe_nom || '-'}</td>
        <td>
          <small>${formatDate(ins.debut)}<br>→ ${formatDate(ins.fin)}</small>
        </td>
        <td>${badgeStatut}</td>
        <td>${formatDate(ins.date_inscription)}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="modifierInscription(${ins.id})" title="Modifier">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="supprimerInscription(${ins.id})" title="Supprimer">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
  
  console.log('✅ [AFFICHER] Tableau mis à jour');
}

function calculerStatistiques() {
  const total = inscriptions.length;
  const confirmees = inscriptions.filter(i => i.statut === 'confirmee').length;
  const annulees = inscriptions.filter(i => i.statut === 'annulee').length;
  const uniques = new Set(inscriptions.map(i => i.email)).size;

  console.log('📊 [STATS] Statistiques calculées:', {
    total,
    confirmees,
    annulees,
    uniques
  });

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statConfirmees').textContent = confirmees;
  document.getElementById('statAnnulees').textContent = annulees;
  document.getElementById('statUniques').textContent = uniques;
}

function ouvrirModaleCreation() {
  console.log('➕ [MODALE] Ouverture modale création');
  document.getElementById('modaleInscriptionTitre').textContent = 'Nouvelle inscription';
  document.getElementById('formInscription').reset();
  document.getElementById('inscriptionId').value = '';
  
  // Remplir la liste des créneaux
  const selectCreneau = document.getElementById('inscriptionCreneau');
  selectCreneau.innerHTML = '<option value="">Sélectionner un créneau</option>';
  
  // Trier les créneaux par date
  const creneauxTries = [...creneaux].sort((a, b) => new Date(a.debut) - new Date(b.debut));
  
  creneauxTries.forEach(cre => {
    const debut = formatDate(cre.debut);
    const groupe = groupes.find(g => g.id === cre.groupe_id);
    const evenement = evenements.find(e => e.id === groupe?.evenement_id);
    const label = evenement ? `${evenement.nom} - ${groupe?.nom || 'N/A'} - ${debut}` : `${groupe?.nom || 'N/A'} - ${debut}`;
    selectCreneau.innerHTML += `<option value="${cre.id}">${label}</option>`;
  });

  console.log(`✅ [MODALE] ${creneauxTries.length} créneaux ajoutés à la modale`);
  modaleInscription.show();
}

async function modifierInscription(id) {
  console.log(`✏️ [MODIFIER] Chargement inscription ${id}`);
  try {
    const response = await fetch(`/api/inscriptions/${id}`, {
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Erreur chargement inscription');

    const inscription = await response.json();
    console.log('📦 [MODIFIER] Inscription chargée:', inscription);

    document.getElementById('modaleInscriptionTitre').textContent = 'Modifier l\'inscription';
    document.getElementById('inscriptionId').value = inscription.id;
    
    // Remplir la liste des créneaux pour la modale
    const selectCreneau = document.getElementById('inscriptionCreneau');
    selectCreneau.innerHTML = '<option value="">Sélectionner un créneau</option>';
    
    const creneauxTries = [...creneaux].sort((a, b) => new Date(a.debut) - new Date(b.debut));
    creneauxTries.forEach(cre => {
      const debut = formatDate(cre.debut);
      const groupe = groupes.find(g => g.id === cre.groupe_id);
      const evenement = evenements.find(e => e.id === groupe?.evenement_id);
      const label = evenement ? `${evenement.nom} - ${groupe?.nom || 'N/A'} - ${debut}` : `${groupe?.nom || 'N/A'} - ${debut}`;
      selectCreneau.innerHTML += `<option value="${cre.id}">${label}</option>`;
    });
    
    document.getElementById('inscriptionCreneau').value = inscription.creneau_id;
    document.getElementById('inscriptionNom').value = inscription.nom;
    document.getElementById('inscriptionPrenom').value = inscription.prenom;
    document.getElementById('inscriptionEmail').value = inscription.email;
    document.getElementById('inscriptionTelephone').value = inscription.telephone || '';
    document.getElementById('inscriptionStatut').value = inscription.statut;
    document.getElementById('inscriptionCommentaire').value = inscription.commentaire || '';

    console.log('✅ [MODIFIER] Formulaire rempli');
    modaleInscription.show();

  } catch (error) {
    console.error('❌ [ERREUR] Erreur modification:', error);
    alert('Erreur lors du chargement de l\'inscription');
  }
}

async function sauvegarderInscription() {
  console.log('💾 [SAUVEGARDER] Début sauvegarde...');
  try {
    const id = document.getElementById('inscriptionId').value;
    const data = {
      creneau_id: parseInt(document.getElementById('inscriptionCreneau').value),
      nom: document.getElementById('inscriptionNom').value.trim(),
      prenom: document.getElementById('inscriptionPrenom').value.trim(),
      email: document.getElementById('inscriptionEmail').value.trim(),
      telephone: document.getElementById('inscriptionTelephone').value.trim() || null,
      statut: document.getElementById('inscriptionStatut').value,
      commentaire: document.getElementById('inscriptionCommentaire').value.trim() || null
    };

    console.log('📦 [SAUVEGARDER] Données à envoyer:', data);

    if (!data.creneau_id || !data.nom || !data.prenom || !data.email) {
      console.warn('⚠️ [SAUVEGARDER] Champs manquants');
      alert('Les champs créneau, nom, prénom et email sont obligatoires');
      return;
    }

    const url = id ? `/api/inscriptions/${id}` : '/api/inscriptions';
    const method = id ? 'PUT' : 'POST';
    console.log(`📡 [SAUVEGARDER] ${method} ${url}`);

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur sauvegarde');
    }

    console.log('✅ [SAUVEGARDER] Inscription sauvegardée');
    modaleInscription.hide();
    await chargerDonnees();
    alert(id ? 'Inscription modifiée avec succès' : 'Inscription créée avec succès');

  } catch (error) {
    console.error('❌ [ERREUR] Erreur sauvegarde:', error);
    alert(error.message);
  }
}

async function supprimerInscription(id) {
  console.log(`🗑️ [SUPPRIMER] Demande suppression inscription ${id}`);
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette inscription ?')) {
    console.log('⚠️ [SUPPRIMER] Suppression annulée');
    return;
  }

  try {
    const response = await fetch(`/api/inscriptions/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Erreur suppression');

    console.log('✅ [SUPPRIMER] Inscription supprimée');
    await chargerDonnees();
    alert('Inscription supprimée avec succès');

  } catch (error) {
    console.error('❌ [ERREUR] Erreur suppression:', error);
    alert('Erreur lors de la suppression');
  }
}

function reinitialiserFiltres() {
  console.log('🔄 [REINIT] Réinitialisation des filtres');
  document.getElementById('filtreEvenement').value = '';
  document.getElementById('filtreGroupe').value = '';
  document.getElementById('filtreCreneau').value = '';
  document.getElementById('filtreStatut').value = '';
  
  // Remettre toutes les options disponibles
  updateFiltreGroupes();
  updateFiltreCreneaux();
  
  chargerInscriptions();
}

function formatDate(isoString) {
  if (!isoString) return '-';
  return new Date(isoString).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

window.ouvrirModaleCreation = ouvrirModaleCreation;
window.modifierInscription = modifierInscription;
window.sauvegarderInscription = sauvegarderInscription;
window.supprimerInscription = supprimerInscription;
window.chargerInscriptions = chargerInscriptions;
window.reinitialiserFiltres = reinitialiserFiltres;
