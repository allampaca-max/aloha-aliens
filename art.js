/* Generated pixel-art assets. Exact generation prompts: assets/pixel/PROMPTS.md. */
(function () {
  'use strict';
  const VERSION = 'pixel-1';
  const BASE = './assets/pixel/';
  const characters = new Set(['girl', 'alpaca', 'centipede', 'roach']);
  const cards = new Set(['sunscreen', 'spray', 'alpaca', 'tea', 'rainbow']);
  function asset(name, className, priority = 'auto') {
    return `<img class="${className}" src="${BASE}${name}.png?v=${VERSION}" alt="" aria-hidden="true" draggable="false" decoding="async" fetchpriority="${priority}">`;
  }
  // Small UI icons use a 16px grid; no fonts or image downloads are needed.
  const icons = {
    heart: 'M2 3h4v2h4V3h4v2h2v5h-2v2h-2v2h-2v2H6v-2H4v-2H2v-2H0V5h2Z',
    shield: 'M6 1h4v1h4v1h2v6h-2v3h-2v2h-2v1H6v-1H4v-2H2V9H0V3h2V2h4Zm0 3H3v5h2v3h2v1h2v-1h2V9h2V4h-3V3H6Z',
    attack: 'M12 0h4v4h-2v2h-2v2h-2v2H8v2H6v2H4v2H1v-3h2v-2H1V9h2v2h2v-1h1V8h2V6h2V4h2Z',
    leaf: 'M8 1h7v7h-1v3h-2v2H9v1H5v-2H3V9H2V7h1V5h2V3h3ZM1 13h2v-2h2V9h2V7h2V5h2V3h2v2h-2v2H9v2H7v2H5v2H3v2H1Z',
    sound: 'M1 6h3V4h2V2h3v12H6v-2H4v-2H1Zm10-2h2v2h1v4h-1v2h-2v-2h1V6h-1Zm3-3h1v2h1v10h-1v2h-1v-2h1V3h-1Z',
    mute: 'M1 6h3V4h2V2h3v12H6v-2H4v-2H1Zm10-1h2v2h2V5h2v2h-2v2h2v2h-2V9h-2v2h-2V9h2V7h-2Z'
  };
  window.AlohaArt = {
    landscape: asset('manoa-background', 'pixel-landscape', 'high'),
    character: key => characters.has(key) ? asset(key, 'pixel-sprite') : '',
    card: key => cards.has(key) ? asset('card-' + key, 'pixel-card-art') : '',
    icon: key => `<svg viewBox="0 0 16 16" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true"><path d="${icons[key] || icons.leaf}" fill-rule="evenodd"/></svg>`
  };
})();
