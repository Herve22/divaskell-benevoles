/* Superadmin — Sessions actives */
(() => {
  const $  = (s) => document.querySelector(s);
  const tblBody = $("#tblSessions tbody");
  const meta    = $("#meta");
  const notice  = $("#notice");
  const btnRefresh   = document.getElementById("btnRefresh");
  const btnKillOthers = document.getElementById("btnKillOthers");

  const API_LIST        = "/api/sessions";
  const API_KILL_ONE    = (id) => `/api/sessions/${encodeURIComponent(id)}`;
  const API_KILL_ONE_F  = (id) => `/api/sessions/${encodeURIComponent(id)}/kill`;
  const API_KILL_OTHERS = "/api/sessions/kill-others";

  const token = localStorage.getItem("token");

  init();

  async function init() {
    if (!token) return show("❌ Non connecté — merci de te reconnecter.", "danger");
    const ok = await verifyRole();
    if (!ok) return;
    btnRefresh?.addEventListener("click", load);
    btnKillOthers?.addEventListener("click", killOthers);
    await load();
  }

  async function verifyRole() {
    try {
      const res  = await fetch("/api/auth/verify", { headers: { Authorization: "Bearer " + token }});
      const data = await res.json();
      if (!data?.ok) { show("🚫 Token invalide — reconnecte-toi.", "danger"); return false; }
      const role = data?.user?.role;
      if (role !== "admin" && role !== "superadmin") { show("🚫 Accès réservé aux administrateurs.", "danger"); return false; }
      localStorage.setItem("user", JSON.stringify(data.user));
      return true;
    } catch {
      show("❌ Erreur de vérification d'authentification.", "danger");
      return false;
    }
  }

  async function load() {
    setRows([["Chargement…"]]);
    const t0 = performance.now();
    try {
      const res = await fetch(API_LIST, { headers: { Authorization: "Bearer " + token }});
      const data = await res.json();
      const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
      render(sessions);
      meta.textContent = `${sessions.length} session(s) • ${Math.round(performance.now()-t0)} ms`;
    } catch (e) {
      console.error(e);
      setRows([]);
      show("❌ Erreur réseau.", "danger");
    }
  }

  function render(items) {
    if (!items.length) return setRows([["Aucune session active."]]);
    const me = safeJSON(localStorage.getItem("user")) || {};
    const rows = items.map(s => {
      const sidShort = String(s.id || "").slice(0, 8) || "—";
      const userStr  = s.username ? `${s.username} <span class="text-body-secondary">#${s.user_id ?? "?"}</span>` : `#${s.user_id ?? "?"}`;
      const role     = s.role || "user";
      const ip       = s.ip || s.ipAddress || "—";
      const ua       = (s.userAgent || "—").slice(0, 48) + ((s.userAgent || "").length > 48 ? "…" : "");
      const created  = toLocal(s.createdAt || s.created_at);
      const last     = toLocal(s.lastSeen || s.last_seen_at);
      const status   = s.revoked ? "revoked" : "active";
      const isMine   = String(s.user_id) === String(me.id);

      return `
        <tr>
          <td><code>${sidShort}</code></td>
          <td>${userStr}</td>
          <td><span class="badge ${roleBadge(role)}">${role}</span></td>
          <td>${escapeHTML(ip)}</td>
          <td><span title="${escapeHTML(s.userAgent || "")}">${escapeHTML(ua)}</span></td>
          <td>${created}</td>
          <td>${last}</td>
          <td><span class="badge ${status === "active" ? "bg-success" : "bg-danger"}">${status}</span></td>
          <td class="text-end">
            <button class="btn btn-sm ${isMine ? "btn-outline-secondary" : "btn-outline-danger"}"
                    ${isMine ? "disabled title='Ta session actuelle'" : ""}
                    data-id="${escapeHTML(s.id)}">
              <i class="bi bi-x-octagon"></i> Kill
            </button>
          </td>
        </tr>`;
    });
    tblBody.innerHTML = rows.join("");
    tblBody.querySelectorAll("button[data-id]").forEach(btn => btn.addEventListener("click", () => killOne(btn.dataset.id)));
  }

  async function killOne(id) {
    if (!confirm("Confirmer la suppression de cette session ?")) return;
    try {
      let res = await fetch(API_KILL_ONE(id), { method: "DELETE", headers: { Authorization: "Bearer " + token }});
      if (res.status === 404 || res.status === 405)
        res = await fetch(API_KILL_ONE_F(id), { method: "POST", headers: { Authorization: "Bearer " + token }});
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok !== false) { show("✅ Session supprimée.", "success"); await load(); }
      else { show("❌ Échec suppression session.", "danger"); }
    } catch (e) { console.error(e); show("❌ Erreur réseau.", "danger"); }
  }

  async function killOthers() {
    if (!confirm("⚠️ Confirmer la suppression de toutes les autres sessions ?")) return;
    try {
      const res = await fetch(API_KILL_OTHERS, { method: "POST", headers: { Authorization: "Bearer " + token }});
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok !== false) { show("🔥 Autres sessions supprimées.", "success"); await load(); }
      else { show("❌ Impossible de supprimer les autres sessions.", "danger"); }
    } catch (e) { console.error(e); show("❌ Erreur réseau.", "danger"); }
  }

  // Helpers
  function roleBadge(role){ if(role==="superadmin")return"bg-danger"; if(role==="admin")return"bg-primary"; return"bg-secondary"; }
  function toLocal(v){ if(!v)return"—"; try{ return new Date(v).toLocaleString(); } catch{ return String(v);} }
  function setRows(arr){ tblBody.innerHTML = arr.map(cols => `<tr><td colspan="9" class="text-center text-muted">${cols[0]}</td></tr>`).join(""); }
  function show(msg, type="info"){ notice.className=`alert alert-${type}`; notice.textContent=msg; notice.classList.remove("d-none"); setTimeout(()=>notice.classList.add("d-none"), 3500); }
  function safeJSON(s){ try{ return JSON.parse(s);}catch{return null;} }
  function escapeHTML(s){ return String(s ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
})();
