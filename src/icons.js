// Inline SVG icons (sprite: /public/icons.svg). Use iconHtml in strings,
// iconEl when building DOM nodes.

export function iconHtml(id, className = 'icon') {
  return `<svg class="${className}" aria-hidden="true"><use href="/icons.svg#${id}"/></svg>`;
}

export function iconEl(id, className = 'icon') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `/icons.svg#${id}`);
  svg.appendChild(use);
  return svg;
}
