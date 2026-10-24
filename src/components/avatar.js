import { esc } from './ui.js';

export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

// Profile photo when there is one, otherwise the initials.
export function avatar(user, cls = '') {
  const c = `avatar ${cls}`.trim();
  if (user?.avatar) return `<span class="${c} has-photo" aria-hidden="true"><img src="${esc(user.avatar)}" alt="" /></span>`;
  return `<span class="${c}" aria-hidden="true">${esc(initials(user?.full_name))}</span>`;
}
