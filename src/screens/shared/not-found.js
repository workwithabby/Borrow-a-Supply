import { state, homeFor } from '../../state.js';
import { screenEl } from '../../components/ui.js';
import { topbar } from '../../components/topbar.js';
import { starShape } from '../../components/icons.js';
import { btn } from '../../components/button.js';

export default function notFound() {
  const home = state.user ? homeFor(state.user.role) : '/welcome';
  return screenEl(`
    ${topbar({ title: 'Page not found' })}
    <div class="content">
      <div class="empty">
        <span class="bubble lg tint-yellow">${starShape(40)}</span>
        <h2>We could not find that page</h2>
        <p>The link may be old or typed wrong.</p>
        ${btn({ label: 'Go to Home', nav: home, variant: 'secondary' })}
      </div>
    </div>`);
}
