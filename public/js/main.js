document.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById('section-loader');
  const sections = document.querySelectorAll('.dynamic-section');
  const navLinks = document.querySelectorAll('[data-section-link]');
  const navToggle = document.getElementById('navToggle');
  const navMobile = document.getElementById('navMobile');

  function closeMobileNav() {
    if (navMobile) {
      navMobile.classList.remove('open');
    }
  }

  function setActiveLink(target) {
    navLinks.forEach((link) => {
      if (link.getAttribute('data-section-link') === target) {
        link.classList.add('nav-link-active');
      } else {
        link.classList.remove('nav-link-active');
      }
    });
  }

  function showSection(target) {
    if (!target) return;
    const delay = 100 + Math.random() * 900; // 0.1–1 секунда

    if (loader) {
      loader.classList.remove('hidden');
      loader.classList.add('visible');
    }

    setTimeout(() => {
      sections.forEach((section) => {
        if (section.getAttribute('data-section') === target) {
          section.classList.add('section-active');
        } else {
          section.classList.remove('section-active');
        }
      });

      setActiveLink(target);

      if (loader) {
        loader.classList.remove('visible');
        loader.classList.add('hidden');
      }
    }, delay);
  }

  navLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = link.getAttribute('data-section-link');
      if (target && document.querySelector('[data-section="' + target + '"]')) {
        event.preventDefault();
        closeMobileNav();
        showSection(target);
      }
    });
  });

  if (navToggle && navMobile) {
    navToggle.addEventListener('click', () => {
      navMobile.classList.toggle('open');
    });
  }

  // Default секција
  showSection('about');
});
// ====== Live Dispatch Animation and Data Logic ======
document.addEventListener("DOMContentLoaded", () => {
  const loadsEl = document.getElementById("loadsToday");
  const laneEl = document.getElementById("bestLane");
  const rpmEl = document.getElementById("avgRpm");

  if (!loadsEl) return;

  const lanes = [
    ["Chicago", "Dallas"],
    ["Atlanta", "Miami"],
    ["Los Angeles", "Phoenix"],
    ["New York", "Cleveland"],
    ["Houston", "Kansas City"],
    ["Denver", "Seattle"],
    ["Memphis", "Orlando"],
    ["St. Louis", "Detroit"],
    ["Nashville", "Columbus"],
    ["Charlotte", "Baltimore"]
  ];

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomFloat(min, max, decimals = 2) {
    const val = Math.random() * (max - min) + min;
    return val.toFixed(decimals);
  }

  function updateSnapshot() {
    const loads = randomInt(30, 46);
    const [from, to] = lanes[Math.floor(Math.random() * lanes.length)];
    const rpm = randomFloat(2.93, 4.19);

    loadsEl.textContent = loads;
    laneEl.textContent = `${from} → ${to}`;
    rpmEl.textContent = `$${rpm}`;
  }

  // иницијално
  updateSnapshot();

  // ажурирање на секои 18 часа (64800000 ms)
  setInterval(updateSnapshot, 64800000);

  // Ден/ноќ режим на секои 12 часа
  let isDay = false;
  function toggleDayNight() {
    document.body.classList.toggle("day-mode", isDay);
    isDay = !isDay;
  }

  // на секои 12 часа
  setInterval(toggleDayNight, 43200000);
});
document.addEventListener('DOMContentLoaded', ()=>{
  let isDay = false;
  setInterval(()=>{
    document.body.classList.toggle('day-mode', isDay);
    isDay = !isDay;
  }, 12*60*60*1000); // 12h
});
function calcROI(){
  const t = parseInt(document.getElementById('trucks').value || "1",10);
  // конзервативна пресметка: $1,200+/truck месечно
  const res = (t * 1200).toLocaleString();
  document.getElementById('roiResult').textContent = `Estimated monthly profit increase: $${res}+`;
}
