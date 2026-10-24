import gsap from 'gsap';
import logo from '../../assets/logo.png';
import { navigate, onLeave } from '../../router.js';
import { state, homeFor } from '../../state.js';
import { screenEl, reduceMotion } from '../../components/ui.js';
import { caseStars } from '../../components/card.js';

// Logo fades in with a small bounce on a deep-indigo stage, then we move on after about 1.5 seconds.
export default function splash() {
  const el = screenEl(`
    <div class="splash">
      ${caseStars()}
      <h1 class="sr-only" tabindex="-1">Borrow-a-Supply</h1>
      <img class="splash-logo" src="${logo}" alt="Borrow-a-Supply logo: a pink cup with a ruler, pencil, pen and scissors" width="200" height="200" />
      <p class="splash-word">Borrow-a-Supply</p>
      <p class="splash-tag">Borrow what you need. Return it when you are done.</p>
    </div>`);
  const img = el.querySelector('.splash-logo');
  const word = el.querySelector('.splash-word');
  const tag = el.querySelector('.splash-tag');
  const go = () => navigate(state.user ? homeFor(state.user.role) : '/welcome', { replace: true, reset: true });

  let tl;
  if (reduceMotion()) {
    gsap.set([img, word, tag], { opacity: 1 });
    const t = setTimeout(go, 900);
    onLeave(() => clearTimeout(t));
  } else {
    tl = gsap.timeline({ onComplete: go });
    tl.fromTo(img, { opacity: 0, scale: 0.7, y: 10 }, { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'back.out(2)' })
      .fromTo(word, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3 }, '-=0.1')
      .fromTo(tag, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3 }, '-=0.1')
      .to({}, { duration: 0.5 }); // hold so the whole splash lasts about 1.5s
    onLeave(() => tl.kill());
  }
  return el;
}
