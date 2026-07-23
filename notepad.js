// PAD_ID must be defined before this script loads

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

var magicCursorActive = false;

function lsKey(k) { return 'car-ears-' + PAD_ID + '-' + k; }

// =====================
// Accent
// =====================

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

// =====================
// Word count + save
// =====================

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
    if (cmd === 'removeFormat' || cmd === 'insertUnorderedList' || cmd === 'insertOrderedList') return;
    try { btn.classList.toggle('active', document.queryCommandState(cmd)); } catch(e) {}
  });
}

function initToolbar(contentEl) {
  document.querySelectorAll('.fmt-btn[data-cmd]').forEach(function(btn) {
    btn.addEventListener('mousedown', function(e) {
      e.preventDefault();
      document.execCommand(btn.dataset.cmd, false, null);
      contentEl.focus();
      updateToolbarState();
      scheduleSave();
    });
  });

  document.addEventListener('selectionchange', function() {
    var sel = window.getSelection();
    if (sel && sel.anchorNode && contentEl.contains(sel.anchorNode)) {
      updateToolbarState();
    }
  });
}

// =====================
// Tab key — indent/outdent in lists
// =====================

function isInList() {
  var sel = window.getSelection();
  if (!sel || !sel.rangeCount) return false;
  var node = sel.getRangeAt(0).startContainer;
  var el = node.nodeType === 3 ? node.parentElement : node;
  while (el) {
    var tag = el.tagName && el.tagName.toLowerCase();
    if (tag === 'li' || tag === 'ul' || tag === 'ol') return true;
    if (el.contentEditable === 'true') break;
    el = el.parentElement;
  }
  return false;
}

function initTabHandling(contentEl) {
  contentEl.addEventListener('keydown', function(e) {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    if (isInList()) {
      document.execCommand(e.shiftKey ? 'outdent' : 'indent');
    } else {
      document.execCommand('insertText', false, '    ');
    }
    scheduleSave();
  });
}

// =====================
// Magic cursor
// =====================

function getPadLabel() {
  return (document.getElementById('pad-title').textContent || '').trim()
    || (PAD_DEFAULTS[PAD_ID] || {}).label
    || 'Notebook';
}

function saveWhiteboardItem(text) {
  var items = [];
  try { items = JSON.parse(localStorage.getItem('car-ears-whiteboard-items') || '[]'); }
  catch(e) {}
  items.push({
    id:      Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    text:    text,
    source:  getPadLabel(),
    sentAt:  new Date().toISOString(),
  });
  localStorage.setItem('car-ears-whiteboard-items', JSON.stringify(items));
}

function getBlockAtEvent(e, contentEl) {
  // Try caretRangeFromPoint first for precise hit
  var node = null;
  if (document.caretRangeFromPoint) {
    var r = document.caretRangeFromPoint(e.clientX, e.clientY);
    if (r) node = r.startContainer;
  } else if (document.caretPositionFromPoint) {
    var cp = document.caretPositionFromPoint(e.clientX, e.clientY);
    if (cp) node = cp.offsetNode;
  }

  var el = node
    ? (node.nodeType === 3 ? node.parentElement : node)
    : e.target;

  // Walk up to find a meaningful block inside contentEl
  var cur = el;
  while (cur && cur !== contentEl) {
    var tag = cur.tagName && cur.tagName.toLowerCase();
    if (['p','div','li','h1','h2','h3','h4','blockquote'].indexOf(tag) !== -1) {
      return cur;
    }
    cur = cur.parentElement;
  }
  return el === contentEl ? null : el;
}

function animateSend(blockEl) {
  var rect = blockEl.getBoundingClientRect();

  var hl = document.createElement('div');
  hl.className = 'wb-hl';
  hl.style.top    = rect.top    + window.scrollY + 'px';
  hl.style.left   = rect.left   + window.scrollX + 'px';
  hl.style.width  = rect.width  + 'px';
  hl.style.height = Math.max(rect.height, 22) + 'px';
  document.body.appendChild(hl);

  var chk = document.createElement('div');
  chk.className = 'wb-chk';
  chk.textContent = '✓';
  chk.style.top   = (rect.top + window.scrollY + rect.height / 2 - 14) + 'px';
  chk.style.right = '28px';
  document.body.appendChild(chk);

  // Trigger animations next frame
  requestAnimationFrame(function() {
    hl.classList.add('wb-hl--on');
    chk.classList.add('wb-chk--on');
  });

  setTimeout(function() { hl.remove(); chk.remove(); }, 1400);
}

function toggleMagicCursor(contentEl) {
  magicCursorActive = !magicCursorActive;
  var btn = document.getElementById('magic-cursor-btn');
  btn.classList.toggle('active', magicCursorActive);
  contentEl.classList.toggle('magic-mode', magicCursorActive);
  if (!magicCursorActive) contentEl.focus();
}

function initMagicCursor(contentEl) {
  document.getElementById('magic-cursor-btn').addEventListener('click', function() {
    toggleMagicCursor(contentEl);
  });

  // Capture mousedown before contenteditable handles it
  contentEl.addEventListener('mousedown', function(e) {
    if (!magicCursorActive) return;
    e.preventDefault();
    e.stopPropagation();

    var block = getBlockAtEvent(e, contentEl);
    if (!block) return;

    var text = (block.innerText || block.textContent || '').trim();
    if (!text) return;

    animateSend(block);
    saveWhiteboardItem(text);

    // Auto-exit after single capture (toggle off)
    toggleMagicCursor(contentEl);
  }, true); // capture phase

  // Escape also exits magic cursor
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && magicCursorActive) {
      toggleMagicCursor(contentEl);
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

  titleEl.textContent = label;
  document.title = 'Car Ears — ' + label;
  applyAccent(accent);
  if (content) contentEl.innerHTML = content;
  updateWordCount();

  // Title
  titleEl.addEventListener('blur', function() {
    var val = (titleEl.textContent || '').trim() || defaults.label;
    titleEl.textContent = val;
    document.title = 'Car Ears — ' + val;
    localStorage.setItem(lsKey('label'), val);
  });
  titleEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); }
  });

  // Content
  contentEl.addEventListener('input', function() {
    if (contentEl.innerHTML === '<br>') contentEl.innerHTML = '';
    scheduleSave();
  });

  // Swatches
  document.querySelectorAll('.swatch').forEach(function(swatch) {
    swatch.addEventListener('click', function() {
      applyAccent(swatch.dataset.accent);
      localStorage.setItem(lsKey('accent'), swatch.dataset.accent);
    });
  });

  initToolbar(contentEl);
  initTabHandling(contentEl);
  initMagicCursor(contentEl);

  window.addEventListener('beforeunload', saveAll);

  setTimeout(function() { contentEl.focus(); }, 80);
});
