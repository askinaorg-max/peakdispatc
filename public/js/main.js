// =====================
// NAVIGATION LOGIC
// =====================
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
    const delay = 220;

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


  // Section content reveal animations
  const revealEls = document.querySelectorAll('.pd-reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add('in-view');
      });
    }, { threshold: 0.12 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in-view'));
  }

  showSection('about');
});

// =====================
// LIVE DISPATCH DATA
// =====================
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

  updateSnapshot();
  setInterval(updateSnapshot, 64800000);

  let isDay = false;
  function toggleDayNight() {
    document.body.classList.toggle("day-mode", isDay);
    isDay = !isDay;
  }

  setInterval(toggleDayNight, 43200000);
});

// =====================
// DAILY DRIVER DATA
// =====================
const dailyData = {
  van: [
    { name: "John Peterson", miles: "742", rpm: "2.13", route: "Chicago, IL → Dallas, TX" },
    { name: "Michael Torres", miles: "815", rpm: "2.25", route: "Atlanta, GA → Columbus, OH" },
    { name: "Bradley Cooper", miles: "690", rpm: "2.05", route: "Kansas City, MO → Denver, CO" }
  ],
  reefer: [
    { name: "Victor Sanchez", miles: "980", rpm: "2.65", route: "Miami, FL → Cincinnati, OH" },
    { name: "Leonard White", miles: "1024", rpm: "2.72", route: "Houston, TX → Nashville, TN" },
    { name: "Jorge Martinez", miles: "890", rpm: "2.51", route: "Tampa, FL → Charlotte, NC" }
  ],
  flatbed: [
    { name: "Anthony Reed", miles: "620", rpm: "3.45", route: "Denver, CO → Phoenix, AZ" },
    { name: "Samuel Hayes", miles: "710", rpm: "3.22", route: "Boise, ID → Reno, NV" },
    { name: "Robert King", miles: "655", rpm: "3.18", route: "Omaha, NE → Sioux Falls, SD" }
  ]
};

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

document.getElementById("dailyDate").textContent = "— " + formatDate(new Date());

const dayIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000)) % 3;

const categories = document.querySelectorAll(".category");

categories[0].querySelector("p:nth-child(2)").innerHTML = `<b>Name:</b> ${dailyData.van[dayIndex].name}`;
categories[0].querySelector("p:nth-child(3)").innerHTML = `<b>Miles:</b> ${dailyData.van[dayIndex].miles} mi`;
categories[0].querySelector("p:nth-child(4)").innerHTML = `<b>RPM:</b> ${dailyData.van[dayIndex].rpm}`;
categories[0].querySelector("p:nth-child(5)").innerHTML = `<b>Route:</b> ${dailyData.van[dayIndex].route}`;

categories[1].querySelector("p:nth-child(2)").innerHTML = `<b>Name:</b> ${dailyData.reefer[dayIndex].name}`;
categories[1].querySelector("p:nth-child(3)").innerHTML = `<b>Miles:</b> ${dailyData.reefer[dayIndex].miles} mi`;
categories[1].querySelector("p:nth-child(4)").innerHTML = `<b>RPM:</b> ${dailyData.reefer[dayIndex].rpm}`;
categories[1].querySelector("p:nth-child(5)").innerHTML = `<b>Route:</b> ${dailyData.reefer[dayIndex].route}`;

categories[2].querySelector("p:nth-child(2)").innerHTML = `<b>Name:</b> ${dailyData.flatbed[dayIndex].name}`;
categories[2].querySelector("p:nth-child(3)").innerHTML = `<b>Miles:</b> ${dailyData.flatbed[dayIndex].miles} mi`;
categories[2].querySelector("p:nth-child(4)").innerHTML = `<b>RPM:</b> ${dailyData.flatbed[dayIndex].rpm}`;
categories[2].querySelector("p:nth-child(5)").innerHTML = `<b>Route:</b> ${dailyData.flatbed[dayIndex].route}`;

// =====================
// POPUP LOGIC (FIXED)
// =====================
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("joinModal");
  const closeBtn = document.getElementById("joinClose");

  // ALL BUTTONS WITH data-open="join" except "Get Free Strategy Call"
  document.querySelectorAll("[data-open='join']").forEach(btn => {
    if (btn.textContent.trim() !== "Get Free Strategy Call") {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        modal.classList.add("show");
      });
    }
  });

  closeBtn.addEventListener("click", () => {
    modal.classList.remove("show");
  });

  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("show");
  });

  document.querySelectorAll(".join-apply").forEach(btn => {
    btn.addEventListener("click", () => {
      window.location.href = "/join";
    });
  });
});
document.addEventListener("DOMContentLoaded", () => {
  const phoneModal = document.getElementById("phoneModal");
  const closeBtn = document.getElementById("phoneClose");
  const submitBtn = document.getElementById("phoneSubmit");
  const continueLink = document.getElementById("continueSite");
  const phoneInput = document.getElementById("phoneInput");

  // OPEN ON PAGE LOAD
  setTimeout(() => {
    phoneModal.classList.add("show");
  }, 600);

  // CLOSE MODAL
  function closePhoneModal() {
    phoneModal.classList.remove("show");
  }

  closeBtn.addEventListener("click", closePhoneModal);
  continueLink.addEventListener("click", closePhoneModal);

  // SUBMIT PHONE NUMBER
  submitBtn.addEventListener("click", async () => {
    const number = phoneInput.value.trim();

    if (!number) {
      alert("Please enter a valid phone number.");
      return;
    }

    // SEND PHONE NUMBER TO BACKEND
    try {
      await fetch("/api/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number })
      });

      alert("Thank you! We will contact you shortly.");
      closePhoneModal();

    } catch (e) {
      alert("Error sending number. Please try again.");
    }
  });
});


// =====================
// TOP DAILY COMMENTS
// =====================
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('commentsModal');
  const listEl = document.getElementById('commentsList');
  const form = document.getElementById('commentForm');
  const statusEl = document.getElementById('commentStatus');
  const driverIdInput = document.getElementById('commentDriverId');
  const titleEl = document.getElementById('commentsTitle');

  function openModal() {
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    if (statusEl) statusEl.textContent = '';
  }

  async function loadComments(driverId) {
    if (!listEl) return;
    listEl.innerHTML = '<div style="opacity:0.85;">Loading…</div>';

    try {
      const res = await fetch(`/api/comments?driverId=${encodeURIComponent(driverId)}`);
      const data = await res.json();
      if (!data.ok) throw new Error('Failed');

      if (!data.comments || data.comments.length === 0) {
        listEl.innerHTML = '<div style="opacity:0.85;">No comments yet.</div>';
        return;
      }

      listEl.innerHTML = data.comments.map(c => {
        const when = new Date(c.createdAt).toLocaleString();
        const stars = '★'.repeat(Math.max(1, Math.min(9, Number(c.rating) || 1)));
        return `
          <div class="comment-item">
            <div class="comment-head">
              <div class="comment-name">${escapeHtml(c.name || 'Anonymous')}</div>
              <div class="comment-rating">${stars}</div>
            </div>
            <div class="comment-text">${escapeHtml(c.text || '')}</div>
            <div class="comment-when">${when}</div>
          </div>
        `;
      }).join('');
    } catch (e) {
      listEl.innerHTML = '<div style="opacity:0.85;">Could not load comments.</div>';
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  document.querySelectorAll('.js-open-comments, .js-open-comment-form').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const card = e.target.closest('[data-driver-id]');
      const driverId = card ? card.getAttribute('data-driver-id') : '';
      if (!driverId) return;

      if (driverIdInput) driverIdInput.value = driverId;
      if (titleEl) titleEl.textContent = 'Comments';
      openModal();
      await loadComments(driverId);

      // scroll to form if button is "leave"
      if (e.target.classList.contains('js-open-comment-form')) {
        form && form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  if (modal) {
    modal.querySelectorAll('[data-close-modal]').forEach(el => el.addEventListener('click', closeModal));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!statusEl) return;

      statusEl.textContent = 'Sending…';

      const fd = new FormData(form);
      const payload = Object.fromEntries(fd.entries());

      try {
        const res = await fetch('/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!data.ok) throw new Error('failed');

        statusEl.textContent = 'Submitted! Waiting for approval.';
        form.reset();
        // keep driver id
        if (driverIdInput) driverIdInput.value = payload.driverId;
      } catch (err) {
        statusEl.textContent = 'Failed. Please try again.';
      }
    });
  }
});


// =====================
// TOP DAILY HISTORY (LAST 15 DAYS)
// =====================
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('historyModal');
  const titleEl = document.getElementById('historyTitle');
  const subtitleEl = document.getElementById('historySubtitle');
  const listEl = document.getElementById('historyList');

  if (!modal || !titleEl || !listEl) return;

  const closeModal = () => {
    modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
  };

  const openModal = () => {
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
  };

  // global close handlers (same pattern as other modals)
  modal.addEventListener('click', (e) => {
    if (e.target.matches('[data-close-modal]')) closeModal();
  });
  window.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('hidden') && e.key === 'Escape') closeModal();
  });

  async function loadHistory(type) {
    titleEl.textContent = `📅 ${type} — Driver History`;
    subtitleEl.textContent = 'Last 15 days';
    listEl.innerHTML = '<div class="muted">Loading…</div>';

    try {
      const res = await fetch(`/api/topdaily-history?type=${encodeURIComponent(type)}`);
      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        listEl.innerHTML = '<div class="muted">No history yet. Check back tomorrow.</div>';
        return;
      }

      listEl.innerHTML = data.map(item => {
        const date = item.dateLabel || item.date || '';
        const name = item.driverName || '—';
        const route = item.route ? `Route: ${item.route}` : '';
        const miles = (typeof item.miles === 'number') ? `${item.miles} mi` : '';
        const rpm = (typeof item.rpm === 'number') ? `RPM: ${item.rpm}` : '';
        const meta = [route, miles, rpm].filter(Boolean).join(' • ');

        return `
          <div class="history-item">
            <div class="history-left">
              <div class="history-date">${date}</div>
              <div class="history-name">👤 ${name}</div>
              ${meta ? `<div class="history-meta">${meta}</div>` : ''}
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error(err);
      listEl.innerHTML = '<div class="muted">Failed to load history.</div>';
    }
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.js-open-history');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    const type = btn.getAttribute('data-type') || btn.dataset.type;
    if (!type) return;

    loadHistory(type);
    openModal();
  });
});
