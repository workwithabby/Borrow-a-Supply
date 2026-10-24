// One icon set for the whole app: Lucide line icons.
import {
  createElement, House, Search, ClipboardList, User, Bell, ChevronLeft, ChevronRight, Eye, EyeOff, Info, Check,
  X, Plus, Minus, QrCode, ScanLine, Boxes, LayoutDashboard, Package, Users, ChartColumn, Settings, LogOut,
  Clock, MapPin, Calendar, Star, TriangleAlert, Lock, Mail, IdCard, Download, Wallet, Banknote, CircleHelp,
  BookOpen, Pencil, Archive, Wrench, UserCheck, ShieldCheck, Keyboard, Calculator, Shirt, Ruler, Umbrella,
  Plug, Usb, Ban, UserX, CircleCheck, Receipt, Megaphone, Trash2, RotateCcw, ArrowRight, Camera, Menu,
} from 'lucide';

const ICONS = {
  home: House, search: Search, rentals: ClipboardList, user: User, bell: Bell, back: ChevronLeft, next: ChevronRight,
  menu: Menu,
  eye: Eye, 'eye-off': EyeOff, info: Info, check: Check, close: X, plus: Plus, minus: Minus, qr: QrCode, scan: ScanLine,
  inventory: Boxes, dashboard: LayoutDashboard, package: Package, people: Users, chart: ChartColumn, settings: Settings,
  logout: LogOut, clock: Clock, pin: MapPin, calendar: Calendar, star: Star, warning: TriangleAlert, lock: Lock,
  mail: Mail, id: IdCard, download: Download, wallet: Wallet, cash: Banknote, help: CircleHelp, rules: BookOpen,
  edit: Pencil, archive: Archive, wrench: Wrench, staff: UserCheck, shield: ShieldCheck, keyboard: Keyboard,
  calculator: Calculator, shirt: Shirt, ruler: Ruler, umbrella: Umbrella, plug: Plug, usb: Usb, ban: Ban,
  'user-x': UserX, ok: CircleCheck, receipt: Receipt, megaphone: Megaphone, trash: Trash2, undo: RotateCcw,
  arrow: ArrowRight, camera: Camera,
};

// Item icons by name, falling back to the category icon.
const ITEM_ICONS = [
  [/umbrella/i, 'umbrella'], [/calculator/i, 'calculator'], [/lab coat/i, 'shirt'], [/cord/i, 'plug'],
  [/flash/i, 'usb'], [/ruler|t-square|protractor|compass|drafting/i, 'ruler'],
];

const cache = new Map();

// Returns an SVG string. Decorative by default, so screen readers skip it.
export function icon(name, size = 22, extra = '') {
  const key = `${name}:${size}:${extra}`;
  if (cache.has(key)) return cache.get(key);
  const node = ICONS[name] || Package;
  const svg = createElement(node, {
    width: size, height: size, 'stroke-width': 2, 'aria-hidden': 'true', focusable: 'false', class: `icon ${extra}`.trim(),
  });
  const html = svg.outerHTML;
  cache.set(key, html);
  return html;
}

// Filled star, the small shape from the logo.
export function starShape(size = 22, extra = '') {
  return icon('star', size, extra).replace('<svg ', '<svg fill="currentColor" ');
}

export function itemIconName(item) {
  const hit = ITEM_ICONS.find(([re]) => re.test(item.name));
  if (hit) return hit[1];
  return item.category?.icon || 'package';
}

const TINTS = ['pink', 'sky', 'yellow', 'mint', 'purple'];
export function tintFor(key = '') {
  let n = 0;
  for (const ch of String(key)) n = (n + ch.charCodeAt(0)) % 997;
  return TINTS[n % TINTS.length];
}
