// creneaux-ui.js — Modale "Créneaux" (UTC ISO) — avec credentials: "include"
const log = (...a)=>console.log("[creneaux-ui]", ...a);

const toDatetimeLocal = (isoUtc) => {
  const d = new Date(isoUtc); const p = (n)=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fromLocalToUtcIso = (localStr) => {
  const d = new Date(localStr);
  return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString();
};
const fmtLocal = (isoUtc) => new Date(isoUtc).toLocaleString(undefined, { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" });

export function attachCreneauxUI({ eventDateISO }) {
  log("attached; eventDateISO =", eventDateISO ?? null);
  const modalEl = document.getElementById("modalCreneaux");
  const tableBody = document.querySelector("#creneauxTable tbody");
  const searchInput = document.getElementById("searchCreneaux");
  const btnRefresh  = document.getElementById("btnRefreshCreneaux");
  const addForm = document.getElementById("addCreneauForm");
  const addDebut = document.getElementById("addDebut");
  const addFin   = document.getElementById("addFin");
  const addMin   = document.getElementById("addMin");
  const addMax   = document.getElementById("addMax");
  const addNotes = document.getElementById("addNotes");

  let gid = null, rows = [], bsModal;

  function setDefaults() {
    const base = eventDateISO ? new Date(eventDateISO) : new Date();
    base.setHours(18,0,0,0);
    const end = new Date(base.getTime() + 2*3600*1000);
    const iso = (d)=> new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString();
    addDebut.value = toDatetimeLocal(iso(base));
    addFin.value   = toDatetimeLocal(iso(end));
    addMin.value = "1"; addMax.value = "3"; addNotes.value = "";
  }

  async function load() {
    if (!gid) return;
    log("load list for gid =", gid);
    const q = searchInput.value?.trim() || "";
    const r = await fetch(`/api/creneaux?groupe_id=${gid}${q?`&search=${encodeURIComponent(q)}`:""}`, {
      credentials: "include",
      headers: { "X-Requested-With": "fetch" }
    });
    const j = await r.json(); 
    if (!j.ok) { log("load error:", j); throw new Error(j.error||"Erreur"); }
    rows = j.creneaux||[]; log("rows:", rows.length);
    render();
  }

  function render() {
    tableBody.innerHTML = rows.length ? "" : `<tr><td colspan="7" class="text-center text-muted">Aucun créneau</td></tr>`;
    for (const row of rows) {
      const tr = document.createElement("tr"); tr.dataset.id = row.id;
      tr.innerHTML = `
        <td>${row.id}</td>
        <td><span class="view">${fmtLocal(row.debut)}</span><input class="form-control form-control-sm edit d-none" type="datetime-local" value="${toDatetimeLocal(row.debut)}"></td>
        <td><span class="view">${fmtLocal(row.fin)}</span><input class="form-control form-control-sm edit d-none" type="datetime-local" value="${toDatetimeLocal(row.fin)}"></td>
        <td style="max-width:90px"><span class="view">${row.nb_min??""}</span><input class="form-control form-control-sm edit d-none" type="number" min="0" value="${row.nb_min??1}"></td>
        <td style="max-width:90px"><span class="view">${row.nb_max??""}</span><input class="form-control form-control-sm edit d-none" type="number" min="0" value="${row.nb_max??3}"></td>
        <td><span class="view">${row.notes??""}</span><input class="form-control form-control-sm edit d-none" type="text" value="${row.notes??""}"></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary me-1 btn-edit" title="Modifier"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-success me-1 d-none btn-save" title="Enregistrer"><i class="bi bi-check-lg"></i></button>
          <button class="btn btn-sm btn-outline-secondary me-1 d-none btn-cancel" title="Annuler"><i class="bi bi-x-lg"></i></button>
          <button class="btn btn-sm btn-outline-danger btn-del" title="Supprimer"><i class="bi bi-trash"></i></button>
        </td>`;
      tableBody.appendChild(tr);
    }
  }
  function toggleEdit(tr,on){tr.querySelectorAll(".view").forEach(e=>e.classList.toggle("d-none",on));tr.querySelectorAll(".edit").forEach(e=>e.classList.toggle("d-none",!on));tr.querySelector(".btn-edit").classList.toggle("d-none",on);tr.querySelector(".btn-save").classList.toggle("d-none",!on);tr.querySelector(".btn-cancel").classList.toggle("d-none",!on);}

  btnRefresh?.addEventListener("click", ()=>load().catch(console.error));
  searchInput?.addEventListener("input", ()=>load().catch(console.error));

  document.querySelector("#creneauxTable tbody")?.addEventListener("click", async (e)=>{
    const b=e.target.closest("button"); if(!b) return;
    const tr=e.target.closest("tr"); const id=Number(tr.dataset.id);
    if(b.classList.contains("btn-edit")){toggleEdit(tr,true);return;}
    if(b.classList.contains("btn-cancel")){toggleEdit(tr,false);const r=rows.find(x=>x.id===id);const ed=tr.querySelectorAll(".edit");ed[0].value=toDatetimeLocal(r.debut);ed[1].value=toDatetimeLocal(r.fin);ed[2].value=r.nb_min??1;ed[3].value=r.nb_max??3;ed[4].value=r.notes??"";return;}
    if(b.classList.contains("btn-save")){
      const ed=tr.querySelectorAll(".edit");
      const payload={groupe_id:gid,debut:fromLocalToUtcIso(ed[0].value),fin:fromLocalToUtcIso(ed[1].value),nb_min:Number(ed[2].value||1),nb_max:Number(ed[3].value||3),notes:ed[4].value?.trim()||null};
      const r=await fetch(`/api/creneaux/${id}`,{
        method:"PUT",
        credentials: "include",
        headers:{"Content-Type":"application/json","X-Requested-With":"fetch"},
        body:JSON.stringify(payload)
      });
      const j=await r.json(); if(!j.ok){log("update error", j); return alert(j.error||"Erreur MAJ");}
      toggleEdit(tr,false); await load().catch(console.error); return;
    }
    if(b.classList.contains("btn-del")){
      if(!confirm("Supprimer ce créneau ? (et ses inscriptions le cas échéant)")) return;
      const r=await fetch(`/api/creneaux/${id}`,{ method:"DELETE", credentials: "include", headers:{ "X-Requested-With":"fetch"} });
      const j=await r.json(); if(!j.ok){log("delete error", j); return alert(j.error||"Erreur suppression");}
      await load().catch(console.error); return;
    }
  });

  addForm?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const payload={groupe_id:gid,debut:fromLocalToUtcIso(addDebut.value),fin:fromLocalToUtcIso(addFin.value),nb_min:Number(addMin.value||1),nb_max:Number(addMax.value||3),notes:addNotes.value?.trim()||null};
    const r=await fetch("/api/creneaux",{
      method:"POST",
      credentials: "include",
      headers:{"Content-Type":"application/json","X-Requested-With":"fetch"},
      body:JSON.stringify(payload)
    });
    const j=await r.json(); if(!j.ok){log("create error", j); return alert(j.error||"Erreur enregistrement");}
    document.getElementById("formAddCreneau")?.classList.remove("show"); setDefaults(); await load().catch(console.error);
  });

  function openForGroupeId(groupeId){
    gid=Number(groupeId); log("openForGroupeId", gid);
    if(!gid) return;
    setDefaults();
    if(!bsModal) bsModal=new bootstrap.Modal(modalEl);
    bsModal.show(); load().catch(console.error);
  }
  return { openForGroupeId };
}
