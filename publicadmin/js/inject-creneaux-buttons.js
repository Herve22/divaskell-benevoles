(function(){
  const log = (...a)=>console.log("[inject-creneaux]", ...a);

  function buildMap() {
    const sel = document.getElementById("select-groupe");
    const map = new Map();
    if (!sel) { log("select-groupe introuvable"); return map; }
    Array.from(sel.options).forEach(o=>{
      const id = Number(o.value), name = (o.textContent||"").trim();
      if (id && name) map.set(name, id);
    });
    return map;
  }

  function ensureButtonFor(li, name, gid) {
    if (!gid) { log("pas d'ID pour", name); return; }

    // Cas 1: structure "input-group" (input + btn poubelle)
    const input = li.querySelector("input.form-control[readonly]") || li.querySelector("input.form-control");
    if (input) {
      let group = input.closest(".input-group");
      if (!group) {
        group = document.createElement("div");
        group.className = "input-group";
        input.replaceWith(group); group.appendChild(input);
      }
      // éviter doublons
      if (!group.querySelector(".btn-creneaux")) {
        const btn = document.createElement("button");
        btn.type="button";
        btn.className="btn btn-outline-success btn-creneaux js-open-creneaux";
        btn.dataset.gid = String(gid);
        btn.setAttribute("data-gid", String(gid));
        btn.innerHTML = '<i class="bi bi-calendar3"></i> Créneaux';
        // insérer avant le dernier bouton (souvent la poubelle)
        const lastBtn = group.querySelector("button:last-of-type");
        if (lastBtn) group.insertBefore(btn, lastBtn);
        else group.appendChild(btn);
        log("injecté (input-group) pour", name, "gid:", gid);
      }
      return;
    }

    // Cas 2: structure "li" simple avec wrap actions
    let actions = li.querySelector(".d-flex.gap-2");
    if (!actions) {
      actions = document.createElement("div"); actions.className="d-flex gap-2"; li.appendChild(actions);
    }
    if (!actions.querySelector(".btn-creneaux")) {
      const btn = document.createElement("button");
      btn.type="button";
      btn.className="btn btn-sm btn-outline-success btn-creneaux js-open-creneaux";
      btn.dataset.gid = String(gid);
      btn.setAttribute("data-gid", String(gid));
      btn.innerHTML = '<i class="bi bi-calendar3"></i> Créneaux';
      actions.prepend(btn);
      log("injecté (simple) pour", name, "gid:", gid);
    }
  }

  function inject() {
    const map = buildMap();
    document.querySelectorAll("#groupes-list li").forEach(li=>{
      const name = (li.querySelector(".fw-medium, span, input.form-control[readonly]")?.value || li.querySelector(".fw-medium, span")?.textContent || "").trim();
      const gid = map.get(name);
      ensureButtonFor(li, name, gid);
    });
  }

  const list = document.getElementById("groupes-list");
  const sel  = document.getElementById("select-groupe");
  if (list) new MutationObserver(inject).observe(list, { childList:true, subtree:true });
  if (sel)  new MutationObserver(inject).observe(sel,  { childList:true, subtree:true });
  inject(); setTimeout(inject, 600); setTimeout(inject, 1200);
})();
