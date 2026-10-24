import { iconBtn } from './button.js';
import { icon } from './icons.js';
import { esc } from './ui.js';
import logo from '../assets/logo.png';

// App bar. Root screens show the app brand and the menu button; detail screens
// show the back button and the page title, since context matters there.
// The h1 is focused after every page change, so screen readers announce the page.
export function topbar({ title, back = true, actions = '' }) {
  if (back) {
    return `
  <header class="topbar">
    ${iconBtn({ ic: 'back', label: 'Go back', back: true, plain: true })}
    <h1 tabindex="-1">${esc(title)}</h1>
    <div class="actions">${actions}</div>
  </header>`;
  }
  return `
  <header class="topbar">
    <button type="button" class="icon-btn plain" aria-label="Open menu" data-menu>${icon('menu', 22)}</button>
    <div class="topbar-brand grow">
      <img src="${logo}" alt="" class="brand-mark" />
      <span class="brand-wordmark">Borrow-a-Supply</span>
    </div>
    <h1 class="sr-only">${esc(title)}</h1>
    <div class="actions">${actions}</div>
  </header>`;
}
