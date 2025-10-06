const API = "https://local-data.onrender.com";

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
  if (window.scrollY > 50) header.classList.add('sticky');
  else header.classList.remove('sticky');
});

// ===== BACK TO TOP =====
const backToTop = document.getElementById('backToTop');
window.addEventListener('scroll', () => {
  backToTop.style.display = window.scrollY > 300 ? 'block' : 'none';
});
backToTop.addEventListener('click', () => { window.scrollTo({ top:0, behavior:'smooth' }); });

// ===== CAROUSEL =====
const carousel = document.querySelector('.carousel');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
let slideWidth = 360;
let autoScroll = true;
let scrollInterval;

function scrollNext() {
  if(carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth) {
    carousel.scrollTo({ left:0, behavior:'smooth' });
  } else {
    carousel.scrollBy({ left: slideWidth, behavior:'smooth' });
  }
}
if(prevBtn && nextBtn && carousel) {
  nextBtn.addEventListener('click', () => { scrollNext(); resetAutoScroll(); });
  prevBtn.addEventListener('click', () => {
    if(carousel.scrollLeft <= 0) carousel.scrollTo({ left: carousel.scrollWidth, behavior:'smooth' });
    else carousel.scrollBy({ left:-slideWidth, behavior:'smooth' });
    resetAutoScroll();
  });
}
function startAutoScroll() { scrollInterval = setInterval(scrollNext, 2000); }
function resetAutoScroll() { if(autoScroll) { clearInterval(scrollInterval); startAutoScroll(); } }
if(autoScroll) startAutoScroll();

// ===== SCROLL REVEAL =====
const revealElements = document.querySelectorAll('.card, .slide, .story-block');
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if(entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });
revealElements.forEach(el => observer.observe(el));

// ===== LOGIN MODAL & SURVEY =====
const openLogin = document.getElementById('openLogin');
const loginModal = document.getElementById('loginModal');
const closeLogin = document.getElementById('closeLogin');
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const toggleForm = document.getElementById("toggleForm");
const message = document.getElementById("message");
const surveyContainer = document.getElementById("surveyContainer");
const surveyForm = document.getElementById("surveyForm");
const surveyMessage = document.getElementById("surveyMessage");
let currentUserEmail = null;

// ===== STAR MODE FOR START BUTTON =====
openLogin.addEventListener('click', e => {
  e.preventDefault();
  document.body.classList.add('star-mode'); // aplica el estilo Star Mode
  loginModal.style.display = 'flex';
});

// Cerrar modal y quitar Star Mode si está activo
closeLogin.addEventListener('click', () => {
  loginModal.style.display = 'none';
  document.body.classList.remove('star-mode');
});

window.addEventListener('click', e => {
  if (e.target === loginModal) {
    loginModal.style.display = 'none';
    document.body.classList.remove('star-mode');
  }
});

// ===== TOGGLE LOGIN / REGISTER =====
toggleForm.addEventListener("click", () => {
  loginForm.style.display = loginForm.style.display === "none" ? "block" : "none";
  registerForm.style.display = registerForm.style.display === "none" ? "block" : "none";
  message.textContent = "";
});

// ===== LOGIN =====
loginForm.addEventListener("submit", async e => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  try {
    const res = await fetch(`${API}/login`, { 
      method:"POST", 
      headers:{"Content-Type":"application/json"}, 
      body:JSON.stringify({email,password}) 
    });
    const data = await res.json();
    message.textContent = data.message || "Error logging in";
    message.style.color = res.ok ? "#00ff88" : "#ff5555";
    if(res.ok){ 
      currentUserEmail = email; 
      loginModal.style.display='none'; 
      document.body.classList.remove('star-mode'); 
      surveyContainer.style.display='block'; 
      autofillSurvey(email); 
    }
  } catch(err){ 
    message.textContent="❌ Cannot connect to server"; 
    message.style.color="#ff5555"; 
  }
});

// ===== REGISTER =====
registerForm.addEventListener("submit", async e => {
  e.preventDefault();
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value.trim();
  try {
    const res = await fetch(`${API}/register`, { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ name, email, password }) 
    });
    const data = await res.json();

    if (res.ok) {
      message.textContent = " Registro completado correctamente";
      message.style.color = "#00ff88";
      setTimeout(() => {
        currentUserEmail = email;
        loginModal.style.display = 'none';
        document.body.classList.remove('star-mode');
        surveyContainer.style.display = 'block';
        autofillSurvey(email);
      }, 1500);
    } else {
      message.textContent = data.message || " Error registrando usuario";
      message.style.color = "#ff5555";
    }
  } catch (err) {
    message.textContent = "No se puede conectar con el servidor";
    message.style.color = "#ff5555";
  }
});

// ===== AUTOFILL SURVEY =====
async function autofillSurvey(email){
  try {
    const res = await fetch(`${API}/survey/${email}`);
    if(!res.ok) return;
    const data = await res.json();
    document.getElementById("surveyName").value = data.name || '';
    document.getElementById("surveyEmail").value = data.email || '';
  } catch(err){ console.error(err); }
}

// ===== SUBMIT SURVEY =====
surveyForm.addEventListener("submit", async e => {
  e.preventDefault();
  const payload = {
    name: document.getElementById("surveyName").value.trim(),
    email: document.getElementById("surveyEmail").value.trim(),
    city: document.getElementById("city").value.trim(),
    age: parseInt(document.getElementById("age").value.trim()) || null,
    gender: document.getElementById("gender").value,
    type_of_impact: document.getElementById("type_of_impact").value.trim(),
    damage_to_housing: document.getElementById("damage_to_housing").value.trim(),
    loss_of_crops: document.getElementById("loss_of_crops").value.trim(),
    loss_of_property: document.getElementById("loss_of_property").value.trim(),
    health_affected: document.getElementById("health_affected").value.trim(),
    experience: document.getElementById("experience").value.trim()
  };
  try {
    const res = await fetch(`${API}/survey`, { 
      method:"POST", 
      headers:{"Content-Type":"application/json"}, 
      body:JSON.stringify(payload) 
    });
    const data = await res.json();
    surveyMessage.textContent = data.message || "Error submitting survey";
    surveyMessage.style.color = res.ok ? "#00ff88" : "#ff5555";
    if(res.ok) surveyForm.reset();
    autofillSurvey(currentUserEmail);
  } catch(err){ 
    surveyMessage.textContent="❌ Cannot connect to server"; 
    surveyMessage.style.color="#ff5555"; 
  }
});
