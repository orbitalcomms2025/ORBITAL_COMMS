document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const showRegister = document.getElementById("showRegister");
  const showLogin = document.getElementById("showLogin");
  const welcome = document.getElementById("welcome");
  const userEmailSpan = document.getElementById("userEmail");
  const logoutBtn = document.getElementById("logoutBtn");

  // Mostrar registro
  showRegister.addEventListener("click", (e) => {
    e.preventDefault();
    loginForm.style.display = "none";
    registerForm.style.display = "block";
  });

  // Mostrar login
  showLogin.addEventListener("click", (e) => {
    e.preventDefault();
    registerForm.style.display = "none";
    loginForm.style.display = "block";
  });

  // Registro
  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;

    // Guardamos en localStorage
    localStorage.setItem(email, password);
    alert("Usuario registrado con éxito ✅");

    registerForm.reset();
    registerForm.style.display = "none";
    loginForm.style.display = "block";
  });

  // Login
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    const storedPassword = localStorage.getItem(email);

    if (storedPassword && storedPassword === password) {
      localStorage.setItem("loggedInUser", email);
      showWelcome(email);
    } else {
      alert("Email o contraseña incorrectos ❌");
    }
  });

  // Mostrar bienvenida
  function showWelcome(email) {
    loginForm.style.display = "none";
    registerForm.style.display = "none";
    welcome.style.display = "block";
    userEmailSpan.textContent = email;
  }

  // Cerrar sesión
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("loggedInUser");
    welcome.style.display = "none";
    loginForm.style.display = "block";
  });

  // Revisar si ya hay sesión
  const currentUser = localStorage.getItem("loggedInUser");
  if (currentUser) {
    showWelcome(currentUser);
  }
});
