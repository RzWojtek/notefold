/* =========================================
   NOTEFOLD — app.js
   Pełna logika aplikacji
   ========================================= */

'use strict';

// ─── KONFIGURACJA CLOUDINARY ──────────────────────────────────────────────────
// UZUPEŁNIJ te dane po założeniu konta Cloudinary
const CLOUDINARY_CLOUD_NAME = 'TWOJ_CLOUD_NAME';
const CLOUDINARY_UPLOAD_PRESET = 'notefold_preset';

// ─── KOLORY DO NOTATEK / FOLDERÓW ────────────────────────────────────────────
const NOTE_COLORS = [
  { name: 'Domyślny',   value: '#eeeae2' },
  { name: 'Żółty',      value: '#fef9c3' },
  { name: 'Różowy',     value: '#fce7f3' },
  { name: 'Niebieski',  value: '#dbeafe' },
  { name: 'Zielony',    value: '#dcfce7' },
  { name: 'Brzoskwinia',value: '#ffedd5' },
  { name: 'Lawenda',    value: '#ede9fe' },
  { name: 'Szary',      value: '#f1f5f9' },
];

// ─── STAN APLIKACJI ──────────────────────────────────────────────────────────
let currentUser = null;
let notes = [];
let folders = [];
let currentFolder = 'all';
let currentView = 'list';   // list | grid | details
let currentSort = 'date';
let multiSelectMode = false;
let selectedNotes = new Set();
let editingNoteId = null;
let currentType = 'note';
let noteColor = NOTE_COLORS[0].value;
let folderColor = NOTE_COLORS[0].value;
let calendarDate = new Date();
let selectedCalDay = null;
let recognition = null;
let isRecording = false;

// ─── FIREBASE REFS ───────────────────────────────────────────────────────────
let db;
let notesRef;
let foldersRef;

// ─── INIT ────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  db = firebase.firestore();
  initAuth();
  initEventListeners();
  initColorPickers();
  initSpeechRecognition();
  registerServiceWorker();
});

// ─── SERVICE WORKER ──────────────────────────────────────────────────────────
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('sw.js').then(reg => {
    // Sprawdzaj aktualizacje co 60 sekund
    setInterval(() => reg.update(), 60000);

    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        // Nowy SW gotowy + stary aktywny → odśwież stronę automatycznie
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          newWorker.postMessage('skipWaiting');
        }
      });
    });
  }).catch(() => {});

  // Gdy nowy SW przejmie kontrolę → przeładuj stronę (raz)
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

// ─── AUTH ────────────────────────────────────────────────────────────────────
function initAuth() {
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      currentUser = user;
      showApp();
      initFirestoreRefs();
      loadData();
      updateUserUI();
    } else {
      currentUser = null;
      showLogin();
    }
  });
}

function initFirestoreRefs() {
  notesRef = db.collection('users').doc(currentUser.uid).collection('notes');
  foldersRef = db.collection('users').doc(currentUser.uid).collection('folders');
}

function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
}

function updateUserUI() {
  const u = currentUser;
  if (!u) return;
  const name = u.displayName || 'Użytkownik';
  const email = u.email || '';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);

  document.getElementById('user-name').textContent = name;
  document.getElementById('user-email').textContent = email;
  document.getElementById('user-avatar').textContent = initials;
  const sideAvatar = document.getElementById('sidebar-user-avatar');
  if (sideAvatar) sideAvatar.textContent = initials;
  const sideName = document.getElementById('sidebar-user-name');
  if (sideName) sideName.textContent = name;
  const sideEmail = document.getElementById('sidebar-user-email');
  if (sideEmail) sideEmail.textContent = email;
  document.getElementById('user-modal-name').textContent = name;
  document.getElementById('user-modal-email').textContent = email;

  const photoEl = document.getElementById('user-photo');
  if (u.photoURL) {
    photoEl.src = u.photoURL;
  } else {
    photoEl.src = '';
    photoEl.style.display = 'none';
  }
}

// ─── FIRESTORE LOAD ───────────────────────────────────────────────────────────
function loadData() {
  // Real-time listener na notatki
  notesRef.orderBy('createdAt', 'desc').onSnapshot(snap => {
    notes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderNotes();
    renderFolders();   // odśwież liczniki przy każdej zmianie notatek
    renderCalendar();
  });

  // Real-time listener na foldery
  foldersRef.orderBy('createdAt', 'asc').onSnapshot(snap => {
    folders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderFolders();
    updateEditorFolders();
  });
}

// ─── EVENT LISTENERS ─────────────────────────────────────────────────────────
function initEventListeners() {
  // Login
  document.getElementById('google-login-btn').addEventListener('click', googleLogin);

  // FAB
  // FAB — desktop + mobile
  document.getElementById('fab-btn-desktop')?.addEventListener('click', openNewNote);
  document.getElementById('fab-btn-mobile')?.addEventListener('click', openNewNote);

  // Bottom nav
  document.querySelectorAll('.nav-item[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.nav));
  });

  // Sidebar desktop nav
  document.querySelectorAll('.sidebar-nav-item[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.nav));
  });
  // Sidebar desktop user
  document.getElementById('sidebar-user-btn')?.addEventListener('click', () => {
    document.getElementById('user-modal-overlay').classList.remove('hidden');
  });
  // Mobile drawer
  document.getElementById('menu-btn').addEventListener('click', openSidebar);
  document.getElementById('sidebar-close').addEventListener('click', closeSidebar);
  document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);
  document.querySelectorAll('.sidebar-drawer-item[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => { navigateTo(btn.dataset.nav); closeSidebar(); });
  });

  // User button
  document.getElementById('user-btn').addEventListener('click', () => {
    document.getElementById('user-modal-overlay').classList.remove('hidden');
  });
  document.getElementById('user-modal-close').addEventListener('click', () => {
    document.getElementById('user-modal-overlay').classList.add('hidden');
  });
  // Kliknięcie tła NIE zamyka user modal

  // Logout
  document.getElementById('logout-btn').addEventListener('click', logout);
  document.getElementById('user-logout-btn').addEventListener('click', logout);

  // Editor
  document.getElementById('editor-close').addEventListener('click', closeEditor);
  // Kliknięcie tła NIE zamyka editora — tylko przyciski X i Zapisz
  document.getElementById('editor-save').addEventListener('click', saveNote);

  // Type selector
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => switchType(btn.dataset.type));
  });

  // Format toolbar
  document.querySelectorAll('.fmt-btn[data-cmd]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.execCommand(btn.dataset.cmd, false, null);
      btn.classList.toggle('active');
    });
  });
  document.getElementById('font-size-select').addEventListener('change', e => {
    document.execCommand('fontSize', false, '7');
    const els = document.querySelectorAll('#editor-content font[size="7"]');
    els.forEach(el => { el.removeAttribute('size'); el.style.fontSize = e.target.value; });
  });
  document.getElementById('font-color-input').addEventListener('input', e => {
    document.execCommand('foreColor', false, e.target.value);
  });

  // Search
  document.getElementById('search-input').addEventListener('input', e => {
    const q = e.target.value.trim();
    document.getElementById('search-clear').classList.toggle('hidden', !q);
    renderNotes();
  });
  document.getElementById('search-clear').addEventListener('click', () => {
    document.getElementById('search-input').value = '';
    document.getElementById('search-clear').classList.add('hidden');
    renderNotes();
  });

  // Sort
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSort = btn.dataset.sort;
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderNotes();
    });
  });

  // View toggle
  document.querySelectorAll('.view-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentView = btn.dataset.view;
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const container = document.getElementById('notes-container');
      container.className = 'notes-container view-' + currentView;
      renderNotes();
    });
  });

  // Multi-select
  document.getElementById('multi-select-btn').addEventListener('click', () => {
    multiSelectMode = !multiSelectMode;
    selectedNotes.clear();
    document.getElementById('multi-bar').classList.toggle('hidden', !multiSelectMode);
    document.getElementById('multi-select-btn').textContent = multiSelectMode ? 'Anuluj' : 'Zaznacz';
    renderNotes();
  });
  document.getElementById('multi-cancel-btn').addEventListener('click', () => {
    multiSelectMode = false;
    selectedNotes.clear();
    document.getElementById('multi-bar').classList.add('hidden');
    document.getElementById('multi-select-btn').textContent = 'Zaznacz';
    renderNotes();
  });
  document.getElementById('multi-delete-btn').addEventListener('click', deleteSelectedNotes);

  // Filter date
  document.getElementById('filter-date-btn').addEventListener('click', toggleDateFilter);

  // Folder modal
  document.getElementById('folder-add-btn').addEventListener('click', () => {
    document.getElementById('folder-modal-overlay').classList.remove('hidden');
  });
  document.getElementById('folder-modal-close').addEventListener('click', () => {
    document.getElementById('folder-modal-overlay').classList.add('hidden');
  });
  // Kliknięcie tła NIE zamyka folder modal
  document.getElementById('folder-save-btn').addEventListener('click', saveFolder);

  // TODO
  document.getElementById('todo-add-btn').addEventListener('click', addTodoItem);

  // Voice
  document.getElementById('voice-record-btn').addEventListener('click', toggleRecording);

  // Photo
  document.getElementById('photo-input').addEventListener('change', handlePhotoUpload);

  // Export/Import
  document.getElementById('export-btn').addEventListener('click', exportNotes);
  document.getElementById('import-input').addEventListener('change', importNotes);
}

// ─── AUTH ACTIONS ─────────────────────────────────────────────────────────────
function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider).catch(err => {
    showToast('Błąd logowania: ' + err.message);
  });
}

function logout() {
  firebase.auth().signOut().then(() => {
    notes = []; folders = [];
    document.getElementById('user-modal-overlay').classList.add('hidden');
  });
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
function navigateTo(nav) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.sidebar-nav-item').forEach(n => n.classList.remove('active'));

  const viewMap = { notes: 'view-notes', calendar: 'view-calendar', settings: 'view-settings' };
  const view = document.getElementById(viewMap[nav]);
  if (view) view.classList.add('active');

  const navBtn = document.querySelector(`.nav-item[data-nav="${nav}"]`);
  if (navBtn) navBtn.classList.add('active');
  const sideNavBtn = document.querySelector(`.sidebar-nav-item[data-nav="${nav}"]`);
  if (sideNavBtn) sideNavBtn.classList.add('active');

  document.getElementById('topbar-title').textContent = {
    notes: 'Moje notatki', calendar: 'Kalendarz', settings: 'Ustawienia'
  }[nav] || '';

  if (nav === 'calendar') renderCalendar();
}

function openSidebar() {
  const drawer = document.getElementById('sidebar-drawer');
  const overlay = document.getElementById('sidebar-overlay');
  drawer.classList.add('open');
  overlay.style.display = 'block';
}

function closeSidebar() {
  const drawer = document.getElementById('sidebar-drawer');
  const overlay = document.getElementById('sidebar-overlay');
  drawer.classList.remove('open');
  overlay.style.display = 'none';
}

// ─── COLOR PICKERS ────────────────────────────────────────────────────────────
function initColorPickers() {
  renderColorPicker('note-color-picker', 'note');
  renderColorPicker('folder-color-picker', 'folder');
}

function renderColorPicker(containerId, type) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  NOTE_COLORS.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'color-swatch' + (c.value === (type === 'note' ? noteColor : folderColor) ? ' selected' : '');
    btn.style.background = c.value;
    btn.title = c.name;
    btn.addEventListener('click', () => {
      if (type === 'note') noteColor = c.value;
      else folderColor = c.value;
      container.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      btn.classList.add('selected');
    });
    container.appendChild(btn);
  });
}

// ─── FOLDERS ──────────────────────────────────────────────────────────────────
function renderFolders() {
  const row = document.getElementById('folders-row');
  row.innerHTML = '';

  // "Wszystkie" chip
  const allChip = makeChip('Wszystkie', 'all', notes.length, NOTE_COLORS[0].value);
  row.appendChild(allChip);

  folders.forEach(f => {
    const count = notes.filter(n => n.folderId === f.id).length;
    row.appendChild(makeChip(f.name, f.id, count, f.color || NOTE_COLORS[0].value));
  });
}

function makeChip(name, id, count, color) {
  const btn = document.createElement('button');
  btn.className = 'folder-chip' + (currentFolder === id ? ' active' : '');
  btn.dataset.folder = id;
  btn.style.setProperty('--chip-color', color);
  btn.innerHTML = `${name} <span class="folder-count">${count}</span>`;
  btn.addEventListener('click', () => {
    currentFolder = id;
    document.querySelectorAll('.folder-chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    renderNotes();
  });
  return btn;
}

function updateEditorFolders() {
  const sel = document.getElementById('editor-folder-select');
  sel.innerHTML = '<option value="">Brak folderu</option>';
  folders.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.name;
    sel.appendChild(opt);
  });
}

async function saveFolder() {
  const name = document.getElementById('folder-name-input').value.trim();
  if (!name) { showToast('Wpisz nazwę folderu'); return; }

  await foldersRef.add({
    name,
    color: folderColor,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  document.getElementById('folder-name-input').value = '';
  document.getElementById('folder-modal-overlay').classList.add('hidden');
  showToast('📁 Folder dodany');
}

// ─── NOTES RENDER ─────────────────────────────────────────────────────────────
let dateFilterActive = false;

function toggleDateFilter() {
  dateFilterActive = !dateFilterActive;
  document.getElementById('filter-date-btn').textContent =
    (dateFilterActive ? 'Dzisiaj' : 'Wszystkie') + ' ▾';
  renderNotes();
}

function getFilteredNotes() {
  let filtered = [...notes];

  // Folder filter
  if (currentFolder !== 'all') {
    filtered = filtered.filter(n => n.folderId === currentFolder);
  }

  // Date filter
  if (dateFilterActive) {
    const today = new Date();
    today.setHours(0,0,0,0);
    filtered = filtered.filter(n => {
      if (!n.createdAt) return false;
      const d = n.createdAt.toDate ? n.createdAt.toDate() : new Date(n.createdAt);
      d.setHours(0,0,0,0);
      return d.getTime() === today.getTime();
    });
  }

  // Search filter
  const q = document.getElementById('search-input').value.trim().toLowerCase();
  if (q) {
    filtered = filtered.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q) ||
      (n.transcript || '').toLowerCase().includes(q)
    );
  }

  // Sort
  filtered.sort((a, b) => {
    if (currentSort === 'date') {
      const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const db2 = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return db2 - da;
    }
    if (currentSort === 'color') return (a.color || '').localeCompare(b.color || '');
    if (currentSort === 'title') return (a.title || '').localeCompare(b.title || '');
    return 0;
  });

  return filtered;
}

function renderNotes() {
  const container = document.getElementById('notes-container');
  const emptyState = document.getElementById('empty-state');
  container.className = 'notes-container view-' + currentView;

  const filtered = getFilteredNotes();

  // Remove old note cards (keep empty state)
  [...container.children].forEach(child => {
    if (!child.id || child.id !== 'empty-state') container.removeChild(child);
  });

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  filtered.forEach(note => {
    const card = buildNoteCard(note);
    container.appendChild(card);
  });
}

function buildNoteCard(note) {
  const card = document.createElement('div');
  card.className = 'note-card' + (selectedNotes.has(note.id) ? ' selected' : '');
  card.dataset.id = note.id;
  card.style.background = note.color || NOTE_COLORS[0].value;

  const typeIcon = { note: '📄', todo: '☑️', voice: '🎙️', photo: '📷' }[note.type] || '📄';
  const dateStr = note.createdAt
    ? (note.createdAt.toDate ? note.createdAt.toDate() : new Date(note.createdAt)).toLocaleDateString('pl-PL')
    : '';

  // Left section
  const left = document.createElement('div');
  left.className = 'note-left';

  if (note.type === 'todo' && note.todos?.length) {
    const done = note.todos.filter(t => t.done).length;
    const total = note.todos.length;
    const radio = document.createElement('div');
    radio.className = 'radio-btn' + (done === total ? ' filled' : '');
    left.appendChild(radio);
  } else {
    const icon = document.createElement('span');
    icon.className = 'note-type-icon';
    icon.textContent = typeIcon;
    left.appendChild(icon);
  }

  const titleWrap = document.createElement('div');
  titleWrap.style.minWidth = '0';

  const title = document.createElement('div');
  title.className = 'note-title';
  title.textContent = note.title || 'Bez tytułu';
  titleWrap.appendChild(title);

  if (currentView === 'details') {
    const preview = document.createElement('div');
    preview.className = 'note-card-preview';
    const raw = note.content ? note.content.replace(/<[^>]+>/g, '') : (note.transcript || '');
    preview.textContent = raw.slice(0, 80) + (raw.length > 80 ? '…' : '');
    titleWrap.appendChild(preview);

    const meta = document.createElement('div');
    meta.className = 'note-date';
    meta.textContent = dateStr;
    titleWrap.appendChild(meta);
  }

  left.appendChild(titleWrap);

  // Right section
  const right = document.createElement('div');
  right.className = 'note-right';

  if (note.type === 'todo' && note.todos?.length) {
    const done = note.todos.filter(t => t.done).length;
    const badge = document.createElement('span');
    badge.className = 'note-badge';
    badge.textContent = `${done}/${note.todos.length}`;
    right.appendChild(badge);
  }

  // Folder tag
  if (note.folderId) {
    const folder = folders.find(f => f.id === note.folderId);
    if (folder) {
      const tag = document.createElement('span');
      tag.className = 'note-folder-tag';
      tag.style.background = folder.color || 'var(--bg)';
      tag.textContent = '📁 ' + folder.name;
      right.appendChild(tag);
    }
  }

  if (note.color && note.color !== NOTE_COLORS[0].value) {
    const dot = document.createElement('div');
    dot.className = 'color-dot';
    dot.style.background = note.color;
    right.appendChild(dot);
  }

  const starBtn = document.createElement('button');
  starBtn.className = 'icon-btn';
  starBtn.innerHTML = `<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="${note.starred ? '#e6b800' : 'none'}" stroke="${note.starred ? '#e6b800' : 'currentColor'}"/></svg>`;
  starBtn.addEventListener('click', e => {
    e.stopPropagation();
    toggleStar(note.id, !note.starred);
  });
  right.appendChild(starBtn);

  card.appendChild(left);
  card.appendChild(right);

  // Click handler
  card.addEventListener('click', () => {
    if (multiSelectMode) {
      if (selectedNotes.has(note.id)) selectedNotes.delete(note.id);
      else selectedNotes.add(note.id);
      document.getElementById('multi-count').textContent = `${selectedNotes.size} zaznaczonych`;
      card.classList.toggle('selected', selectedNotes.has(note.id));
    } else {
      openEditNote(note);
    }
  });

  return card;
}

// ─── NOTE EDITOR ──────────────────────────────────────────────────────────────
function openNewNote() {
  editingNoteId = null;
  currentType = 'note';
  noteColor = NOTE_COLORS[0].value;

  document.getElementById('editor-title-label').textContent = 'Nowa notatka';
  document.getElementById('editor-note-title').value = '';
  document.getElementById('editor-content').innerHTML = '';
  document.getElementById('todo-list').innerHTML = '';
  document.getElementById('voice-transcript').textContent = '';
  document.getElementById('voice-status').textContent = '';
  document.getElementById('photo-preview').innerHTML = '';
  document.getElementById('editor-folder-select').value = '';

  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('editor-date').value = now.toISOString().slice(0,16);

  switchType('note');
  renderColorPicker('note-color-picker', 'note');

  document.getElementById('editor-overlay').classList.remove('hidden');
}

function openEditNote(note) {
  editingNoteId = note.id;
  currentType = note.type || 'note';
  noteColor = note.color || NOTE_COLORS[0].value;

  document.getElementById('editor-title-label').textContent = 'Edytuj notatkę';
  document.getElementById('editor-note-title').value = note.title || '';
  document.getElementById('editor-content').innerHTML = note.content || '';
  document.getElementById('editor-folder-select').value = note.folderId || '';

  if (note.date) {
    const d = new Date(note.date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    document.getElementById('editor-date').value = d.toISOString().slice(0,16);
  }

  // TODO
  const todoList = document.getElementById('todo-list');
  todoList.innerHTML = '';
  if (note.todos) {
    note.todos.forEach(t => addTodoItemData(t.text, t.done));
  }

  // Voice
  document.getElementById('voice-transcript').textContent = note.transcript || '';
  document.getElementById('voice-status').textContent = '';

  // Photo
  const prev = document.getElementById('photo-preview');
  prev.innerHTML = '';
  if (note.photos) {
    note.photos.forEach(url => {
      const img = document.createElement('img');
      img.src = url;
      prev.appendChild(img);
    });
  }

  switchType(currentType);
  renderColorPicker('note-color-picker', 'note');

  document.getElementById('editor-overlay').classList.remove('hidden');
}

function closeEditor() {
  document.getElementById('editor-overlay').classList.add('hidden');
  if (isRecording) toggleRecording();
}

function switchType(type) {
  currentType = type;
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.type-btn[data-type="${type}"]`)?.classList.add('active');

  document.querySelectorAll('.editor-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + type)?.classList.add('active');

  // Show format toolbar only for text notes
  document.getElementById('format-toolbar').style.display = type === 'note' ? 'flex' : 'none';
}

async function saveNote() {
  const title = document.getElementById('editor-note-title').value.trim() || 'Bez tytułu';
  const folderId = document.getElementById('editor-folder-select').value || '';
  const dateVal = document.getElementById('editor-date').value;
  const date = dateVal ? new Date(dateVal).toISOString() : new Date().toISOString();

  const data = {
    title,
    type: currentType,
    color: noteColor,
    folderId,
    date,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (currentType === 'note') {
    data.content = document.getElementById('editor-content').innerHTML;
  }
  if (currentType === 'todo') {
    data.todos = getTodoItems();
  }
  if (currentType === 'voice') {
    data.transcript = document.getElementById('voice-transcript').textContent;
    data.content = data.transcript;
  }
  if (currentType === 'photo') {
    // photos already saved via Cloudinary, store urls from preview
    const imgs = document.querySelectorAll('#photo-preview img');
    data.photos = [...imgs].map(i => i.src);
  }

  if (editingNoteId) {
    await notesRef.doc(editingNoteId).update(data);
    showToast('✅ Notatka zaktualizowana');
  } else {
    data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    data.starred = false;
    await notesRef.add(data);
    showToast('✅ Notatka dodana');
  }

  closeEditor();
}

async function toggleStar(id, val) {
  await notesRef.doc(id).update({ starred: val });
}

async function deleteNote(id) {
  await notesRef.doc(id).delete();
  showToast('🗑️ Notatka usunięta');
}

async function deleteSelectedNotes() {
  if (selectedNotes.size === 0) return;
  const batch = db.batch();
  selectedNotes.forEach(id => batch.delete(notesRef.doc(id)));
  await batch.commit();
  selectedNotes.clear();
  multiSelectMode = false;
  document.getElementById('multi-bar').classList.add('hidden');
  document.getElementById('multi-select-btn').textContent = 'Zaznacz';
  showToast(`🗑️ Usunięto ${selectedNotes.size} notatek`);
}

// ─── TODO ─────────────────────────────────────────────────────────────────────
function addTodoItem() {
  addTodoItemData('', false);
  // Focus last input
  const inputs = document.querySelectorAll('.todo-input');
  if (inputs.length) inputs[inputs.length - 1].focus();
}

function addTodoItemData(text, done) {
  const list = document.getElementById('todo-list');
  const item = document.createElement('div');
  item.className = 'todo-item';

  const check = document.createElement('button');
  check.className = 'todo-check' + (done ? ' done' : '');
  check.textContent = done ? '✓' : '';
  check.addEventListener('click', () => {
    const isDone = check.classList.toggle('done');
    check.textContent = isDone ? '✓' : '';
    input.classList.toggle('done', isDone);
  });

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'todo-input' + (done ? ' done' : '');
  input.value = text;
  input.placeholder = 'Pozycja listy…';

  const remove = document.createElement('button');
  remove.className = 'todo-remove';
  remove.textContent = '×';
  remove.addEventListener('click', () => item.remove());

  item.appendChild(check);
  item.appendChild(input);
  item.appendChild(remove);
  list.appendChild(item);
}

function getTodoItems() {
  const items = [];
  document.querySelectorAll('.todo-item').forEach(item => {
    const text = item.querySelector('.todo-input').value.trim();
    const done = item.querySelector('.todo-check').classList.contains('done');
    if (text) items.push({ text, done });
  });
  return items;
}

// ─── VOICE RECORDING ─────────────────────────────────────────────────────────
function initSpeechRecognition() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) return;

  recognition = new SpeechRec();
  recognition.lang = 'pl-PL';
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = e => {
    let interim = '', final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) final += t;
      else interim += t;
    }
    const el = document.getElementById('voice-transcript');
    const existing = el.dataset.final || '';
    el.dataset.final = existing + final;
    el.textContent = existing + final + (interim ? ' ' + interim : '');
  };

  recognition.onerror = e => {
    document.getElementById('voice-status').textContent = 'Błąd: ' + e.error;
    stopRecording();
  };

  recognition.onend = () => {
    if (isRecording) recognition.start();
  };
}

function toggleRecording() {
  if (!recognition) {
    showToast('Przeglądarka nie obsługuje dyktowania');
    return;
  }
  if (isRecording) stopRecording();
  else startRecording();
}

function startRecording() {
  isRecording = true;
  const btn = document.getElementById('voice-record-btn');
  btn.classList.add('recording');
  document.getElementById('voice-btn-label').textContent = 'Zatrzymaj';
  document.getElementById('voice-status').textContent = '🔴 Nagrywanie…';
  document.getElementById('voice-transcript').dataset.final = '';
  recognition.start();
}

function stopRecording() {
  isRecording = false;
  const btn = document.getElementById('voice-record-btn');
  btn.classList.remove('recording');
  document.getElementById('voice-btn-label').textContent = 'Nagraj';
  document.getElementById('voice-status').textContent = '';
  recognition.stop();
}

// ─── PHOTO UPLOAD (CLOUDINARY) ───────────────────────────────────────────────
async function handlePhotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  document.getElementById('photo-uploading').classList.remove('hidden');

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    if (data.secure_url) {
      const img = document.createElement('img');
      img.src = data.secure_url;
      document.getElementById('photo-preview').appendChild(img);
      showToast('📷 Zdjęcie przesłane');
    } else {
      showToast('Błąd przesyłania zdjęcia');
    }
  } catch (err) {
    showToast('Błąd: ' + err.message);
  } finally {
    document.getElementById('photo-uploading').classList.add('hidden');
    e.target.value = '';
  }
}

// ─── CALENDAR ─────────────────────────────────────────────────────────────────
function renderCalendar() {
  const wrap = document.getElementById('calendar-wrap');
  if (!wrap) return;

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const today = new Date();

  const dayNames = ['Pn','Wt','Śr','Cz','Pt','Sb','Nd'];
  const monthNames = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];

  // Dates with notes
  const noteDates = new Set(
    notes
      .filter(n => n.createdAt)
      .map(n => {
        const d = n.createdAt.toDate ? n.createdAt.toDate() : new Date(n.createdAt);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
  );

  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  wrap.innerHTML = `
    <div class="cal-header">
      <button class="cal-nav" id="cal-prev">‹</button>
      <span class="cal-title">${monthNames[month]} ${year}</span>
      <button class="cal-nav" id="cal-next">›</button>
    </div>
    <div class="calendar-grid" id="cal-grid"></div>
  `;

  document.getElementById('cal-prev').addEventListener('click', () => {
    calendarDate = new Date(year, month - 1, 1);
    renderCalendar();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    calendarDate = new Date(year, month + 1, 1);
    renderCalendar();
  });

  const grid = document.getElementById('cal-grid');
  dayNames.forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-day-name';
    el.textContent = d;
    grid.appendChild(el);
  });

  for (let i = 0; i < startOffset; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day empty';
    grid.appendChild(el);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${month}-${d}`;
    const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const hasNotes = noteDates.has(key);
    const isSelected = selectedCalDay === key;

    const el = document.createElement('div');
    el.className = 'cal-day' + (isToday ? ' today' : '') + (hasNotes ? ' has-notes' : '') + (isSelected ? ' selected' : '');
    el.textContent = d;
    el.addEventListener('click', () => {
      selectedCalDay = key;
      renderCalendar();
      renderCalendarNotes(year, month, d);
    });
    grid.appendChild(el);
  }

  if (selectedCalDay) {
    const [y, m, day] = selectedCalDay.split('-').map(Number);
    renderCalendarNotes(y, m, day);
  }
}

function renderCalendarNotes(year, month, day) {
  const container = document.getElementById('calendar-notes');
  container.innerHTML = `<div class="calendar-notes-title">Notatki z ${day}.${String(month+1).padStart(2,'0')}.${year}</div>`;

  const dayNotes = notes.filter(n => {
    if (!n.createdAt) return false;
    const d = n.createdAt.toDate ? n.createdAt.toDate() : new Date(n.createdAt);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  });

  if (dayNotes.length === 0) {
    container.innerHTML += '<div class="empty-state" style="padding:24px"><p>Brak notatek w tym dniu</p></div>';
    return;
  }

  dayNotes.forEach(note => {
    const card = buildNoteCard(note);
    container.appendChild(card);
  });
}

// ─── EXPORT / IMPORT ──────────────────────────────────────────────────────────
function exportNotes() {
  const data = {
    exportDate: new Date().toISOString(),
    userId: currentUser.uid,
    notes,
    folders
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `notefold-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  showToast('📦 Eksport gotowy');
}

async function importNotes(e) {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data.notes) { showToast('Nieprawidłowy plik'); return; }

    const batch = db.batch();
    data.notes.forEach(note => {
      const { id, ...rest } = note;
      rest.importedAt = firebase.firestore.FieldValue.serverTimestamp();
      rest.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      batch.set(notesRef.doc(), rest);
    });
    if (data.folders) {
      data.folders.forEach(folder => {
        const { id, ...rest } = folder;
        rest.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        batch.set(foldersRef.doc(), rest);
      });
    }
    await batch.commit();
    showToast(`✅ Zaimportowano ${data.notes.length} notatek`);
  } catch (err) {
    showToast('Błąd importu: ' + err.message);
  } finally {
    e.target.value = '';
  }
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden', 'fade');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.add('fade');
    setTimeout(() => el.classList.add('hidden'), 400);
  }, 2400);
}
