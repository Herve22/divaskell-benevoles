/* Console SQL – Superadmin */
(() => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const elSQL = $("#sql-input");
  const elRun = $("#btnRun");
  const elRO  = $("#btnReadOnly");
  const elClear = $("#btnClear");
  const elCopy = $("#btnCopy");
  const elExamples = $("#btnExamples");
  const elNotice = $("#notice");
  const elResultWrap = $("#resultWrap");
  const elResult = $("#result");
  const elMeta = $("#meta");
  const elCSV = $("#btnCSV");
  const elJSON = $("#btnJSON");
const elStructures = $("#btnStructures");
const elStructuresWrap = $("#structuresWrap");
const elStructuresContent = $("#structures");
const elCloseStructures = $("#btnCloseStructures");

const elExportStructuresCSV = $("#btnExportStructuresCSV");
const elExportStructuresJSON = $("#btnExportStructuresJSON");


  const API = "/api/superadmin/sql";
  const STORAGE_KEY = "superadmin:sql:last";

  const token = localStorage.getItem("token");
  if (!token) {
    showNotice("❌ Jeton manquant — veuillez vous reconnecter.", "danger");
  }

  // Charger requête précédente ou valeur par défaut
  elSQL.value = localStorage.getItem(STORAGE_KEY) || "SELECT name FROM sqlite_master WHERE type='table' ORDER BY 1;";

  // Raccourcis clavier
  elSQL.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) run(true);
      else run(false);
    }
  });

  elRun.addEventListener("click", () => run(false));
  elRO.addEventListener("click", () => run(true));

  elClear.addEventListener("click", () => {
    elSQL.value = "";
    localStorage.removeItem(STORAGE_KEY);
    elResultWrap.classList.add("d-none");
    showNotice("Zone de saisie effacée.", "secondary");
  });

  elCopy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(elSQL.value);
      showNotice("Requête copiée dans le presse-papiers ✅", "success");
    } catch {
      showNotice("Impossible de copier la requête.", "warning");
    }
  });

  elExamples.addEventListener("click", () => {
    const samples = [
      "SELECT * FROM users LIMIT 10;",
      "PRAGMA table_info(users);",
      "SELECT COUNT(*) AS total FROM users;",
      "SELECT id, username, email, role, is_active FROM users ORDER BY id DESC LIMIT 20;"
    ];
    elSQL.value = samples.join("\n");
    elSQL.focus();
  });

  elCSV.addEventListener("click", () => exportCSV());
  elJSON.addEventListener("click", () => exportJSON());
elStructures.addEventListener("click", () => showStructures());
elCloseStructures.addEventListener("click", () => {
  elStructuresWrap.classList.add("d-none");
});


elExportStructuresCSV.addEventListener("click", () => exportStructuresCSV());
elExportStructuresJSON.addEventListener("click", () => exportStructuresJSON());

  async function run(readOnly) {
    elResultWrap.classList.add("d-none");
    clearNotice();

    const sql = (elSQL.value || "").trim();
    if (!sql) {
      return showNotice("⛔️ Saisis une requête SQL.", "warning");
    }
    if (!token) {
      return showNotice("❌ Jeton manquant — reconnecte-toi.", "danger");
    }

    localStorage.setItem(STORAGE_KEY, sql);

    const t0 = performance.now();
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({ sql, readOnly })
      });

      const data = await res.json();
      const t1 = performance.now();

      console.debug("[SQL]", { readOnly, sql, data });

      if (!data.ok) {
        showNotice(`❌ ${data.error || "Erreur serveur"}`, "danger");
        return;
      }

      if (readOnly) {
        renderRows(data.rows || []);
        elMeta.textContent = `Lecture seule • ${data.rows?.length ?? 0} ligne(s) • ${Math.round(t1 - t0)} ms`;
      } else {
        renderWriteResult(data);
        elMeta.textContent = `Écriture • ${data.changes ?? 0} ligne(s) affectée(s) • ${Math.round(t1 - t0)} ms`;
      }

      elResultWrap.classList.remove("d-none");
    } catch (err) {
      console.error(err);
      showNotice(`❌ ${err.message || err}`, "danger");
    }
  }

  function renderWriteResult(data) {
    const html = `
      <div class="d-flex align-items-center gap-2">
        <span class="badge bg-success-subtle text-success-emphasis px-3 py-2">
          <i class="bi bi-check-circle-fill me-1"></i>OK
        </span>
        <code class="small">changes = ${Number(data.changes || 0)}</code>
      </div>
    `;
    elResult.innerHTML = html;
  }

  function renderRows(rows) {
    if (!rows || !rows.length) {
      elResult.innerHTML = `<div class="text-body-secondary">Aucune ligne.</div>`;
      return;
    }
    // colonnes à partir du premier objet
    const cols = Object.keys(rows[0]);

    let thead = `<thead><tr>${cols.map(c => `<th>${escapeHTML(c)}</th>`).join("")}</tr></thead>`;
    let tbody = "<tbody>";
    for (const r of rows) {
      tbody += `<tr>${cols.map(c => `<td>${escapeHTML(valueToString(r[c]))}</td>`).join("")}</tr>`;
    }
    tbody += "</tbody>";

    elResult.innerHTML = `
      <div class="table-responsive">
        <table class="table table-hover table-sm align-middle">
          ${thead}${tbody}
        </table>
      </div>
    `;
    // stocker pour export
    elResult.dataset.rows = JSON.stringify(rows);
  }

  function exportCSV() {
    const raw = elResult.dataset.rows;
    if (!raw) return showNotice("Rien à exporter.", "secondary");
    const rows = JSON.parse(raw);
    if (!rows.length) return showNotice("Rien à exporter.", "secondary");

    const cols = Object.keys(rows[0]);
    const lines = [];
    lines.push(cols.map(csvEscape).join(","));
    for (const r of rows) {
      lines.push(cols.map(c => csvEscape(valueToString(r[c]))).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, "result.csv");
  }

  function exportJSON() {
    const raw = elResult.dataset.rows;
    if (!raw) return showNotice("Rien à exporter.", "secondary");
    const blob = new Blob([raw], { type: "application/json" });
    downloadBlob(blob, "result.json");
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function showNotice(msg, type = "info") {
    elNotice.className = `alert alert-${type}`;
    elNotice.innerHTML = msg;
    elNotice.classList.remove("d-none");
  }
  function clearNotice() {
    elNotice.classList.add("d-none");
  }

  function escapeHTML(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }
  function csvEscape(s) {
    s = String(s ?? "");
    if (s.includes('"') || s.includes(",") || s.includes("\n")) {
      return `"${s.replaceAll('"', '""')}"`;
    }
    return s;
  }
  function valueToString(v) {
    if (v === null || typeof v === "undefined") return "";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  }

async function showStructures() {
  elStructuresWrap.classList.add("d-none");
  clearNotice();

  if (!token) {
    return showNotice("❌ Jeton manquant — reconnecte-toi.", "danger");
  }

  const sql = `
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    AND name NOT LIKE 'sqlite_%'
    ORDER BY name;
  `;

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ sql, readOnly: true })
    });

    const data = await res.json();

    if (!data.ok || !data.rows) {
      return showNotice(`❌ ${data.error || "Impossible de récupérer les tables"}`, "danger");
    }

    const tables = data.rows.map(r => r.name);
    
    // Récupérer la structure de chaque table
    const structures = [];
    for (const tableName of tables) {
      const infoSQL = `PRAGMA table_info(${tableName});`;
      const infoRes = await fetch(API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({ sql: infoSQL, readOnly: true })
      });
      
      const infoData = await infoRes.json();
      if (infoData.ok && infoData.rows) {
        structures.push({ name: tableName, columns: infoData.rows });
      }
    }

    renderStructures(structures);
    elStructuresWrap.classList.remove("d-none");
    
  } catch (err) {
    console.error(err);
    showNotice(`❌ ${err.message || err}`, "danger");
  }
}

function renderStructures(structures) {
   if (!structures || !structures.length) {
    elStructuresContent.innerHTML = `<div class="text-body-secondary">Aucune table trouvée.</div>`;
    return;
  }

  elStructuresContent.dataset.structures = JSON.stringify(structures);


  let html = '<div class="accordion" id="accordionStructures">';
  
  structures.forEach((table, idx) => {
    const collapseId = `collapse${idx}`;
    html += `
      <div class="accordion-item">
        <h2 class="accordion-header">
          <button class="accordion-button ${idx === 0 ? '' : 'collapsed'}" type="button" 
                  data-bs-toggle="collapse" data-bs-target="#${collapseId}">
            <i class="bi bi-table me-2"></i><strong>${escapeHTML(table.name)}</strong>
            <span class="badge bg-secondary ms-2">${table.columns.length} colonnes</span>
          </button>
        </h2>
        <div id="${collapseId}" class="accordion-collapse collapse ${idx === 0 ? 'show' : ''}" 
             data-bs-parent="#accordionStructures">
          <div class="accordion-body p-0">
            <table class="table table-sm table-hover mb-0">
              <thead class="table-light">
                <tr>
                  <th>Colonne</th>
                  <th>Type</th>
                  <th>NOT NULL</th>
                  <th>Défaut</th>
                  <th>PK</th>
                </tr>
              </thead>
              <tbody>
    `;
    
    table.columns.forEach(col => {
      html += `
        <tr>
          <td><code>${escapeHTML(col.name)}</code></td>
          <td>${escapeHTML(col.type)}</td>
          <td>${col.notnull ? '✓' : ''}</td>
          <td>${col.dflt_value ? escapeHTML(col.dflt_value) : '<em class="text-muted">NULL</em>'}</td>
          <td>${col.pk ? '🔑' : ''}</td>
        </tr>
      `;
    });
    
    html += `
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  elStructuresContent.innerHTML = html;
}

function exportStructuresCSV() {
  const raw = elStructuresContent.dataset.structures;
  if (!raw) return showNotice("Aucune structure à exporter.", "secondary");
  
  const structures = JSON.parse(raw);
  const lines = [];
  lines.push("Table,Colonne,Type,NOT NULL,Défaut,Clé Primaire");
  
  for (const table of structures) {
    for (const col of table.columns) {
      lines.push([
        csvEscape(table.name),
        csvEscape(col.name),
        csvEscape(col.type),
        col.notnull ? "Oui" : "Non",
        csvEscape(col.dflt_value || ""),
        col.pk ? "Oui" : "Non"
      ].join(","));
    }
  }
  
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, "structures.csv");
  showNotice("Export CSV téléchargé ✅", "success");
}

function exportStructuresJSON() {
  const raw = elStructuresContent.dataset.structures;
  if (!raw) return showNotice("Aucune structure à exporter.", "secondary");
  
  const blob = new Blob([raw], { type: "application/json" });
  downloadBlob(blob, "structures.json");
  showNotice("Export JSON téléchargé ✅", "success");
}


})();




