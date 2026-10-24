import gsap from 'gsap';
import * as THREE from 'three';
import logo from '../../assets/logo.png';
import { onLeave } from '../../router.js';
import { screenEl, reduceMotion, $ } from '../../components/ui.js';
import { btn } from '../../components/button.js';
import { icon } from '../../components/icons.js';
import { caseStars } from '../../components/card.js';

const C = { pink: 0xf575bd, soft: 0xf5a5d5, yellow: 0xffd66c, purple: 0x6d65bd, indigo: 0x35257d, sky: 0x9de5ed, mint: 0xd5fdb5 };

function webglOk() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) {
    return false;
  }
}

// One small scene: cup, ruler, calculator, star. Flat colors, low-poly, slow float.
function buildScene(stage) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.setAttribute('aria-hidden', 'true');
  stage.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
  camera.position.set(0, 0, 9);
  scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(3, 5, 6);
  scene.add(sun);

  const mat = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });
  const group = new THREE.Group();
  scene.add(group);
  const disposables = [];
  const add = (geo, color, parent) => {
    const m = new THREE.Mesh(geo, mat(color));
    disposables.push(geo, m.material);
    parent.add(m);
    return m;
  };

  // cup
  const cup = new THREE.Group();
  add(new THREE.CylinderGeometry(0.7, 0.55, 1.2, 8), C.soft, cup);
  const handle = add(new THREE.TorusGeometry(0.32, 0.08, 6, 10), C.soft, cup);
  handle.position.set(0.75, 0, 0);
  cup.position.set(-1.7, -0.2, 0);
  group.add(cup);

  // ruler
  const ruler = new THREE.Group();
  add(new THREE.BoxGeometry(0.4, 2.2, 0.1), C.mint, ruler);
  for (let i = -4; i <= 4; i++) {
    const tick = add(new THREE.BoxGeometry(i % 2 ? 0.12 : 0.2, 0.04, 0.14), C.indigo, ruler);
    tick.position.set(-0.1 + (i % 2 ? 0.04 : 0), i * 0.22, 0);
  }
  ruler.position.set(-0.4, 1.0, 0);
  ruler.rotation.z = 0.35;
  group.add(ruler);

  // calculator block
  const calc = new THREE.Group();
  add(new THREE.BoxGeometry(1.3, 1.8, 0.35), C.purple, calc);
  const screen = add(new THREE.BoxGeometry(1.0, 0.45, 0.06), C.sky, calc);
  screen.position.set(0, 0.55, 0.2);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const key = add(new THREE.BoxGeometry(0.26, 0.2, 0.06), C.yellow, calc);
    key.position.set(-0.36 + c * 0.36, 0.0 - r * 0.32, 0.2);
  }
  calc.position.set(1.7, -0.4, 0);
  calc.rotation.z = -0.2;
  group.add(calc);

  // star
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? 0.35 : 0.8;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  s.closePath();
  const star = add(new THREE.ExtrudeGeometry(s, { depth: 0.25, bevelEnabled: false }), C.yellow, group);
  star.position.set(0.9, 1.4, 0);

  function resize() {
    const w = stage.clientWidth || 300;
    const h = stage.clientHeight || 260;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < 340 ? 48 : 40;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(stage);

  // tilt a little when the finger or mouse moves over the scene
  const tilt = { x: 0, y: 0 };
  const onMove = (e) => {
    const r = stage.getBoundingClientRect();
    tilt.y = ((e.clientX - r.left) / r.width - 0.5) * 0.8;
    tilt.x = ((e.clientY - r.top) / r.height - 0.5) * 0.5;
  };
  stage.addEventListener('pointermove', onMove);

  let raf = 0;
  let t0 = performance.now();
  const loop = (now) => {
    const t = (now - t0) / 1000;
    group.rotation.y += (tilt.y - group.rotation.y) * 0.06;
    group.rotation.x += (tilt.x - group.rotation.x) * 0.06;
    cup.position.y = -0.2 + Math.sin(t * 1.2) * 0.12;
    cup.rotation.y = t * 0.4;
    ruler.position.y = 1.0 + Math.sin(t * 1.0 + 1) * 0.12;
    ruler.rotation.y = Math.sin(t * 0.6) * 0.5;
    calc.position.y = -0.4 + Math.sin(t * 1.1 + 2) * 0.12;
    calc.rotation.y = Math.sin(t * 0.5 + 1) * 0.6;
    star.rotation.y = t * 0.8;
    star.position.y = 1.4 + Math.sin(t * 1.4) * 0.1;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };
  const start = () => { if (!raf) raf = requestAnimationFrame(loop); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVis);
  start();

  return () => {
    stop();
    document.removeEventListener('visibilitychange', onVis);
    stage.removeEventListener('pointermove', onMove);
    ro.disconnect();
    disposables.forEach((d) => d.dispose());
    renderer.dispose();
    renderer.domElement.remove();
  };
}

export default function welcome() {
  const el = screenEl(`
    <div class="welcome">
      <header class="brand-bar">
        <img src="${logo}" alt="" aria-hidden="true" class="brand-mark" />
        <h1 class="brand-wordmark" tabindex="-1">Borrow-a-Supply</h1>
      </header>
      <div class="welcome-stage" id="stage">
        ${caseStars()}
      </div>
      <div class="welcome-copy">
        <p class="welcome-display">School supplies, <mark>without the buy.</mark></p>
        <p class="welcome-body">Reserve calculators, lab coats, drafting tools and umbrellas. Pick up and return at the Borrow Room on campus.</p>
        <ul class="welcome-points">
          <li>${icon('qr', 14)} QR pickup</li>
          <li>${icon('cash', 14)} ₱15–30 per session</li>
          <li>${icon('pin', 14)} On campus</li>
        </ul>
      </div>
      <div class="welcome-actions">
        ${btn({ label: 'Create Account', nav: '/signup', block: true, ic: 'arrow' })}
        ${btn({ label: 'Log In', nav: '/login', variant: 'outline', block: true })}
      </div>
      <p class="welcome-foot">A student service of the campus Borrow Room</p>
    </div>`);

  const stage = $('#stage', el);
  // Fall back to the static logo when WebGL is missing or the person prefers less motion.
  if (reduceMotion() || !webglOk()) {
    stage.classList.add('is-logo');
    stage.insertAdjacentHTML('beforeend', `<img src="${logo}" alt="Borrow-a-Supply logo" class="welcome-logo" />`);
  } else {
    stage.classList.add('is-3d');
    // wait until the screen is in the page so the canvas can be measured
    requestAnimationFrame(() => {
      if (!stage.isConnected) return;
      try {
        onLeave(buildScene(stage));
      } catch (e) {
        stage.classList.remove('is-3d');
        stage.classList.add('is-logo');
        stage.insertAdjacentHTML('beforeend', `<img src="${logo}" alt="Borrow-a-Supply logo" class="welcome-logo" />`);
      }
    });
  }

  if (!reduceMotion()) {
    // use element references: the screen is not in the page yet, so selectors on document would miss it
    // clearProps guarantees the end state is clean, so a killed timeline can never leave anything invisible
    const tl = gsap.timeline({ defaults: { ease: 'power2.out', clearProps: 'opacity,transform' } });
    tl.from(el.querySelector('.brand-bar'), { opacity: 0, y: -8, duration: 0.25 })
      .from(stage, { opacity: 0, y: 18, duration: 0.4 }, '-=0.1')
      .from(el.querySelectorAll('.welcome-copy > *'), { opacity: 0, y: 14, duration: 0.3, stagger: 0.06 }, 0.1)
      .from(el.querySelectorAll('.welcome-actions .btn'), { opacity: 0, y: 14, duration: 0.25, stagger: 0.06 }, 0.15)
      .from(el.querySelector('.welcome-foot'), { opacity: 0, duration: 0.25 }, 0.3);
    onLeave(() => tl.kill());
  }
  return el;
}
