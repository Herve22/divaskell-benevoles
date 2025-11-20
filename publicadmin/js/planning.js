// planning.js - Affichage du planning des créneaux avec inscriptions

let evenements = [];
let groupes = [];
let creneaux = [];
let inscriptionsCache = {};

// Helpers
function authHeaders() {
  const t = localStorage.getItem("token") || localStorage.getItem("benevoles_token") || "";
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function isAdminUI() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const me = JSON.parse(localStorage.getItem("benevoles_me") || "{}");
    return user.role === "admin" || user.role === "superadmin" || me?.benevole?.admin === "1";
  } catch {
    return false;
  }
}

function toE164(fr) {
  const d = String(fr || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("0")) return "+33" + d.slice(1);
  if (d.startsWith("33")) return "+" + d;
  if (d.startsWith("+")) return d;
  return "+" + d;
}

function prettyFR(fr) {
  const d = String(fr || "").replace(/\D/g, "");
  return d.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}

function formatStartEnd(startIso, endIso) {
  const s = startIso ? new Date(startIso) : null;
  const e = endIso ? new Date(endIso) : null;
  if (!s || isNaN(s)) return "—";
  const optsDate = { day: "2-digit", month: "2-digit", year: "numeric" };
  const optsTime = { hour: "2-digit", minute: "2-digit" };
  const sDate = s.toLocaleDateString("fr-FR", optsDate);
  const sTime = s.toLocaleTimeString("fr-FR", optsTime);
  if (!e || isNaN(e)) return `${sDate} ${sTime}`;
  const sameDay = s.toDateString() === e.toDateString();
  const eDate = e.toLocaleDateString("fr-FR", optsDate);
  const eTime = e.toLocaleTimeString("fr-FR", optsTime);
  return sameDay ? `${sDate} ${sTime}–${eTime}` : `${sDate} ${sTime} → ${eDate} ${eTime}`;
}

async function fetchAuth(url, opts = {}) {
  const headers = { ...authHeaders(), ...(opts.headers || {}) };
  const res = await fetch(url, { ...opts, headers, credentials: "include" });
  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("benevoles_token");
    alert("Session expirée. Veuillez vous reconnecter.");
    location.href = "/public/index.html";
  }
  return res;
}

async function deleteInscriptionAPI(inscrId) {
  const r = await fetchAuth(`/api/inscriptions/${encodeURIComponent(inscrId)}`, { method: "DELETE" });
  if (!r.ok) throw new Error(await r.text().catch(() => `HTTP ${r.status}`));
}

// Chargement initial
document.addEventListener("DOMContentLoaded", () => {
  console.log("📅 [PLANNING] Initialisation...");
  chargerDonnees();

  document.getElementById("filtreEvenement").addEventListener("change", onChangeFiltreEvenement);
  document.getElementById("filtreGroupe").addEventListener("change", chargerPlanning);
  document.getElementById("filtreDate").addEventListener("change", chargerPlanning);
  document.getElementById("btnRefresh").addEventListener("click", () => {
    inscriptionsCache = {};
    chargerDonnees();
  });
});

async function chargerDonnees() {
  console.log("📡 [PLANNING] Chargement des données...");

  try {
    const [respEvenements, respGroupes, respCreneaux, respInscriptions] = await Promise.all([
      fetchAuth("/api/evenements"),
      fetchAuth("/api/groupes"),
      fetchAuth("/api/creneaux"),
      fetchAuth("/api/inscriptions")
    ]);

    const dataEvenements = await respEvenements.json();
    const dataGroupes = await respGroupes.json();
    const dataCreneaux = await respCreneaux.json();
    const dataInscriptions = await respInscriptions.json();

    evenements = Array.isArray(dataEvenements) ? dataEvenements : (dataEvenements.evenements || []);
    groupes = Array.isArray(dataGroupes) ? dataGroupes : (dataGroupes.groupes || []);
    creneaux = Array.isArray(dataCreneaux) ? dataCreneaux : (dataCreneaux.creneaux || []);
    
    // Stocker toutes les inscriptions confirmées par créneau
    const allInscriptions = Array.isArray(dataInscriptions) ? dataInscriptions : (dataInscriptions.inscriptions || []);
    inscriptionsCache = {};
    allInscriptions.filter(i => i.statut === "confirmee").forEach(i => {
      const cid = i.creneau_id;
      if (!inscriptionsCache[cid]) inscriptionsCache[cid] = [];
      inscriptionsCache[cid].push(i);
    });

    console.log("✅ [PLANNING] Données chargées:", {
      evenements: evenements.length,
      groupes: groupes.length,
      creneaux: creneaux.length,
      inscriptions: allInscriptions.length
    });

    remplirFiltres();
    chargerPlanning();

  } catch (error) {
    console.error("❌ [PLANNING] Erreur chargement:", error);
    alert("Erreur lors du chargement des données");
  }
}

function remplirFiltres() {
  const selectEvenement = document.getElementById("filtreEvenement");
  selectEvenement.innerHTML = '<option value="">Tous les événements</option>';
  evenements.forEach(evt => {
    selectEvenement.innerHTML += `<option value="${evt.id}">${evt.nom}</option>`;
  });

  updateFiltreGroupes();
}

function onChangeFiltreEvenement() {
  document.getElementById("filtreGroupe").value = "";
  updateFiltreGroupes();
  chargerPlanning();
}

function updateFiltreGroupes() {
  const evenementId = document.getElementById("filtreEvenement").value;
  const selectGroupe = document.getElementById("filtreGroupe");
  selectGroupe.innerHTML = '<option value="">Tous les groupes</option>';

  let groupesFiltres = groupes;
  if (evenementId) {
    groupesFiltres = groupes.filter(g => g.evenement_id === parseInt(evenementId));
  }

  groupesFiltres.forEach(grp => {
    selectGroupe.innerHTML += `<option value="${grp.id}">${grp.nom}</option>`;
  });
}

function chargerPlanning() {
  console.log("🔄 [PLANNING] Génération du planning...");

  const evenementId = document.getElementById("filtreEvenement").value;
  const groupeId = document.getElementById("filtreGroupe").value;
  const dateFiltre = document.getElementById("filtreDate").value;

  let creneauxFiltres = [...creneaux];

  // Filtrer par événement
  if (evenementId) {
    const groupeIdsDeEvenement = groupes
      .filter(g => g.evenement_id === parseInt(evenementId))
      .map(g => g.id);
    creneauxFiltres = creneauxFiltres.filter(c => groupeIdsDeEvenement.includes(c.groupe_id));
  }

  // Filtrer par groupe
  if (groupeId) {
    creneauxFiltres = creneauxFiltres.filter(c => c.groupe_id === parseInt(groupeId));
  }

  // Filtrer par date
  if (dateFiltre) {
    const dateObj = new Date(dateFiltre);
    creneauxFiltres = creneauxFiltres.filter(c => {
      const creneauDate = new Date(c.debut);
      return creneauDate.toDateString() === dateObj.toDateString();
    });
  }

  // Trier par date
  creneauxFiltres.sort((a, b) => new Date(a.debut) - new Date(b.debut));

  afficherPlanning(creneauxFiltres);
}

function afficherPlanning(creneauxFiltres) {
  const listEl = document.getElementById("list");

  if (creneauxFiltres.length === 0) {
    listEl.innerHTML = `<div class="alert alert-info"><i class="bi bi-info-circle"></i> Aucun créneau trouvé</div>`;
    updateSummaryFromItems();
    return;
  }

  listEl.innerHTML = creneauxFiltres.map(c => {
    const groupe = groupes.find(g => g.id === c.groupe_id);
    const evenement = evenements.find(e => e.id === groupe?.evenement_id);

    const dateTxt = formatStartEnd(c.debut, c.fin);
    const poste = groupe?.nom || "—";
    const min = Number(c.nb_min || 0);
    const max = Number(c.nb_max || 0);

    // Compter les inscrits depuis le cache
    const inscr = inscriptionsCache[c.id] || [];
    const taken = inscr.length;
    const ratio = `${taken}/${max}`;
    let level = "ok";
    if (taken < min) level = "err";
    else if (taken === min) level = "warn";

    const isAdmin = isAdminUI();

    return `
      <div class="item" data-id="${c.id}">
        <div class="row">
          <div class="date">${dateTxt}</div>
          <div class="middle">
            <div class="poste">${evenement?.nom || ""} • ${poste} <span class="muted">• Min: ${min} / Max: ${max}</span></div>
            <span class="chip ${level}" data-chip>${ratio}</span>
          </div>
        </div>
        <div class="details">
          <div class="sec-title">Détail du créneau</div>
          <div class="muted" style="margin-bottom:8px">
            <div><b>Début :</b> ${new Date(c.debut).toLocaleString("fr-FR")}</div>
            <div><b>Fin :</b> ${new Date(c.fin).toLocaleString("fr-FR")}</div>
            <div>Groupe : <b>${poste}</b></div>
            ${c.notes ? `<div>Note : ${c.notes}</div>` : ""}
          </div>
          <div class="sec-title">Inscrits</div>
          <div class="inscr-list">${inscr.length > 0 ? '' : '<span class="muted">Aucun inscrit.</span>'}</div>
        </div>
      </div>
    `;
  }).join("");

  // Rendre les inscrits pour chaque créneau
  creneauxFiltres.forEach(c => {
    const item = listEl.querySelector(`.item[data-id="${c.id}"]`);
    const box = item?.querySelector(".inscr-list");
    const inscr = inscriptionsCache[c.id] || [];
    if (box && inscr.length > 0) {
      renderInscr(box, inscr, { slotId: c.id, item });
    }
  });

  // Interaction : ouvrir/fermer
  listEl.addEventListener("click", async (e) => {
    // Clic sur tel: link
    const telLink = e.target.closest("a.pill-ico");
    if (telLink) {
      e.stopPropagation();
      return;
    }

    // Clic sur personne
    const pbtn = e.target.closest(".pill-btn.person");
    if (pbtn) {
      e.stopPropagation();
      openPersonPopover(pbtn);
      return;
    }

    // Toggle row
    const row = e.target.closest(".row");
    if (!row) return;
    const item = row.parentElement;
    item.classList.toggle("open");
  });

  updateSummaryFromItems();
}

function renderInscr(el, arr, { slotId = "", item = null } = {}) {
  el.classList.remove("loading");

  if (!arr?.length) {
    el.innerHTML = `<span class="muted">Aucun inscrit.</span>`;
    if (item) updateChipCount(item, 0);
    return;
  }

  const isAdmin = isAdminUI();

  el.innerHTML = arr.map(x => {
    const mail = (x.email || "").trim();
    const tel = (x.telephone || "").trim();
    const name = (x.prenom || "").trim() || (mail ? mail.split("@")[0] : "—");

    const personBtn = `
      <button class="pill-btn person"
              data-id="${x.id}"
              data-name="${name.replace(/"/g, '&quot;')}"
              data-mail="${mail.replace(/"/g, '&quot;')}"
              data-tel="${tel.replace(/"/g, '&quot;')}">
        ${name}${mail ? ` <span class="muted">&lt;${mail}&gt;</span>` : ""}
      </button>`;

    const telIco = tel
      ? `<a class="pill-ico" href="tel:${toE164(tel)}" title="Appeler ${name}" aria-label="Appeler ${name}">📞</a>`
      : "";

    const delBtn = isAdmin
      ? `<button class="pill-btn js-del-inscr" data-inscr-id="${x.id}" data-slot-id="${slotId}" title="Supprimer">✕</button>`
      : "";

    return `<span class="pill" data-inscr-id="${x.id}" data-slot-id="${slotId}">
              ${personBtn}
              ${telIco}
              ${delBtn}
            </span>`;
  }).join("");

  if (item) updateChipCount(item, arr.length);

  if (!isAdmin) return;

  // Boutons suppression
  el.querySelectorAll(".js-del-inscr").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const pill = btn.closest(".pill");
      const inscrId = btn.dataset.inscrId;
      const slotId = btn.dataset.slotId || pill?.dataset.slotId || "";
      if (!inscrId) return;
      if (!confirm("Supprimer cette inscription ?")) return;

      btn.disabled = true;
      const backup = pill.outerHTML;
      pill.remove();

      try {
        await deleteInscriptionAPI(inscrId);
        const item = document.querySelector(`.item[data-id="${slotId}"]`) || btn.closest(".item");
        if (item) {
          delete inscriptionsCache[slotId];
          const box = item.querySelector(".inscr-list");
          const resp = await fetchAuth(`/api/inscriptions?creneau_id=${encodeURIComponent(slotId)}`);
          const data = await resp.json();
          const arr = Array.isArray(data) ? data : (data.inscriptions || []);
          inscriptionsCache[slotId] = arr.filter(i => i.statut === "confirmee");
          renderInscr(box, inscriptionsCache[slotId], { slotId, item });
          updateSummaryFromItems();
        }
      } catch (err) {
        el.insertAdjacentHTML("beforeend", backup);
        alert(`Suppression impossible : ${err.message || err}`);
        btn.disabled = false;
      }
    });
  });
}

function updateChipCount(item, count) {
  const chip = item.querySelector("[data-chip]");
  if (!chip) return;

  const middle = item.querySelector(".poste")?.textContent || "";
  const mMin = middle.match(/Min:\s*(\d+)/);
  const mMax = middle.match(/Max:\s*(\d+)/);
  const min = mMin ? parseInt(mMin[1], 10) : 0;
  const max = mMax ? parseInt(mMax[1], 10) : 0;

  chip.textContent = `${count}/${max}`;
  chip.classList.remove("ok", "warn", "err");
  if (count < min) chip.classList.add("err");
  else if (count === min) chip.classList.add("warn");
  else chip.classList.add("ok");
}

function updateSummaryFromItems() {
  let totalNeed = 0;
  let totalHave = 0;
  let totalCreneaux = 0;
  let creneauxRemplis = 0;

  document.querySelectorAll(".item").forEach(item => {
    totalCreneaux++;
    
    const middle = item.querySelector(".poste")?.textContent || "";
    const mMin = middle.match(/Min:\s*(\d+)/);
    const min = mMin ? parseInt(mMin[1], 10) : 0;
    totalNeed += min;

    const chip = item.querySelector("[data-chip]");
    if (chip) {
      const m = chip.textContent.match(/^(\d+)\//);
      const taken = m ? parseInt(m[1], 10) : 0;
      totalHave += taken;
      
      // Un créneau est "rempli" si on a atteint le minimum
      if (taken >= min) {
        creneauxRemplis++;
      }
    }
  });

  const manque = Math.max(0, totalNeed - totalHave);
  
  // Complétion = créneaux remplis / total créneaux
  const pct = totalCreneaux > 0 ? Math.min(100, (creneauxRemplis / totalCreneaux) * 100) : 0;

  document.getElementById("sum-need").textContent = String(totalNeed);
  document.getElementById("sum-have").textContent = String(totalHave);
  document.getElementById("sum-pct").textContent = `${pct.toFixed(0)}%`;

  const missingWrap = document.getElementById("sum-missing-wrap");
  const missingEl = document.getElementById("sum-missing");
  if (manque > 0) {
    missingWrap.style.display = "inline-flex";
    missingEl.textContent = String(manque);
  } else {
    missingWrap.style.display = "none";
  }
}

// Popover
const personPopover = document.getElementById("inscr-popover");

function closePersonPopover() {
  personPopover.hidden = true;
  personPopover.innerHTML = "";
  document.removeEventListener("mousedown", onDocDown, true);
  document.removeEventListener("scroll", onDocDown, true);
}

function onDocDown(ev) {
  if (!personPopover.contains(ev.target) && !ev.target.closest(".pill-btn.person")) {
    closePersonPopover();
  }
}

function openPersonPopover(btn) {
  const pill = btn.closest(".pill");
  const inscrId = pill?.dataset.inscrId;
  const name = btn.dataset.name || "—";
  const email = (btn.dataset.mail || "").trim();
  const tel = (btn.dataset.tel || "").trim();

  const meEmail = (localStorage.getItem("user_email") || "").toLowerCase();
  const isAdmin = isAdminUI();
  const canDelete = !!inscrId && (isAdmin || (email && email.toLowerCase() === meEmail));

  const telHref = tel ? `tel:${toE164(tel)}` : "";

  personPopover.innerHTML = `
    <button class="close" aria-label="Fermer">×</button>
    <div class="title">${name}</div>
    <div class="meta">${email ? `✉️ ${email}` : `— email manquant —`}</div>
    <div class="meta">${tel ? `📞 ${prettyFR(tel)}` : `— téléphone manquant —`}</div>
    <div class="row">
      ${email ? `<a class="btn" href="mailto:${encodeURIComponent(email)}">✉️ Email</a>` : ``}
      ${tel ? `<a class="btn" href="${telHref}">📞 Appeler</a>` : ``}
      ${canDelete ? `<button class="btn danger" data-del="${inscrId}">🗑️ Supprimer</button>` : ``}
      <button class="btn" data-close>Fermer</button>
    </div>
  `;

  const r = btn.getBoundingClientRect();
  const top = Math.min(window.innerHeight - 320, r.bottom + 10 + window.scrollY);
  const left = Math.min(window.innerWidth - 320, Math.max(8, r.left + window.scrollX));
  personPopover.style.top = `${top}px`;
  personPopover.style.left = `${left}px`;
  personPopover.hidden = false;

  const closeBtn = personPopover.querySelector("[data-close], .close");
  if (closeBtn) closeBtn.onclick = closePersonPopover;

  const delBtn = personPopover.querySelector("[data-del]");
  if (delBtn) {
    delBtn.onclick = async () => {
      if (!confirm("Supprimer cette inscription ?")) return;

      const item = btn.closest(".item");
      const slotId = item?.dataset.id;
      const box = item?.querySelector(".inscr-list");
      const htmlBackup = pill?.outerHTML || "";
      pill?.remove();

      try {
        await deleteInscriptionAPI(inscrId);
        if (slotId) {
          delete inscriptionsCache[slotId];
          const resp = await fetchAuth(`/api/inscriptions?creneau_id=${encodeURIComponent(slotId)}`);
          const data = await resp.json();
          const arr = Array.isArray(data) ? data : (data.inscriptions || []);
          inscriptionsCache[slotId] = arr.filter(i => i.statut === "confirmee");
          renderInscr(box, inscriptionsCache[slotId], { slotId, item });
          updateSummaryFromItems();
        }
        closePersonPopover();
      } catch (e) {
        if (htmlBackup && box) box.insertAdjacentHTML("beforeend", htmlBackup);
        alert(`Suppression impossible : ${e.message || e}`);
      }
    };
  }

  document.addEventListener("mousedown", onDocDown, true);
  document.addEventListener("scroll", onDocDown, true);
}
