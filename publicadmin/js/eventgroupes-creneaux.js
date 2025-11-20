// eventgroupes-creneaux.js
// Injects a "Creneaux" button near each group label and manages a big modal for CRUD.
// No changes to existing logic; everything is appended at runtime.

// util
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const esc = (s) => String(s||"").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

// create modal DOM once
function ensureModal() {
  if ($("#modalCreneaux")) return;
  const html = `
  <div class="modal fade" id="modalCreneaux" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Gerer les creneaux — Groupe: <span id="crn-group-name" class="fw-semibold"></span></h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <form id="crn-form" class="row g-3 mb-3">
            <input type="hidden" id="crn-groupe-id" />
            <div class="col-md-4">
              <label class="form-label">Start</label>
              <input type="datetime-local" class="form-control" id="crn-debut" required>
            </div>
            <div class="col-md-4">
              <label class="form-label">End</label>
              <input type="datetime-local" class="form-control" id="crn-fin" required>
            </div>
            <div class="col-md-2">
              <label class="form-label">Min</label>
              <input type="number" min="0" class="form-control" id="crn-nb-min" value="1">
            </div>
            <div class="col-md-2">
              <label class="form-label">Max</label>
              <input type="number" min="0" class="form-control" id="crn-nb-max" value="3">
            </div>
            <div class="col-12">
              <label class="form-label">Notes</label>
              <input type="text" class="form-control" id="crn-notes" placeholder="Optional note">
            </div>
            <div class="col-12 d-flex justify-content-end">
              <button type="submit" class="btn btn-primary"><i class="bi bi-plus-circle"></i> Add timeslot</button>
            </div>
          </form>
          <div class="table-responsive">
            <table class="table align-middle" id="crn-table">
              <thead><tr>
                <th>ID</th><th>Start</th><th>End</th><th>Min</th><th>Max</th><th>Notes</th><th></th>
              </tr></thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  </div>`;
  const wrap = document.createElement("div");
  wrap.innerHTML = html;
  document.body.appendChild(wrap.firstElementChild);

  // form submit
  $("#crn-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      groupe_id: Number($("#crn-groupe-id").value),
      debut: $("#crn-debut").value,
      fin: $("#crn-fin").value,
      nb_min: Number($("#crn-nb-min").value || 1),
      nb_max: Number($("#crn-nb-max").value || 3),
      notes: $("#crn-notes").value || ""
    };
    if (!payload.groupe_id || !payload.debut || !payload.fin) return alert("Missing required fields");
    try {
      const r = await fetch("/api/creneaux", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "create error");
      loadCreneaux(payload.groupe_id);
    } catch (e) { alert(e.message); }
  });
}

// load list
async function loadCreneaux(gid) {
  try {
    const r = await fetch(`/api/creneaux?groupe_id=${gid}`);
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || "load error");
    renderRows(j.creneaux || []);
  } catch (e) {
    console.error("[creneaux] load:", e);
    renderRows([]);
  }
}

function renderRows(rows) {
  const tb = $("#crn-table tbody");
  if (!tb) return;
  tb.innerHTML = "";
  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="7" class="text-center text-muted">No timeslots yet</td>`;
    tb.appendChild(tr); return;
  }
  for (const r of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.id}</td>
      <td>${fmtLocal(r.debut)}</td>
      <td>${fmtLocal(r.fin)}</td>
      <td>${r.nb_min ?? ""}</td>
      <td>${r.nb_max ?? ""}</td>
      <td>${esc(r.notes || "")}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-danger" data-del="${r.id}">
          <i class="bi bi-trash"></i>
        </button>
      </td>`;
    tb.appendChild(tr);
  }
  $$("#crn-table [data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.getAttribute("data-del"));
      if (!confirm("Delete this timeslot?")) return;
      try {
        const r = await fetch(`/api/creneaux/${id}`, { method: "DELETE" });
        const j = await r.json();
        if (!j.ok) throw new Error(j.error || "delete error");
        const gid = Number($("#crn-groupe-id").value);
        loadCreneaux(gid);
      } catch (e) { alert(e.message); }
    });
  });
}

function fmtLocal(s) {
  try { const d = new Date(s);
    const p=(n)=>String(n).padStart(2,"0");
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  } catch { return s; }
}

// inject "Creneaux" buttons near each group label
function injectButtons() {
  // heuristics: look for common chips/pills; keep non-destructive
  const candidates = [
    ".js-group-pill",                // preferred if you add this class
    ".badge[data-groupe-id]",
    "[data-groupe-id]",
    ".group-chip",
    ".groupe-item"
  ];
  let found = false;
  for (const sel of candidates) {
    const items = $$(sel);
    if (!items.length) continue;
    items.forEach(el => {
      if (el.dataset.crnBtn === "1") return;
      const gid = Number(el.dataset.groupeId || el.getAttribute("data-groupe-id"));
      const gname = (el.textContent || "").trim();
      if (!gid) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-sm btn-outline-primary ms-2";
      btn.textContent = "Créneaux";
      btn.addEventListener("click", () => {
        ensureModal();
        $("#crn-groupe-id").value = gid;
        $("#crn-group-name").textContent = gname;
        loadCreneaux(gid);
        const modalEl = $("#modalCreneaux");
        const modal = window.bootstrap ? new bootstrap.Modal(modalEl) : null;
        modal ? modal.show() : modalEl.classList.add("show"); // fallback
      });
      el.after(btn);
      el.dataset.crnBtn = "1";
    });
    found = found || items.length > 0;
  }
  if (!found) {
    console.debug("[creneaux] no group elements found; add class js-group-pill and data-groupe-id on group labels.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  ensureModal();
  injectButtons();
  const obs = new MutationObserver(() => injectButtons());
  obs.observe(document.body, { childList:true, subtree:true });
});
