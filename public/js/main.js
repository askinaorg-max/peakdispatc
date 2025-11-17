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
    const delay = 100 + Math.random() * 900;

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

  alert("Fill the full form");

  // Close popup
  closePhoneModal();

  // Redirect to form page
  window.location.href = "/join";

} catch (e) {
  alert("Will be redirect to fill a full form");
}

  });
});
// =====================
// LAST 15 DAYS DATA FOR POPUP
// =====================
const last15DaysData = {
  van: [
    { date: "2025-11-15", driver: "John Peterson", miles: 742, rpm: 2.13 },
    { date: "2025-11-14", driver: "Michael Torres", miles: 815, rpm: 2.25 },
    { date: "2025-11-13", driver: "Bradley Cooper", miles: 690, rpm: 2.05 },
    { date: "2025-11-12", driver: "Gary Wilson", miles: 701, rpm: 2.18 },
    { date: "2025-11-11", driver: "Tom Harris", miles: 663, rpm: 2.09 }
  ],
  reefer: [
    { date: "2025-11-15", driver: "Victor Sanchez", miles: 980, rpm: 2.65 },
    { date: "2025-11-14", driver: "Leonard White", miles: 1024, rpm: 2.72 },
    { date: "2025-11-13", driver: "Jorge Martinez", miles: 890, rpm: 2.51 },
    { date: "2025-11-12", driver: "Carlos Ramirez", miles: 910, rpm: 2.59 },
    { date: "2025-11-11", driver: "James Howard", miles: 867, rpm: 2.47 }
  ],
  flatbed: [
    { date: "2025-11-15", driver: "Anthony Reed", miles: 620, rpm: 3.45 },
    { date: "2025-11-14", driver: "Samuel Hayes", miles: 710, rpm: 3.22 },
    { date: "2025-11-13", driver: "Robert King", miles: 655, rpm: 3.18 },
    { date: "2025-11-12", driver: "Peter Collins", miles: 700, rpm: 3.30 },
    { date: "2025-11-11", driver: "Mark Johnson", miles: 640, rpm: 3.12 }
  ]
};
// =====================
// DAILY MODAL LOGIC
// =====================
document.addEventListener("DOMContentLoaded", () => {
  const dailyModal = document.getElementById("dailyModal");
  const dailyClose = document.getElementById("dailyClose");
  const dailyTitle = document.getElementById("dailyModalTitle");
  const dailyList = document.getElementById("dailyModalList");
  const dailyApply = document.getElementById("dailyApply");
  const dailyViewPay = document.getElementById("dailyViewPay");
  let currentType = null;

  const titles = {
    van: "Van — last 15 days",
    reefer: "Reefer — last 15 days",
    flatbed: "Flatbed — last 15 days"
  };

  document.querySelectorAll(".daily-category").forEach(card => {
    card.addEventListener("click", () => {
      const type = card.getAttribute("data-type");
      currentType = type;

      const data = last15DaysData[type] || [];
      let html = "";

      data.forEach(row => {
        html += `
          <div class="daily-list-item">
            <strong>${row.date}</strong>
            <div>Driver: ${row.driver}</div>
            <div>Miles: ${row.miles} mi</div>
            <div>Rate: $${row.rpm}/mi</div>
          </div>`;
      });

      dailyTitle.textContent = titles[type];
      dailyList.innerHTML = html;
      dailyModal.classList.add("show");
    });
  });

  dailyClose.addEventListener("click", () => dailyModal.classList.remove("show"));

  window.addEventListener("click", e => {
    if (e.target === dailyModal) dailyModal.classList.remove("show");
  });

  dailyApply.addEventListener("click", () => {
    window.location.href = "/join";
  });

  // ✅ FIX: View driver check pay PDF open
  dailyViewPay.addEventListener("click", () => {
    if (!currentType) return;

    let pdfPath = `/documents/${currentType}.pdf`;
    window.open(pdfPath, "_blank");
  });
});


  // Apply → форма за податоци
  dailyApply.addEventListener("click", () => {
    window.location.href = "/join";
  });

// CLICK ON "see more details..."
document.querySelectorAll(".daily-link").forEach(link => {
  link.addEventListener("click", () => {
    const type = link.getAttribute("data-type");
    const data = last15DaysData[type] || [];

    dailyTitle.textContent = titles[type] || "Last 15 days";

    let html = "";

    data.forEach(row => {
      html += `
        <div class="daily-list-item">
          <strong>${row.date}</strong>
          <div>Driver: ${row.driver}</div>
          <div>Miles: ${row.miles} mi</div>
          <div>Rate: $${row.rpm}/mi</div>
        </div>
      `;
    });

    if (!html) html = "<p>No data for the last 15 days.</p>";

    dailyList.innerHTML = html;
    dailyModal.classList.add("show");
  });
});

