// Shared UI: theme toggle, scroll reveal (site-wide), count-up stats.
// The initial theme is set by the inline snippet in each page's <head>.

// ---------- Vercel Web Analytics ----------
import { inject } from '@vercel/analytics';
inject();

// ---------- Vercel Speed Insights ----------
import { injectSpeedInsights } from '@vercel/speed-insights';
injectSpeedInsights();

// ---------- theme: locked to dark ----------
document.documentElement.dataset.theme = 'dark';

// ---------- scroll reveal (site-wide) ----------
// Les éléments apparaissent en fondu quand on scrolle jusqu'à eux.
// S'applique aux .reveal explicites + aux cartes générées dynamiquement.
const AUTO_REVEAL = '.res-group, .news-item, .reach-card, .submit-card, .disclaimer, .result-card, .rank-card, .feature-card, .step';

const io = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      } else if (entry.boundingClientRect.top > 0) {
        // l'élément est repassé sous le viewport : on ré-arme l'animation
        // pour qu'elle rejoue au prochain scroll vers le bas
        entry.target.classList.remove('visible');
      }
    }
  },
  { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
);

function watch(el) {
  if (el.dataset.revealWatched) return;
  el.dataset.revealWatched = '1';
  el.classList.add('reveal');
  io.observe(el);
}

document.querySelectorAll('.reveal').forEach(watch);
document.querySelectorAll(AUTO_REVEAL).forEach(watch);

// Les listes (ressources, actualités, places) sont re-rendues par les filtres :
// on observe le DOM pour révéler aussi les cartes ajoutées après coup.
const mo = new MutationObserver((mutations) => {
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node.nodeType !== 1) continue;
      if (node.matches && node.matches(AUTO_REVEAL)) watch(node);
      if (node.querySelectorAll) node.querySelectorAll(AUTO_REVEAL).forEach(watch);
    }
  }
});
mo.observe(document.body, { childList: true, subtree: true });

// ---------- count-up numbers ----------
function countUp(el) {
  const target = parseInt(el.dataset.count, 10);
  if (!Number.isFinite(target)) return;
  const duration = 1200;
  const start = performance.now();

  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
    el.textContent = Math.round(eased * target);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const countEls = document.querySelectorAll('[data-count]');

const ioCount = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        countUp(entry.target);
        ioCount.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.5 }
);
countEls.forEach((el) => ioCount.observe(el));
