let currentCreneau = null;
let isUserConnected = false;
let currentUser = null;
document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (user) {
    isUserConnected = true;
    currentUser = user;
    console.log('👤 Utilisateur connecté:', user);
  } else {
    // Afficher le bouton de connexion si pas connecté
    document.getElementById('login-prompt').style.display = 'block';
  }

  loadCreneaux();
  
  document.getElementById('btnConfirmInscription').addEventListener('click', confirmerInscription);
});

document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (user) {
    isUserConnected = true;
    currentUser = user;
    console.log('👤 Utilisateur connecté:', user);
  }

  loadCreneaux();
  
  document.getElementById('btnConfirmInscription').addEventListener('click', confirmerInscription);
});

async function loadCreneaux() {
  try {
    const res = await fetch('/api/creneaux-publics');
    const data = await res.json();

    document.getElementById('loading').classList.add('d-none');

    if (!data.evenement || data.creneaux.length === 0) {
      document.getElementById('noEvent').classList.remove('d-none');
      return;
    }

    document.getElementById('eventName').textContent = data.evenement.nom;

    const container = document.getElementById('creneauxList');
    container.innerHTML = '';

    data.creneaux.forEach(creneau => {
      const card = createCreneauCard(creneau);
      container.appendChild(card);
    });

    container.classList.remove('d-none');
  } catch (error) {
    console.error('Erreur chargement créneaux:', error);
    document.getElementById('loading').innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Erreur de chargement. Veuillez réessayer.
      </div>
    `;
  }
}

function createCreneauCard(creneau) {
  const col = document.createElement('div');
  col.className = 'col-md-6 col-lg-4';

  const debut = new Date(creneau.debut);
  const heureDebut = debut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dateDebut = debut.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  let badgeClass = 'disponible';
  let badgeText = `${creneau.places_disponibles} places disponibles`;
  
  if (creneau.complet) {
    badgeClass = 'complet';
    badgeText = 'Complet';
  } else if (creneau.places_disponibles <= 2) {
    badgeClass = 'peu';
    badgeText = `Plus que ${creneau.places_disponibles} place${creneau.places_disponibles > 1 ? 's' : ''}`;
  }

  const btnDisabled = creneau.complet ? 'disabled' : '';
  const btnText = creneau.complet ? 'Complet' : 'S\'inscrire';

  col.innerHTML = `
    <div class="creneau-card">
      <div class="creneau-header">
        <h5><i class="bi bi-people-fill me-2"></i>${creneau.groupe_nom}</h5>
      </div>
      <div class="creneau-body">
        <div class="info-row">
          <i class="bi bi-calendar3"></i>
          <span>${dateDebut}</span>
        </div>
        <div class="info-row">
          <i class="bi bi-clock"></i>
          <span><strong>${heureDebut}</strong> - ${creneau.duree_minutes} minutes</span>
        </div>
        <div class="info-row">
          <i class="bi bi-person-check"></i>
          <span>${creneau.nb_inscrits} / ${creneau.nb_max} inscrits</span>
        </div>
        
        ${creneau.groupe_description ? `
          <div class="creneau-description">
            <i class="bi bi-info-circle me-2"></i>${creneau.groupe_description}
          </div>
        ` : ''}
        
        ${creneau.notes ? `
          <div class="creneau-description">
            <i class="bi bi-sticky me-2"></i>${creneau.notes}
          </div>
        ` : ''}
        
        <div class="text-center mt-3 mb-3">
          <span class="badge badge-places ${badgeClass}">${badgeText}</span>
        </div>
        
        <button class="btn btn-inscrire" onclick="ouvrirModalInscription(${creneau.id})" ${btnDisabled}>
          <i class="bi bi-calendar-plus me-2"></i>${btnText}
        </button>
      </div>
    </div>
  `;

  return col;
}

async function ouvrirModalInscription(creneauId) {
  try {
    const res = await fetch('/api/creneaux-publics');
    const data = await res.json();
    
    currentCreneau = data.creneaux.find(c => c.id === creneauId);
    
    if (!currentCreneau) {
      alert('Créneau introuvable');
      return;
    }

    const debut = new Date(currentCreneau.debut);
    const heureDebut = debut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const dateDebut = debut.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    document.getElementById('creneauId').value = creneauId;
    document.getElementById('modalTitle').textContent = `Inscription - ${currentCreneau.groupe_nom}`;
    
    document.getElementById('creneauDetails').innerHTML = `
      <div><strong><i class="bi bi-calendar3 me-2"></i>${dateDebut}</strong></div>
      <div><strong><i class="bi bi-clock me-2"></i>${heureDebut}</strong> - ${currentCreneau.duree_minutes} minutes</div>
      <div class="mt-2"><span class="badge bg-success">${currentCreneau.places_disponibles} places disponibles</span></div>
    `;

    const existingInfo = document.getElementById('user-connected-info');
    if (existingInfo) {
      existingInfo.remove();
    }

    document.getElementById('inscriptionForm').reset();
    document.getElementById('inscriptionMessage').classList.add('d-none');
    document.getElementById('btnConfirmInscription').disabled = false;

    if (isUserConnected && currentUser) {
      document.getElementById('inscriptionPrenom').value = currentUser.username || '';
      document.getElementById('inscriptionEmail').value = currentUser.email || '';
      
      document.getElementById('inscriptionPrenom').setAttribute('readonly', true);
      document.getElementById('inscriptionEmail').setAttribute('readonly', true);
      document.getElementById('inscriptionNom').setAttribute('readonly', true);
      
      const formElement = document.getElementById('inscriptionForm');
      const infoDiv = document.createElement('div');
      infoDiv.className = 'alert alert-info mb-3';
      infoDiv.id = 'user-connected-info';
      infoDiv.innerHTML = `
        <i class="bi bi-person-check-fill me-2"></i>
        Connecté en tant que <strong>${currentUser.username}</strong>
      `;
      formElement.insertBefore(infoDiv, formElement.firstChild);
      
      document.getElementById('btnConfirmInscription').innerHTML = 
        '<i class="bi bi-check-circle me-2"></i>Confirmer mon inscription';
    } else {
      document.getElementById('inscriptionPrenom').removeAttribute('readonly');
      document.getElementById('inscriptionEmail').removeAttribute('readonly');
      document.getElementById('inscriptionNom').removeAttribute('readonly');
      
      document.getElementById('btnConfirmInscription').innerHTML = 
        '<i class="bi bi-check-circle me-2"></i>Confirmer l\'inscription';
    }

    const modal = new bootstrap.Modal(document.getElementById('inscriptionModal'));
    modal.show();
  } catch (error) {
    console.error('Erreur ouverture modal:', error);
    alert('Erreur lors de l\'ouverture du formulaire');
  }
}

async function confirmerInscription() {
  const creneauId = document.getElementById('creneauId').value;
  const prenom = document.getElementById('inscriptionPrenom').value.trim();
  const nom = document.getElementById('inscriptionNom').value.trim();
  const email = document.getElementById('inscriptionEmail').value.trim();
  const telephone = document.getElementById('inscriptionTelephone').value.trim();
  const commentaire = document.getElementById('inscriptionCommentaire').value.trim();

  if (!email) {
    showMessage('error', 'L\'email est requis');
    return;
  }

  const btn = document.getElementById('btnConfirmInscription');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Inscription...';

  try {
    const res = await fetch('/api/creneaux-publics/inscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creneau_id: creneauId,
        nom,
        prenom,
        email,
        telephone,
        commentaire
      })
    });

    const data = await res.json();

    if (!data.ok) {
      showMessage('error', data.error || 'Erreur lors de l\'inscription');
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Confirmer l\'inscription';
      return;
    }

    showMessage('success', '🎉 Inscription confirmée ! Vous recevrez un email de confirmation.');
    
    setTimeout(() => {
      bootstrap.Modal.getInstance(document.getElementById('inscriptionModal')).hide();
      loadCreneaux();
    }, 2000);

  } catch (error) {
    console.error('Erreur inscription:', error);
    showMessage('error', 'Erreur réseau. Veuillez réessayer.');
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Confirmer l\'inscription';
  }
}

function showMessage(type, text) {
  const msgDiv = document.getElementById('inscriptionMessage');
  msgDiv.className = `alert alert-${type === 'error' ? 'danger' : 'success'}`;
  msgDiv.textContent = text;
  msgDiv.classList.remove('d-none');
}
