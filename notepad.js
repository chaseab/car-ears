// PAD_ID must be defined before this script loads (inline script in each notepad HTML)

const ACCENT_COLORS = {
  terracotta: { main: '#b5613a', dark: '#8c4a2b', light: '#d4846a' },
  sage:        { main: '#6b8f71', dark: '#4d6b52', light: '#9fc4a4' },
  blue:        { main: '#5b7fa6', dark: '#3d607f', light: '#8fb0d0' },
  plum:        { main: '#7d5a7a', dark: '#5c3f59', light: '#b08aae' },
};

const PAD_DEFAULTS = {
  1: { label: 'Notebook One', accent: 'terracotta' },
  2: { label: 'Notebook Two', accent: 'sage' },
};

function key(k) {
  return 'car-ears-' + PAD_ID + '-' + k;
}

function applyAccent(name) {
  const c = ACCENT_COLORS[name] || ACCENT_COLORS.terracotta;
  const root = document.documentElement;
  root.style.setProperty('--accent',       c.main);
  root.style.setProperty('--accent-dark',  c.dark);
  root.style.setProperty('--accent-light', c.light);

  document.querySelectorAll('.swatch').forEach(function(s) {
    s.classList.toggle('active', s.dataset.accent === name);
  });
}

function updateWordCount() {
  var content = document.getElementById('pad-content');
  var text = (content.innerText || content.textContent || '').trim();
  var n = text ? text.split(/\s+/).length : 0;
  document.getElementById('word-count').textContent = n + ' word' + (n !== 1 ? 's' : '');
}

var saveTimer = null;

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(function() {
    var content = document.getElementById('pad-content');
    localStorage.setItem(key('content'), content.innerHTML);
    updateWordCount();
  }, 500);
}

document.addEventListener('DOMContentLoaded', function() {
  var defaults = PAD_DEFAULTS[PAD_ID] || { label: 'Notebook', accent: 'terracotta' };

  var label   = localStorage.getItem(key('label'))   || defaults.label;
  var accent  = localStorage.getItem(key('accent'))  || defaults.accent;
  var content = localStorage.getItem(key('content')) || '';

  var titleEl   = document.getElementById('pad-title');
  var contentEl = document.getElementById('pad-content');

  // Apply saved state
  titleEl.textContent = label;
  document.title = 'Car Ears — ' + label;
  applyAccent(accent);
  if (content) contentEl.innerHTML = content;
  updateWordCount();

  // Title: save on blur
  titleEl.addEventListener('blur', function() {
    var val = (titleEl.textContent || '').trim() || defaults.label;
    titleEl.textContent = val;
    document.title = 'Car Ears — ' + val;
    localStorage.setItem(key('label'), val);
  });

  // Title: Enter key blurs (no newlines in title)
  titleEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      titleEl.blur();
    }
  });

  // Content: clear stray <br> on empty, then debounce save
  contentEl.addEventListener('input', function() {
    if (contentEl.innerHTML === '<br>') contentEl.innerHTML = '';
    scheduleSave();
  });

  // Swatches: switch accent
  document.querySelectorAll('.swatch').forEach(function(swatch) {
    swatch.addEventListener('click', function() {
      var name = swatch.dataset.accent;
      applyAccent(name);
      localStorage.setItem(key('accent'), name);
    });
  });

  // Auto-focus content area
  setTimeout(function() { contentEl.focus(); }, 80);
});
