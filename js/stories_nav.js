// ================= APPEAR ANIMATION =================
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.story-block').forEach(el => el.classList.add('visible'));
});

// ================= STORY NAVIGATION =================
const stories = [
  "../story1.html",
  "../story2.html",
  "../story3.html",
  "../story4.html",
  "../story5.html",
  "../story6.html"
];

const currentUrl = window.location.pathname.split("/").pop();
let currentIndex = stories.findIndex(story => story === currentUrl);

const prevBtn = document.getElementById('prevStory');
const nextBtn = document.getElementById('nextStory');

prevBtn.addEventListener('click', () => {
  if(currentIndex > 0){
    window.location.href = stories[currentIndex - 1];
  } else {
    alert("This is the first story!");
  }
});

nextBtn.addEventListener('click', () => {
  if(currentIndex < stories.length - 1){
    window.location.href = stories[currentIndex + 1];
  } else {
    alert("This is the last story!");
  }
});
