var ACCENT_COLORS = {
  terracotta: { main: '#b5613a', dark: '#8c4a2b' },
  sage:        { main: '#6b8f71', dark: '#4d6b52' },
  blue:        { main: '#5b7fa6', dark: '#3d607f' },
  plum:        { main: '#7d5a7a', dark: '#5c3f59' },
};

var DEFAULTS = {
  1: { label: 'Notebook One', accent: 'terracotta' },
  2: { label: 'Notebook Two', accent: 'sage' },
};

var PREMADE_STICKERS = [
  '⭐','🌟','✨','💫','🔥','💡',
  '🎯','🚀','🏆','💪','📚','🎓',
  '💼','📝','📌','🌸','🌱','🍀',
  '🌈','🦋','☕','🎉','💖','🌻',
  '🎀','🍭','🌺','🏵️','🖊️','🗓️',
];

var currentStickerTarget = null;

// =====================
// Sync dot
// =====================

function setSyncDot(state) {
  var dot = document.getElementById('sync-dot');
  if (!dot) return;
  dot.className = 'sync-dot sync-dot--' + state;
  dot.title = { idle: 'Sync not configured', syncing: 'Syncing…', ok: 'Synced', err: 'Sync error' }[state] || '';
}

// =====================
// Book appearance
// =====================

function applyBook(id) {
  var accent = localStorage.getItem('car-ears-' + id + '-accent') || DEFAULTS[id].accent;
  var label  = localStorage.getItem('car-ears-' + id + '-label')  || DEFAULTS[id].label;
  var colors = ACCENT_COLORS[accent] || ACCENT_COLORS.terracotta;

  var spine   = document.getElementById('spine-'  + id);
  var cover   = document.getElementById('cover-'  + id);
  var labelEl = document.getElementById('label-'  + id);

  if (spine)   spine.style.setProperty('--spine-color', colors.dark);
  if (cover)   cover.style.setProperty('--cover-color', colors.main);
  if (labelEl) labelEl.textContent = label;
}

// =====================
// Book label editing
// =====================

function initBookLabelEdit(id) {
  var labelEl = document.getElementById('label-' + id);
  if (!labelEl) return;

  labelEl.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    labelEl.contentEditable = 'true';
    labelEl.focus();
    var range = document.createRange();
    range.selectNodeContents(labelEl);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });

  labelEl.addEventListener('blur', function() {
    labelEl.contentEditable = 'false';
    var val = (labelEl.textContent || '').trim() || DEFAULTS[id].label;
    labelEl.textContent = val;
    localStorage.setItem('car-ears-' + id + '-label', val);
    debouncedSave();
  });

  labelEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      labelEl.blur();
    }
  });
}

// =====================
// Sticker data
// =====================

function getStickers(bookId) {
  try { return JSON.parse(localStorage.getItem('car-ears-' + bookId + '-stickers') || '[]'); }
  catch(e) { return []; }
}

function saveStickers(bookId, stickers) {
  localStorage.setItem('car-ears-' + bookId + '-stickers', JSON.stringify(stickers));
  debouncedSave();
}

function getCustomStickers() {
  try { return JSON.parse(localStorage.getItem('car-ears-custom-stickers') || '[]'); }
  catch(e) { return []; }
}

function addCustomSticker(src) {
  var custom = getCustomStickers();
  if (custom.length >= 24) custom.shift();
  custom.push(src);
  localStorage.setItem('car-ears-custom-stickers', JSON.stringify(custom));
  debouncedSave();
}

// =====================
// Sticker rendering
// =====================

function renderStickers(bookId) {
  var layer = document.getElementById('sticker-layer-' + bookId);
  if (!layer) return;
  layer.innerHTML = '';
  getStickers(bookId).forEach(function(s) {
    layer.appendChild(createStickerEl(s, bookId));
  });
}

function createStickerEl(s, bookId) {
  var el = document.createElement('div');
  el.className = 'sticker';
  el.style.left = s.x + '%';
  el.style.top  = s.y + '%';
  el.dataset.id = s.id;

  if (s.type === 'emoji') {
    var span = document.createElement('span');
    span.className = 'sticker-emoji';
    span.textContent = s.content;
    el.appendChild(span);
  } else {
    var img = document.createElement('img');
    img.src = s.content;
    img.alt = '';
    img.className = 'sticker-img';
    el.appendChild(img);
  }

  var removeBtn = document.createElement('button');
  removeBtn.className = 'sticker-remove';
  removeBtn.innerHTML = '&#215;';
  removeBtn.title = 'Remove';
  removeBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    var updated = getStickers(bookId).filter(function(x) { return x.id !== s.id; });
    saveStickers(bookId, updated);
    el.remove();
  });
  el.appendChild(removeBtn);

  makeDraggable(el, bookId, s.id);
  return el;
}

function makeDraggable(el, bookId, stickerId) {
  var dragging = false;
  var startX, startY, startLeft, startTop;

  el.addEventListener('pointerdown', function(e) {
    if (e.target.classList.contains('sticker-remove')) return;
    e.preventDefault();
    e.stopPropagation();
    dragging = true;
    el.setPointerCapture(e.pointerId);
    startX    = e.clientX;
    startY    = e.clientY;
    startLeft = parseFloat(el.style.left);
    startTop  = parseFloat(el.style.top);
    el.style.zIndex = '50';
  });

  el.addEventListener('pointermove', function(e) {
    if (!dragging) return;
    var rect = el.parentElement.getBoundingClientRect();
    var dx = (e.clientX - startX) / rect.width  * 100;
    var dy = (e.clientY - startY) / rect.height * 100;
    el.style.left = Math.max(5, Math.min(95, startLeft + dx)) + '%';
    el.style.top  = Math.max(5, Math.min(95, startTop  + dy)) + '%';
  });

  el.addEventListener('pointerup', function() {
    if (!dragging) return;
    dragging = false;
    el.style.zIndex = '';
    var stickers = getStickers(bookId);
    var s = stickers.find(function(x) { return x.id === stickerId; });
    if (s) {
      s.x = parseFloat(el.style.left);
      s.y = parseFloat(el.style.top);
      saveStickers(bookId, stickers);
    }
  });
}

// =====================
// Sticker placement
// =====================

function placeSticker(bookId, type, content) {
  var stickers = getStickers(bookId);
  stickers.push({
    id:      Math.random().toString(36).slice(2) + Date.now().toString(36),
    type:    type,
    content: content,
    x: 20 + Math.random() * 55,
    y: 20 + Math.random() * 55,
  });
  saveStickers(bookId, stickers);
  renderStickers(bookId);
  closeStickerPanel();
}

// =====================
// Sticker panel
// =====================

function openStickerPanel(bookId) {
  currentStickerTarget = bookId;

  var library = document.getElementById('sticker-library');
  library.innerHTML = '';
  PREMADE_STICKERS.forEach(function(emoji) {
    var btn = document.createElement('button');
    btn.className = 'sticker-option';
    btn.textContent = emoji;
    btn.addEventListener('click', function() {
      placeSticker(currentStickerTarget, 'emoji', emoji);
    });
    library.appendChild(btn);
  });

  refreshCustomGrid();
  document.getElementById('sticker-panel').hidden = false;
  document.getElementById('sticker-scrim').hidden = false;
}

function closeStickerPanel() {
  document.getElementById('sticker-panel').hidden = true;
  document.getElementById('sticker-scrim').hidden = true;
}

function refreshCustomGrid() {
  var grid = document.getElementById('custom-sticker-grid');
  grid.innerHTML = '';
  getCustomStickers().forEach(function(src) {
    var btn = document.createElement('button');
    btn.className = 'custom-sticker-option-btn';
    var img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.className = 'custom-sticker-img';
    btn.appendChild(img);
    btn.addEventListener('click', function() {
      placeSticker(currentStickerTarget, 'custom', src);
    });
    grid.appendChild(btn);
  });
}

// =====================
// Image upload
// =====================

function initUpload() {
  document.getElementById('sticker-upload-input').addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    resizeAndStore(file);
    e.target.value = '';
  });
}

function resizeAndStore(file) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var MAX = 150;
      var scale = Math.min(1, MAX / Math.max(img.width, img.height));
      var canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      addCustomSticker(canvas.toDataURL('image/png', 0.85));
      refreshCustomGrid();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// =====================
// Sync settings modal
// =====================

function openSyncModal() {
  var cfg = syncConfig.get();
  document.getElementById('sync-pat-input').value  = cfg.pat  ? '••••••••' : '';
  document.getElementById('sync-gist-input').value = cfg.gistId || '';
  document.getElementById('sync-clear-row').style.display = cfg.pat ? '' : 'none';
  document.getElementById('sync-status-msg').textContent = '';
  document.getElementById('sync-modal').hidden = false;
  document.getElementById('sync-scrim').hidden = false;
}

function closeSyncModal() {
  document.getElementById('sync-modal').hidden = true;
  document.getElementById('sync-scrim').hidden = true;
}

function initSyncModal() {
  document.getElementById('open-sync-btn').addEventListener('click', openSyncModal);
  document.getElementById('sync-modal-close').addEventListener('click', closeSyncModal);
  document.getElementById('sync-scrim').addEventListener('click', closeSyncModal);

  document.getElementById('sync-save-btn').addEventListener('click', function() {
    var pat    = document.getElementById('sync-pat-input').value.trim();
    var gistId = document.getElementById('sync-gist-input').value.trim();
    var msg    = document.getElementById('sync-status-msg');

    if (!pat || pat === '••••••••') pat = syncConfig.get().pat;
    if (!pat || !gistId) {
      msg.textContent = 'Both fields required.';
      msg.style.color = '#c04040';
      return;
    }

    syncConfig.set(pat, gistId);
    msg.textContent = 'Saving…';
    msg.style.color = '';
    setSyncDot('syncing');

    syncPull().then(function(snap) {
      if (snap) {
        applySnapshot(snap);
        applyBook(1);
        applyBook(2);
        renderStickers(1);
        renderStickers(2);
      }
      return syncPush(buildSnapshot());
    }).then(function() {
      msg.textContent = 'Synced!';
      setSyncDot('ok');
      document.getElementById('sync-clear-row').style.display = '';
      setTimeout(closeSyncModal, 1200);
    }).catch(function() {
      msg.textContent = 'Sync failed — check credentials.';
      msg.style.color = '#c04040';
      setSyncDot('err');
    });
  });

  document.getElementById('sync-clear-btn').addEventListener('click', function() {
    localStorage.removeItem('car-ears-sync-pat');
    localStorage.removeItem('car-ears-sync-gist');
    document.getElementById('sync-pat-input').value  = '';
    document.getElementById('sync-gist-input').value = '';
    document.getElementById('sync-clear-row').style.display = 'none';
    document.getElementById('sync-status-msg').textContent = 'Cleared.';
    setSyncDot('idle');
  });
}

// =====================
// Init
// =====================

document.addEventListener('DOMContentLoaded', function() {
  // Show sync dot state immediately
  setSyncDot(syncConfig.isReady() ? 'idle' : 'idle');

  // Pull from sync then apply
  if (syncConfig.isReady()) {
    setSyncDot('syncing');
    syncLoad(function(snap) {
      applyBook(1);
      applyBook(2);
      renderStickers(1);
      renderStickers(2);
      setSyncDot(snap ? 'ok' : 'err');
    });
  } else {
    applyBook(1);
    applyBook(2);
    renderStickers(1);
    renderStickers(2);
  }

  initBookLabelEdit(1);
  initBookLabelEdit(2);

  document.getElementById('add-sticker-1').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); openStickerPanel(1);
  });
  document.getElementById('add-sticker-2').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); openStickerPanel(2);
  });

  document.getElementById('sticker-panel-close').addEventListener('click', closeStickerPanel);
  document.getElementById('sticker-scrim').addEventListener('click', closeStickerPanel);
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { closeStickerPanel(); closeSyncModal(); }
  });

  initUpload();
  initSyncModal();
});
