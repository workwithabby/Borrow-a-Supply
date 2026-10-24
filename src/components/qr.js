import QRCode from 'qrcode';
import { esc } from './ui.js';

// Draws a QR code as inline SVG using the palette (Deep Indigo on white).
export async function qrSvg(text) {
  return QRCode.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#35257D', light: '#FFFFFF' } });
}

// Fills `el` with a QR image and a text alternative for screen readers.
export async function renderQr(el, code) {
  try {
    el.innerHTML = await qrSvg(code);
    const svg = el.querySelector('svg');
    if (svg) {
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', `QR code for reservation ${code}`);
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.style.width = '100%';
      svg.style.height = 'auto';
    }
  } catch (e) {
    el.innerHTML = `<p class="sub">QR could not be drawn. Use code ${esc(code)}.</p>`;
  }
}
