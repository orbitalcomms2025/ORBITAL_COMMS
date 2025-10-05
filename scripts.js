// ===== STICKY HEADER =====
const header = document.querySelector('header');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) header.classList.add('sticky');
  else header.classList.remove('sticky');
});

// ===== BACK TO TOP =====
const backToTop = document.getElementById('backToTop');
if (backToTop) {
  window.addEventListener('scroll', () => {
    backToTop.style.display = window.scrollY > 300 ? 'flex' : 'none';
  });
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ===== CAROUSEL =====
const carousel = document.querySelector('.carousel');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');

let slideWidth = 360;
let autoScroll = true;
let scrollInterval;

function scrollNext() {
  if (carousel && carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth) {
    carousel.scrollTo({ left: 0, behavior: 'smooth' });
  } else if (carousel) {
    carousel.scrollBy({ left: slideWidth, behavior: 'smooth' });
  }
}

if (prevBtn && nextBtn && carousel) {
  nextBtn.addEventListener('click', () => { scrollNext(); resetAutoScroll(); });
  prevBtn.addEventListener('click', () => {
    if (carousel.scrollLeft <= 0) {
      carousel.scrollTo({ left: carousel.scrollWidth, behavior: 'smooth' });
    } else {
      carousel.scrollBy({ left: -slideWidth, behavior: 'smooth' });
    }
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
const loginModal = document.getElementById("login");
const loginLink = document.querySelector('a[href="#login"]');
const closeBtn = document.querySelector(".close-btn");

if (loginLink && loginModal) {
  loginLink.addEventListener("click", (e) => {
    e.preventDefault();
    loginModal.style.display = "flex";
  });
}

if (closeBtn && loginModal) {
  closeBtn.addEventListener("click", () => {
    loginModal.style.display = "none";
  });
}

// Cerrar modal al hacer clic fuera del contenido
window.addEventListener("click", (e) => {
  if (loginModal && e.target === loginModal) {
    loginModal.style.display = "none";
  }
});

// ===== LOGIN FORM =====
const formLogin = document.getElementById("formLogin");
if (formLogin) {
  formLogin.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const pass = document.getElementById("loginPassword").value.trim();
    const msg = document.getElementById("loginMsg");

    if (email === "admin@orbital.com" && pass === "1234") {
      msg.style.color = "#00FFEA";
      msg.innerText = "✅ Bienvenido, acceso permitido.";
    } else {
      msg.style.color = "red";
      msg.innerText = "❌ Usuario o contraseña incorrectos.";
    }
  });
}
// === MENÚ HAMBURGUESA RESPONSIVO ===
document.addEventListener("DOMContentLoaded", () => {
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      navLinks.classList.toggle("show");
      navToggle.classList.toggle("open");
    });
  }
});
