// NAV scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// Mobile menu
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
  hamburger.classList.toggle('open'); // hamburger → X animation
});
mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    hamburger.classList.remove('open');
  });
});

// Reveal on scroll
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
reveals.forEach(el => observer.observe(el));

// Role cycling
const roles = document.querySelectorAll('.role-item');
let current = 0;
setInterval(() => {
  roles[current].classList.remove('active');
  current = (current + 1) % roles.length;
  roles[current].classList.add('active');
}, 2500);

// Smooth scroll for nav links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Stagger project cards on reveal
const projectCards = document.querySelectorAll('.project-card');
projectCards.forEach((card, i) => {
  const col = i % 3;
  card.style.transitionDelay = `${col * 0.1}s`;
});

// ── ENHANCEMENT 1: Active nav link highlight on scroll ───────────────────────
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');
const mobileLinks = document.querySelectorAll('.mobile-menu a');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
      });
      mobileLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
      });
    }
  });
}, {
  threshold: 0.3,
  rootMargin: '-80px 0px -50% 0px'
});

sections.forEach(section => sectionObserver.observe(section));

// ── ENHANCEMENT 2: Stat counter animation ───────────────────────────────────
const statNums = document.querySelectorAll('.stat-num');
const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const text = el.textContent.trim();
      const match = text.match(/^(\d+)(.*)$/);
      if (!match) return;

      const target = parseInt(match[1], 10);
      const suffix = match[2];
      const duration = 1500;
      const startTime = performance.now();

      function animate(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(eased * target);
        el.textContent = current + suffix;
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      }

      requestAnimationFrame(animate);
      statsObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

statNums.forEach(el => statsObserver.observe(el));

// ── ENHANCEMENT 3: Hero grid parallax on mouse move ─────────────────────────
const gridBg = document.querySelector('.grid-bg');
if (gridBg) {
  document.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    gridBg.style.transform = `translate(${x}px, ${y}px)`;
  });
}

// ── ENHANCEMENT 4: Terminal typing effect ────────────────────────────────────
const terminalBody = document.querySelector('.terminal-body');
if (terminalBody) {
  const lines = terminalBody.querySelectorAll('p');
  const originalContent = [];

  lines.forEach((line, i) => {
    originalContent.push(line.innerHTML);
    if (i > 0) line.style.display = 'none';
  });

  const terminalObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        terminalObserver.disconnect();
        typeTerminal(lines, originalContent);
      }
    });
  }, { threshold: 0.5 });

  terminalObserver.observe(terminalBody);
}

function typeTerminal(lines, contents) {
  let lineIndex = 1;
  const delay = 30;
  const lineDelay = 100;

  function showNextLine() {
    if (lineIndex >= lines.length) return;

    const line = lines[lineIndex];
    const content = contents[lineIndex];
    line.style.display = '';

    const textContent = line.textContent || '';
    line.innerHTML = '';
    let charIndex = 0;

    function typeChar() {
      if (charIndex <= textContent.length) {
        line.textContent = textContent.substring(0, charIndex);
        charIndex++;
        setTimeout(typeChar, delay);
      } else {
        line.innerHTML = content;
        lineIndex++;
        setTimeout(showNextLine, lineDelay);
      }
    }

    typeChar();
  }

  showNextLine();
}
