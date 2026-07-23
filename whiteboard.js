var CANVAS_MIN_W = 2400;
var CANVAS_MIN_H = 1800;

// =====================
// Data helpers
// =====================

function getItems() {
  try { return JSON.parse(localStorage.getItem('car-ears-whiteboard-items') || '[]'); }
  catch(e) { return []; }
}

function saveItems(items) {
  localStorage.setItem('car-ears-whiteboard-items', JSON.stringify(items));
}

function deleteItem(id) {
  var items = getItems().filter(function(i) { return i.id !== id; });
  saveItems(items);
  if (typeof debouncedSave !== 'undefined') debouncedSave();
  var el = document.querySelector('[data-sticky-id="' + id + '"]');
  if (el) el.remove();
  checkEmpty();
}

function getWbState() {
  try { return JSON.parse(localStorage.getItem('car-ears-wb-state') || '{}'); }
  catch(e) { return {}; }
}

function saveWbState(state) {
  localStorage.setItem('car-ears-wb-state', JSON.stringify(state));
}

// =====================
// Layout helpers
// =====================

function defaultPos(index, total) {
  var cols = Math.max(1, Math.floor((window.innerWidth - 120) / 260));
  var col = index % cols;
  var row = Math.floor(index / cols);
  return {
    x: 60 + col * 260 + randJitter(20),
    y: 60 + row * 220 + randJitter(20),
  };
}

function expansionPos(parentPos) {
  return {
    x: parentPos.x + 240 + randJitter(15),
    y: parentPos.y + randJitter(20),
  };
}

function randJitter(range) {
  return (Math.random() * range * 2) - range;
}

function randRotation() {
  return parseFloat((Math.random() * 6 - 3).toFixed(1));
}

// =====================
// URL linkification
// =====================

function linkify(text) {
  var escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped.replace(
    /(https?:\/\/[^\s<>"]+)/g,
    '<a href="$1" target="_blank" rel="noopener" class="sticky-link">$1 &#x2197;</a>'
  );
}

// =====================
// Sticky note elements
// =====================

function createUserSticky(item, pos, rot) {
  var el = document.createElement('div');
  el.className = 'sticky-note sticky-user';
  el.dataset.stickyId = item.id;
  el.style.left     = pos.x + 'px';
  el.style.top      = pos.y + 'px';
  el.style.transform = 'rotate(' + rot + 'deg)';

  var deleteBtn = document.createElement('button');
  deleteBtn.className = 'sticky-delete';
  deleteBtn.innerHTML = '&#215;';
  deleteBtn.title = 'Remove';
  deleteBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    deleteItem(item.id);
  });

  var body = document.createElement('div');
  body.className = 'sticky-body';
  body.innerHTML = linkify(item.text);

  var meta = document.createElement('div');
  meta.className = 'sticky-meta';
  meta.textContent = (item.source || '') + (item.sentAt ? ' · ' + fmtDate(item.sentAt) : '');

  el.appendChild(deleteBtn);
  el.appendChild(body);
  el.appendChild(meta);

  makeDraggable(el, item.id);
  return el;
}

function createExpansionSticky(exp, pos, rot) {
  var el = document.createElement('div');
  el.className = 'sticky-note sticky-expansion';
  el.dataset.stickyId = 'exp_' + exp.id;
  el.style.left      = pos.x + 'px';
  el.style.top       = pos.y + 'px';
  el.style.transform = 'rotate(' + rot + 'deg)';

  var badge = document.createElement('div');
  badge.className = 'sticky-ai-badge';
  badge.textContent = '✦ AI';

  if (exp.favicon) {
    var fav = document.createElement('img');
    fav.src = exp.favicon;
    fav.className = 'sticky-favicon';
    fav.alt = '';
    fav.onerror = function() { this.remove(); };
    badge.prepend(fav);
  }

  var title = document.createElement('div');
  title.className = 'sticky-title';
  title.textContent = exp.title || exp.originalText || '';

  var body = document.createElement('div');
  body.className = 'sticky-body';
  body.innerHTML = linkify(exp.content || '');

  el.appendChild(badge);
  el.appendChild(title);
  el.appendChild(body);

  if (exp.links && exp.links.length) {
    var linksEl = document.createElement('div');
    linksEl.className = 'sticky-links';
    exp.links.forEach(function(lnk) {
      var a = document.createElement('a');
      a.href = lnk.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.className = 'sticky-link';
      a.textContent = lnk.text + ' ↗';
      linksEl.appendChild(a);
    });
    el.appendChild(linksEl);
  }

  var meta = document.createElement('div');
  meta.className = 'sticky-meta';
  meta.textContent = 're: ' + (exp.originalText || '').slice(0, 50);
  el.appendChild(meta);

  makeDraggable(el, 'exp_' + exp.id);
  return el;
}

function fmtDate(iso) {
  try {
    var d = new Date(iso);
    return (d.getMonth() + 1) + '/' + d.getDate();
  } catch(e) { return ''; }
}

// =====================
// Drag to reposition
// =====================

function makeDraggable(el, id) {
  var dragging = false;
  var startX, startY, startElX, startElY;

  el.addEventListener('pointerdown', function(e) {
    if (e.target.classList.contains('sticky-delete') ||
        e.target.classList.contains('sticky-link') ||
        e.target.tagName === 'A') return;
    dragging = true;
    el.setPointerCapture(e.pointerId);
    startX   = e.clientX;
    startY   = e.clientY;
    startElX = parseInt(el.style.left);
    startElY = parseInt(el.style.top);
    el.style.zIndex = '50';
    el.style.transition = 'none';
  });

  el.addEventListener('pointermove', function(e) {
    if (!dragging) return;
    var x = Math.max(0, startElX + (e.clientX - startX));
    var y = Math.max(0, startElY + (e.clientY - startY));
    el.style.left = x + 'px';
    el.style.top  = y + 'px';
  });

  el.addEventListener('pointerup', function() {
    if (!dragging) return;
    dragging = false;
    el.style.zIndex = '';
    var state = getWbState();
    state[id] = {
      x:   parseInt(el.style.left),
      y:   parseInt(el.style.top),
      rot: parseFloat((el.style.transform.match(/rotate\(([^d]+)deg\)/) || ['', '0'])[1]),
    };
    saveWbState(state);
  });
}

// =====================
// Render
// =====================

function render(items, expansions) {
  var canvas = document.getElementById('wb-canvas');
  var state  = getWbState();

  canvas.querySelectorAll('.sticky-note').forEach(function(el) { el.remove(); });

  if (!items.length && !expansions.length) {
    document.getElementById('wb-empty').hidden = false;
    return;
  }
  document.getElementById('wb-empty').hidden = true;

  var maxX = 0, maxY = 0;

  items.forEach(function(item, i) {
    var saved = state[item.id];
    var pos = saved ? { x: saved.x, y: saved.y } : defaultPos(i, items.length);
    var rot = saved ? saved.rot : randRotation();

    if (!saved) {
      var s = getWbState();
      s[item.id] = { x: pos.x, y: pos.y, rot: rot };
      saveWbState(s);
    }

    var el = createUserSticky(item, pos, rot);
    canvas.appendChild(el);

    // Find expansions for this item
    var itemExps = expansions.filter(function(e) { return e.itemId === item.id; });
    itemExps.forEach(function(exp, ei) {
      var expId  = 'exp_' + exp.id;
      var eSaved = state[expId];
      var ePos   = eSaved ? { x: eSaved.x, y: eSaved.y } : expansionPos(pos);
      var eRot   = eSaved ? eSaved.rot : randRotation();
      if (!eSaved) {
        var s2 = getWbState();
        s2[expId] = { x: ePos.x, y: ePos.y, rot: eRot };
        saveWbState(s2);
      }
      var expEl = createExpansionSticky(exp, ePos, eRot);
      canvas.appendChild(expEl);
      maxX = Math.max(maxX, ePos.x + 240);
      maxY = Math.max(maxY, ePos.y + 200);
    });

    maxX = Math.max(maxX, pos.x + 240);
    maxY = Math.max(maxY, pos.y + 200);
  });

  // Expansions that have no matching item (standalone, e.g., LS cleared)
  var itemIds = items.map(function(i) { return i.id; });
  var orphans = expansions.filter(function(e) { return itemIds.indexOf(e.itemId) === -1; });
  orphans.forEach(function(exp, i) {
    var expId  = 'exp_' + exp.id;
    var saved  = state[expId];
    var pos    = saved ? { x: saved.x, y: saved.y } : defaultPos(items.length + i, items.length + orphans.length);
    var rot    = saved ? saved.rot : randRotation();
    if (!saved) {
      var s = getWbState();
      s[expId] = { x: pos.x, y: pos.y, rot: rot };
      saveWbState(s);
    }
    canvas.appendChild(createExpansionSticky(exp, pos, rot));
    maxX = Math.max(maxX, pos.x + 240);
    maxY = Math.max(maxY, pos.y + 200);
  });

  canvas.style.width  = Math.max(CANVAS_MIN_W, maxX + 200) + 'px';
  canvas.style.height = Math.max(CANVAS_MIN_H, maxY + 200) + 'px';
}

// =====================
// Export
// =====================

function exportItems() {
  var items = getItems();
  if (!items.length) {
    showToast('No items on whiteboard yet.');
    return;
  }
  var text = JSON.stringify(items, null, 2);
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function() {
      showToast('Copied! Paste to Claude and say “refresh whiteboard”');
    });
  } else {
    // Fallback
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast('Copied! Paste to Claude and say “refresh whiteboard”');
  }
}

function showToast(msg) {
  var toast = document.getElementById('wb-copy-toast');
  toast.textContent = msg;
  toast.hidden = false;
  setTimeout(function() { toast.hidden = true; }, 3500);
}

function checkEmpty() {
  var items = getItems();
  document.getElementById('wb-empty').hidden = items.length > 0;
}

// =====================
// Init
// =====================

function loadAndRender() {
  var items = getItems();
  fetch('./whiteboard-expansions.json?v=' + Date.now())
    .then(function(r) { return r.json(); })
    .then(function(data) { render(items, data.expansions || []); })
    .catch(function() { render(items, []); });
}

document.addEventListener('DOMContentLoaded', function() {
  // Pull sync first, then render
  if (typeof syncConfig !== 'undefined' && syncConfig.isReady()) {
    syncLoad(function() { loadAndRender(); });
  } else {
    loadAndRender();
  }

  document.getElementById('wb-copy-btn').addEventListener('click', exportItems);

  document.getElementById('wb-clear-btn').addEventListener('click', function() {
    if (!confirm('Remove all whiteboard items? This cannot be undone.')) return;
    saveItems([]);
    localStorage.removeItem('car-ears-wb-state');
    render([], []);
  });
});
