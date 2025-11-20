document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const currentPath = window.location.pathname;

  if (user && user.role) {
    if (user.role === "superadmin" && !currentPath.includes("/publicsuperadmin/")) {
      window.location.replace("/publicsuperadmin/superadmin.html");
      return;
    }

    if (user.role === "admin" && !currentPath.includes("/publicadmin/")) {
      window.location.replace("/publicadmin/index.html");
      return;
    }

    if (user.role === "user" && !currentPath.includes("/public/")) {
      window.location.replace("/public/creneaux-publics.html");
      return;
    }
  }
});

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const identifier = document.getElementById("login-identifier").value.trim();
    const password = document.getElementById("login-password").value.trim();
    const message = document.getElementById("message");
    
    if (message) message.textContent = "";

    if (!identifier || !password) {
      if (message) {
        message.textContent = "Veuillez remplir tous les champs.";
        message.style.color = "red";
      }
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!data.ok) {
        let msg = data.error || "Identifiants invalides";
        if (msg === "account not activated") msg = "Compte non activé. Vérifiez votre e-mail.";
        if (message) {
          message.textContent = msg;
          message.style.color = "red";
        }
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (message) {
        message.textContent = "Connexion réussie, redirection...";
        message.style.color = "green";
      }

      setTimeout(() => {
        if (data.user.role === "superadmin") {
          window.location.replace("/publicsuperadmin/superadmin.html");
        } else if (data.user.role === "admin") {
          window.location.replace("/publicadmin/index.html");
        } else {
          window.location.replace("/public/creneaux-publics.html");
        }
      }, 800);
    } catch (err) {
      console.error("Erreur login:", err);
      if (message) {
        message.textContent = "Erreur réseau ou serveur.";
        message.style.color = "red";
      }
    }
  });
}

const regModal = document.getElementById("register-modal");
const openReg = document.getElementById("open-register");
const closeReg = document.getElementById("close-register");

if (openReg && closeReg && regModal) {
  openReg.addEventListener("click", (e) => {
    e.preventDefault();
    regModal.style.display = "flex";
  });

  closeReg.addEventListener("click", (e) => {
    e.preventDefault();
    regModal.style.display = "none";
  });

  regModal.addEventListener("click", (e) => {
    if (e.target === regModal) regModal.style.display = "none";
  });
}

const regForm = document.getElementById("registerForm");
if (regForm) {
  regForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("reg-username").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value.trim();
    const msg = document.getElementById("register-message");
    
    if (msg) msg.textContent = "";

    if (!username || !email || !password) {
      if (msg) {
        msg.textContent = "Tous les champs sont requis.";
        msg.style.color = "red";
      }
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
      });

      const data = await res.json();

      if (!data.ok) {
        let msgText = data.error || "Erreur serveur.";
        if (msgText === "email already used") msgText = "Cet e-mail est déjà utilisé.";
        if (msg) {
          msg.textContent = msgText;
          msg.style.color = "red";
        }
        return;
      }

      if (msg) {
        msg.innerHTML = "Compte créé ! Vérifiez votre e-mail pour activer votre compte.";
        msg.style.color = "green";
      }

      setTimeout(() => {
        if (regModal) regModal.style.display = "none";
      }, 4000);
    } catch (err) {
      console.error("Erreur register:", err);
      if (msg) {
        msg.textContent = "Erreur réseau ou serveur.";
        msg.style.color = "red";
      }
    }
  });
}
