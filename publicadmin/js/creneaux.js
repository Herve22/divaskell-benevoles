async function loadCreneaux() {
  const res = await fetch('/api/creneaux');
  const data = await res.json();
  const list = document.getElementById('creneaux-list');
  
  list.innerHTML = `
    <table class="table table-striped">
      <thead>
        <tr>
          <th>Groupe</th>
          <th>Début</th>
          <th>Fin</th>
          <th>Min/Max</th>
          <th>Inscrits</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${data.creneaux.map(c => `
          <tr>
            <td>${c.groupe_nom || 'Groupe ' + c.groupe_id}</td>
            <td>${new Date(c.debut).toLocaleString('fr-FR')}</td>
            <td>${new Date(c.fin).toLocaleString('fr-FR')}</td>
            <td>${c.nb_min}/${c.nb_max}</td>
            <td>${c.nb_inscrits || 0}</td>
            <td>
              <button class="btn btn-sm btn-danger" onclick="deleteCreneau(${c.id})">Supprimer</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function loadGroupes() {
  const res = await fetch('/api/groupes');
  const data = await res.json();
  const select = document.getElementById('groupe_id');
  select.innerHTML = '<option value="">-- Sélectionner un groupe --</option>' +
    data.groupes.map(g => `<option value="${g.id}">${g.nom}</option>`).join('');
}

async function createCreneau(e) {
  e.preventDefault();
  const data = {
    groupe_id: document.getElementById('groupe_id').value,
    debut: document.getElementById('debut').value,
    fin: document.getElementById('fin').value,
    nb_min: document.getElementById('nb_min').value,
    nb_max: document.getElementById('nb_max').value,
    notes: document.getElementById('notes').value
  };
  
  await fetch('/api/creneaux', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  document.getElementById('form-add').reset();
  loadCreneaux();
}

async function deleteCreneau(id) {
  if (confirm('Supprimer ce créneau ?')) {
    await fetch(`/api/creneaux/${id}`, { method: 'DELETE' });
    loadCreneaux();
  }
}

// Chargement initial
loadCreneaux();
loadGroupes();