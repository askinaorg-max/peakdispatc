document.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById('section-loader');
  const sections = document.querySelectorAll('.dynamic-section');
  const navLinks = document.querySelectorAll('[data-section-link]');

  function setActiveLink(target) {
    navLinks.forEach(link => {
      if (link.getAttribute('data-section-link') === target) {
        link.classList.add('nav-link-active');
      } else {
        link.classList.remove('nav-link-active');
      }
    });
  }

  function showSection(target) {
    if (!target) return;
    // Random delay between 0.1s and 1s
    const delay = 100 + Math.random() * 900;

    if (loader) {
      loader.classList.remove('hidden');
      loader.classList.add('visible');
    }

    setTimeout(() => {
      sections.forEach(section => {
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

  navLinks.forEach(link => {
    link.addEventListener('click', (event) => {
      const target = link.getAttribute('data-section-link');
      if (target && document.querySelector('[data-section="' + target + '"]')) {
        event.preventDefault();
        showSection(target);
      }
    });
  });

  // Initialize default section
  showSection('about');
});
