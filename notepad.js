// PAD_ID must be defined before this script loads (inline script in each notepad HTML)

var ACCENT_COLORS = {
  terracotta: { main: '#b5613a', dark: '#8c4a2b', light: '#d4846a' },
  sage:        { main: '#6b8f71', dark: '#4d6b52', light: '#9fc4a4' },
  blue:        { main: '#5b7fa6', dark: '#3d607f', light: '#8fb0d0' },
  plum:        { main: '#7d5a7a', dark: '#5c3f59', light: '#b08aae' },
};

var PAD_DEFAULTS = {
  1: { label: 'Notebook One', accent: 'terracotta' },
  2: { label: 'Notebook Two', accent: 'sage' },
};

function lsKey(k) {
  return 'car-ears-' + PAD_ID + '-' + k;
}

function applyAccent(name) {
  var c = ACCENT_COLORS[name] || ACCENT_COLORS.terracotta;
  var root = document.documentElement;
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
    var html = content.innerHTML;
    if (html === '<br>') html = '';
    localStorage.setItem(lsKey('content'), html);
    updateWordCount();
  }, 500);
}

function saveAll() {
  var titleEl   = document.getElementById('pad-title');
  var contentEl = document.getElementById('pad-content');
  var val = (titleEl.textContent || '').trim();
  if (val) localStorage.setItem(lsKey('label'), val);
  var html = contentEl.innerHTML;
  if (html === '<br>') html = '';
  localStorage.setItem(lsKey('content'), html);
}

// =====================
// Format toolbar
// =====================

function updateToolbarState() {
  document.querySelectorAll('.fmt-btn[data-cmd]').forEach(function(btn) {
    var cmd = btn.dataset.cmd;
    if (cmd === 'removeFormat') return;
    try {
      btn.classList.toggle('active', document.queryCommandState(cmd));
    } catch(e) {}
  });
}

function initToolbar(contentEl) {
  document.querySelectorAll('.fmt-btn').forEach(function(btn) {
    btn.addEventListener('mousedown', function(e) {
      e.preventDefault(); // keep focus in contenteditable
      var cmd = btn.dataset.cmd;
      document.execCommand(cmd, false, null);
      contentEl.focus();
      updateToolbarState();
      scheduleSave();
    });
  });

  document.addEventListener('selectionchange', function() {
    if (document.activeElement === contentEl || contentEl.contains(document.getSelection().anchorNode)) {
      updateToolbarState();
    }
  });
}

// =====================
// Init
// =====================

document.addEventListener('DOMContentLoaded', function() {
  var defaults  = PAD_DEFAULTS[PAD_ID] || { label: 'Notebook', accent: 'terracotta' };
  var titleEl   = document.getElementById('pad-title');
  var contentEl = document.getElementById('pad-content');

  var label   = localStorage.getItem(lsKey('label'))   || defaults.label;
  var accent  = localStorage.getItem(lsKey('accent'))  || defaults.accent;
  var content = localStorage.getItem(lsKey('content')) || '';

  // Apply saved state — never overwrites with empty
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
    localStorage.setItem(lsKey('label'), val);
  });

  titleEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); }
  });

  // Content: clear stray <br>, debounce save
  contentEl.addEventListener('input', function() {
    if (contentEl.innerHTML === '<br>') contentEl.innerHTML = '';
    scheduleSave();
  });

  // Swatches
  document.querySelectorAll('.swatch').forEach(function(swatch) {
    swatch.addEventListener('click', function() {
      var name = swatch.dataset.accent;
      applyAccent(name);
      localStorage.setItem(lsKey('accent'), name);
    });
  });

  // Format toolbar
  initToolbar(contentEl);

  // Save everything before navigating away
  window.addEventListener('beforeunload', saveAll);

  // Focus content
  setTimeout(function() { contentEl.focus(); }, 80);
});
