const ACCENT_COLORS = {
  terracotta: { main: '#b5613a', dark: '#8c4a2b' },
  sage:        { main: '#6b8f71', dark: '#4d6b52' },
  blue:        { main: '#5b7fa6', dark: '#3d607f' },
  plum:        { main: '#7d5a7a', dark: '#5c3f59' },
};

const DEFAULTS = {
  1: { label: 'Notebook One', accent: 'terracotta' },
  2: { label: 'Notebook Two', accent: 'sage' },
};

function applyBook(id) {
  const accent = localStorage.getItem('car-ears-' + id + '-accent') || DEFAULTS[id].accent;
  const label  = localStorage.getItem('car-ears-' + id + '-label')  || DEFAULTS[id].label;
  const colors = ACCENT_COLORS[accent] || ACCENT_COLORS.terracotta;

  const spine   = document.getElementById('spine-'  + id);
  const cover   = document.getElementById('cover-'  + id);
  const labelEl = document.getElementById('label-'  + id);

  if (spine)   spine.style.setProperty('--spine-color', colors.dark);
  if (cover)   cover.style.setProperty('--cover-color', colors.main);
  if (labelEl) labelEl.textContent = label;
}

applyBook(1);
applyBook(2);
