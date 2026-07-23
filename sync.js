// Car Ears — GitHub Gist sync
// Both users store the same Gist ID + a GitHub PAT (gist scope) once.
// All app data lives in one JSON file inside the Gist.
// Pull on page load; push (debounced) on every save.

var SYNC_FILE = 'car-ears-data.json';

var syncConfig = {
  get: function() {
    return {
      pat:    localStorage.getItem('car-ears-sync-pat')   || '',
      gistId: localStorage.getItem('car-ears-sync-gist')  || '',
    };
  },
  set: function(pat, gistId) {
    localStorage.setItem('car-ears-sync-pat',  pat.trim());
    localStorage.setItem('car-ears-sync-gist', gistId.trim());
  },
  isReady: function() {
    var c = this.get();
    return !!(c.pat && c.gistId);
  },
};

function gistHeaders() {
  return {
    'Authorization': 'token ' + syncConfig.get().pat,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

// Pull all data from Gist. Returns parsed object or null.
function syncPull() {
  if (!syncConfig.isReady()) return Promise.resolve(null);
  var c = syncConfig.get();
  return fetch('https://api.github.com/gists/' + c.gistId, { headers: gistHeaders() })
    .then(function(r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then(function(data) {
      var file = data.files && data.files[SYNC_FILE];
      if (!file || !file.content) return null;
      return JSON.parse(file.content);
    })
    .catch(function(err) {
      console.warn('[sync] pull failed:', err.message);
      return null;
    });
}

// Push full data snapshot to Gist.
function syncPush(payload) {
  if (!syncConfig.isReady()) return Promise.resolve();
  var c = syncConfig.get();
  payload.updated = new Date().toISOString();
  return fetch('https://api.github.com/gists/' + c.gistId, {
    method: 'PATCH',
    headers: gistHeaders(),
    body: JSON.stringify({
      files: { [SYNC_FILE]: { content: JSON.stringify(payload, null, 2) } }
    }),
  })
  .then(function(r) {
    if (!r.ok) throw new Error(r.status);
  })
  .catch(function(err) {
    console.warn('[sync] push failed:', err.message);
  });
}

// Merge whiteboard items: union by id (gist wins on conflict)
function mergeItems(local, remote) {
  var byId = {};
  (local  || []).forEach(function(i) { byId[i.id] = i; });
  (remote || []).forEach(function(i) { byId[i.id] = i; }); // gist overwrites
  return Object.values ? Object.values(byId) : Object.keys(byId).map(function(k) { return byId[k]; });
}

// =====================
// Full snapshot builders (called by each page to build payload before push)
// =====================

function buildSnapshot() {
  var snap = {};
  snap.v = 1;

  // Notepads
  snap.notepads = {};
  [1, 2].forEach(function(id) {
    snap.notepads[id] = {
      label:   localStorage.getItem('car-ears-' + id + '-label')   || '',
      content: localStorage.getItem('car-ears-' + id + '-content') || '',
      accent:  localStorage.getItem('car-ears-' + id + '-accent')  || '',
    };
  });

  // Whiteboard items (merged)
  try { snap.whiteboardItems = JSON.parse(localStorage.getItem('car-ears-whiteboard-items') || '[]'); }
  catch(e) { snap.whiteboardItems = []; }

  // Whiteboard state (positions/rotations) — local only, not critical to sync
  // (each user can have their own layout)

  // Cover stickers per book
  snap.coverStickers = {};
  [1, 2].forEach(function(id) {
    try { snap.coverStickers[id] = JSON.parse(localStorage.getItem('car-ears-' + id + '-stickers') || '[]'); }
    catch(e) { snap.coverStickers[id] = []; }
  });

  // Custom sticker library
  try { snap.customStickers = JSON.parse(localStorage.getItem('car-ears-custom-stickers') || '[]'); }
  catch(e) { snap.customStickers = []; }

  return snap;
}

// Apply a snapshot from Gist into localStorage, merging where needed
function applySnapshot(snap) {
  if (!snap) return;

  // Notepads — gist wins
  if (snap.notepads) {
    [1, 2].forEach(function(id) {
      var n = snap.notepads[id];
      if (!n) return;
      if (n.label)   localStorage.setItem('car-ears-' + id + '-label',   n.label);
      if (n.content !== undefined) localStorage.setItem('car-ears-' + id + '-content', n.content);
      if (n.accent)  localStorage.setItem('car-ears-' + id + '-accent',  n.accent);
    });
  }

  // Whiteboard items — merge (union by id)
  if (snap.whiteboardItems) {
    var local = [];
    try { local = JSON.parse(localStorage.getItem('car-ears-whiteboard-items') || '[]'); } catch(e) {}
    var merged = mergeItems(local, snap.whiteboardItems);
    localStorage.setItem('car-ears-whiteboard-items', JSON.stringify(merged));
  }

  // Cover stickers — gist wins
  if (snap.coverStickers) {
    [1, 2].forEach(function(id) {
      if (snap.coverStickers[id] !== undefined) {
        localStorage.setItem('car-ears-' + id + '-stickers', JSON.stringify(snap.coverStickers[id]));
      }
    });
  }

  // Custom stickers — merge (gist wins for duplicates)
  if (snap.customStickers && snap.customStickers.length) {
    localStorage.setItem('car-ears-custom-stickers', JSON.stringify(snap.customStickers));
  }
}

// Debounce helper
function debounce(fn, ms) {
  var t = null;
  return function() {
    clearTimeout(t);
    t = setTimeout(fn, ms);
  };
}

// Convenience: pull → apply → callback
function syncLoad(cb) {
  syncPull().then(function(snap) {
    if (snap) applySnapshot(snap);
    if (cb) cb(snap);
  });
}

// Convenience: build snapshot → push
function syncSave() {
  syncPush(buildSnapshot());
}

var debouncedSave = debounce(syncSave, 4000);
