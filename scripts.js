// ===== CONFIG =====
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwHuxsWXusXhKdtQUK1D1AEgBVLCsn8VenNOkIbUju9eZCyHY-ib9e6YmRfEtj6InXh5g/exec';
const slideWidth = 360;
let autoScroll = true;
let scrollInterval;

// ===== TEST WEB APP CONNECTIVITY =====
async function testWebApp() {
  try {
    const response = await fetch(WEBAPP_URL + "?action=test", { method: 'GET' });
    if (!response.ok) throw new Error('Network response was not ok');
    const result = await response.json();
    console.log('Web App test:', result);
  } catch (err) {
    console.error('Web App connection error:', err);
    alert('Cannot connect to Web App. Check deployment and permissions.');
  }
}
window.addEventListener("load", () => {
  testWebApp();
  loadSavedUser();
});

// ===== MENU TOGGLE =====
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('show');
  navToggle.classList.toggle('open'); 
});

// ===== STICKY HEADER =====
const header = document.querySelector('header');
window.addEventListener('scroll', () => {
  header.classList.toggle('sticky', window.scrollY > 50);
});

// ===== BACK TO TOP =====
const backToTop = document.getElementById('backToTop');
window.addEventListener('scroll', () => {
  backToTop.style.display = window.scrollY > 300 ? 'block' : 'none';
});
backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ===== CAROUSEL WITH ARROWS AND AUTOSCROLL =====
const carousel = document.querySelector('.carousel');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');

function scrollNext() {
  if (carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth) {
    carousel.scrollTo({ left: 0, behavior: 'smooth' });
  } else {
    carousel.scrollBy({ left: slideWidth, behavior: 'smooth' });
  }
}
if (prevBtn && nextBtn && carousel) {
  nextBtn.addEventListener('click', () => { scrollNext(); resetAutoScroll(); });
  prevBtn.addEventListener('click', () => {
    if (carousel.scrollLeft <= 0) carousel.scrollTo({ left: carousel.scrollWidth, behavior: 'smooth' });
    else carousel.scrollBy({ left: -slideWidth, behavior: 'smooth' });
    resetAutoScroll();
  });
}
function startAutoScroll() { scrollInterval = setInterval(scrollNext, 2000); }
function resetAutoScroll() { if (autoScroll) { clearInterval(scrollInterval); startAutoScroll(); } }
if (autoScroll) startAutoScroll();

// ===== SCROLL REVEAL =====
const revealElements = document.querySelectorAll('.card, .slide, .story-block');
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });
revealElements.forEach(el => observer.observe(el));

// ===== LOGIN MODAL =====
const loginModal = document.getElementById("loginModal");
const closeLogin = document.querySelector(".close-login");
const loginForm = document.getElementById("loginForm");
const welcomeText = document.getElementById("welcomeUser");

function toggleLogin(show) { loginModal.style.display = show ? "flex" : "none"; }
closeLogin.addEventListener("click", () => toggleLogin(false));
window.addEventListener("click", e => { if(e.target === loginModal) toggleLogin(false); });

// ===== LOGIN / REGISTER =====
loginForm.addEventListener("submit", async function(e) {
  e.preventDefault();

  const name = this.querySelector("input[placeholder='Your name']").value;
  const email = this.querySelector("input[placeholder='Your email']").value;

  let passwordInput = this.querySelector("input[type='password']");
  if(!passwordInput) {
    passwordInput = document.createElement("input");
    passwordInput.type = "password";
    passwordInput.placeholder = "Your password";
    passwordInput.required = true;
    this.insertBefore(passwordInput, this.querySelector("button"));
    alert("Enter your password and press Continue again.");
    return;
  }
  const password = passwordInput.value;

  try {
    // Try login first
    const loginResponse = await fetch(WEBAPP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", email, password })
    });
    const loginResult = await loginResponse.json();

    if (loginResult.status === "success") {
      localStorage.setItem("userName", loginResult.user.name);
      localStorage.setItem("userEmail", loginResult.user.email);
      welcomeText.innerText = `Welcome back, ${loginResult.user.name}!`;
      toggleLogin(false);
    } else {
      // If user not found, register
      const regResponse = await fetch(WEBAPP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register", name, email, password })
      });
      const regResult = await regResponse.json();
      if(regResult.status === "success") {
        localStorage.setItem("userName", regResult.user.name);
        localStorage.setItem("userEmail", regResult.user.email);
        welcomeText.innerText = `User registered. Welcome, ${regResult.user.name}!`;
        toggleLogin(false);
      } else {
        alert("Registration failed: " + regResult.message);
      }
    }
  } catch(err) {
    console.error("Login/Register error:", err);
    alert("Cannot connect to Web App. Check deployment and permissions.");
  }
});

// ===== SURVEY FORM =====
const form = document.getElementById("formEncuesta");
const gracias = document.getElementById("gracias");

form.addEventListener("submit", async e => {
  e.preventDefault();

  const afectaciones = Array.from(document.querySelectorAll('input[name="afectacion"]:checked'))
                             .map(cb => cb.value).join(", ");

  const surveyData = {
    action: "survey",
    name: document.getElementById("nombre").value,
    city: document.getElementById("ciudad").value,
    age: document.getElementById("edad").value,
    gender: document.getElementById("genero").value,
    type_of_affectation: afectaciones,
    house_damage: document.getElementById("danos_vivienda").value,
    crop_loss: document.getElementById("perdida_cultivos").value,
    property_loss: document.getElementById("perdida_bienes").value,
    health_affected: document.getElementById("salud_afectada").value,
    experience: document.getElementById("experiencia").value
  };

  try {
    const response = await fetch(WEBAPP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(surveyData)
    });
    const result = await response.json();
    if(result.status === "success") {
      form.reset();
      gracias.style.display = "block";
      setTimeout(() => { gracias.style.display = "none"; }, 5000);
    } else {
      alert("Error sending survey: " + result.message);
    }
  } catch(err) {
    console.error("Error sending survey:", err);
    alert("Error sending survey. Check your Web App deployment.");
  }
});

// ===== LOAD SAVED USER =====
function loadSavedUser() {
  const savedName = localStorage.getItem("userName");
  if(savedName) welcomeText.innerText = `Welcome back, ${savedName}!`;
}
