console.log("[superadmin] script chargé ✅");

const token = localStorage.getItem("token");
const usersDiv = document.getElementById("users");
const welcome = document.getElementById("welcome");

// Vérifie l'authentification
// Vérifie l'authentification et le rôle
async function verify() {
  if (!token) {
    usersDiv.innerHTML = "⚠️ Non connecté. <a href='/public/login.html'>Connexion</a>";
    return false;
  }

  const res = await fetch("/api/auth/verify", {
    headers: { Authorization: "Bearer " + token }
  });
  const data = await res.json();
  console.log("[verify]", data);

  if (!data.ok) {
    usersDiv.innerHTML = "🚫 Token invalide. <a href='/public/login.html'>Se reconnecter</a>";
    return false;
  }

  // ✅ Autoriser admin et superadmin
  if (data.user.role !== "admin" && data.user.role !== "superadmin") {
    usersDiv.innerHTML = "🚫 Accès réservé aux administrateurs ou superadmins.";
    return false;
  }

  welcome.textContent = `Connecté en tant que ${data.user.username} (${data.user.role})`;
  return true;
}


// Liste des utilisateurs
async function loadUsers() {
  usersDiv.innerHTML = "Chargement...";
  const res = await fetch("/api/users", {
    headers: { Authorization: "Bearer " + token }
  });
  const data = await res.json();
  console.log("[loadUsers]", data);

  if (!data.ok) {
    usersDiv.innerHTML = "Erreur lors du chargement des utilisateurs.";
    return;
  }

  let html = "<table><tr><th>ID</th><th>Nom</th><th>Email</th><th>Rôle</th><th>Actif</th></tr>";
  for (const u of data.users) {
    html += `<tr><td>${u.id}</td><td>${u.username}</td><td>${u.email}</td><td>${u.role}</td><td>${u.is_active ? "✅" : "❌"}</td></tr>`;
  }
  html += "</table>";
  usersDiv.innerHTML = html;
}

// Exécution SQL
async function execSQL(readOnly) {
  const sql = document.getElementById("sql-input").value.trim();
  if (!sql) return;
  document.getElementById("result").textContent = "⏳ Exécution...";

  try {
    const res = await fetch("/api/superadmin/sql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({ sql, readOnly })
    });
    const data = await res.json();
    console.log("[execSQL]", data);
    document.getElementById("result").textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    console.error("[execSQL] erreur", err);
    document.getElementById("result").textContent = "❌ Erreur réseau ou serveur.";
  }
}

document.getElementById("exec-sql").addEventListener("click", () => execSQL(false));
document.getElementById("read-sql").addEventListener("click", () => execSQL(true));

// Init
(async () => {
  const ok = await verify();
  if (ok) await loadUsers();
})();
