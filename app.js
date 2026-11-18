/* FlashNotes — app.js
 * Sections: 1. Storage  2. Logic  3. UI state and rendering  4. Events and init
 * Logic functions never touch the DOM or localStorage, so tests.js can call them.
 */

/* ===================== 1. Storage ===================== */

var STORAGE_KEY = 'flashnotes.sets';

// Returns an array of sets. Never throws: missing or bad data gives [].
function loadSets() {
  var raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    return [];
  }
  if (!raw) return [];
  var data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data
    .filter(function (s) { return s && typeof s === 'object' && typeof s.id === 'string'; })
    .map(function (s) {
      var cards = Array.isArray(s.cards) ? s.cards : [];
      return {
        id: s.id,
        name: typeof s.name === 'string' ? s.name : '',
        createdAt: typeof s.createdAt === 'number' ? s.createdAt : 0,
        cards: cards
          .filter(function (c) { return c && typeof c === 'object'; })
          .map(function (c) {
            return {
              id: typeof c.id === 'string' ? c.id : newId('c_'),
              front: typeof c.front === 'string' ? c.front : '',
              back: typeof c.back === 'string' ? c.back : ''
            };
          })
      };
    });
}

// Stores the full array of sets. Returns true on success, false if storage failed.
function saveSets(sets) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
    return true;
  } catch (e) {
    return false;
  }
}

/* ===================== 2. Logic ===================== */

var idCounter = 0;

// Unique id: prefix + time + counter + random suffix (safe within one millisecond).
function newId(prefix) {
  idCounter += 1;
  return prefix + Date.now().toString(36) + idCounter.toString(36) +
    Math.random().toString(36).slice(2, 7);
}

// draft: { name, cards: [{ front, back }] }
// Returns { ok: true, value: { name, cards } } or { ok: false, errors: [{ field, row?, message }] }.
// field is 'name', 'card' (with row = index into draft.cards) or 'cards'.
function validateSet(draft) {
  var errors = [];
  var name = String((draft && draft.name) || '').trim();
  if (!name) errors.push({ field: 'name', message: 'Set name is required.' });

  var rows = (draft && Array.isArray(draft.cards)) ? draft.cards : [];
  var cards = [];
  rows.forEach(function (row, i) {
    var front = String((row && row.front) || '').trim();
    var back = String((row && row.back) || '').trim();
    if (!front && !back) return; // blank row: ignored
    if (!front || !back) {
      errors.push({
        field: 'card',
        row: i,
        message: 'Card ' + (i + 1) + ' needs both a front and a back.'
      });
      return;
    }
    var card = { front: front, back: back };
    if (row && typeof row.id === 'string') card.id = row.id;
    cards.push(card);
  });

  var hasRowErrors = errors.some(function (e) { return e.field === 'card'; });
  if (cards.length === 0 && !hasRowErrors) {
    errors.push({ field: 'cards', message: 'Add at least one card with a front and a back.' });
  }

  if (errors.length) return { ok: false, errors: errors };
  return { ok: true, value: { name: name, cards: cards } };
}

// Validates a draft and builds a new set. Returns { ok, value: set } or { ok: false, errors }.
function createSet(draft, now) {
  var result = validateSet(draft);
  if (!result.ok) return result;
  var set = {
    id: newId('s_'),
    name: result.value.name,
    createdAt: typeof now === 'number' ? now : Date.now(),
    cards: result.value.cards.map(function (c) {
      return { id: newId('c_'), front: c.front, back: c.back };
    })
  };
  return { ok: true, value: set };
}

// Returns a new array with the set added.
function addSet(sets, set) {
  return sets.concat([set]);
}

// Returns a new array without the set whose id matches.
function deleteSet(sets, id) {
  return sets.filter(function (s) { return s.id !== id; });
}

// Returns a new array sorted newest first.
function sortNewestFirst(sets) {
  return sets.slice().sort(function (a, b) { return b.createdAt - a.createdAt; });
}

function cardCountLabel(n) {
  return n + (n === 1 ? ' card' : ' cards');
}

/* ===================== 3. UI state and rendering ===================== */

var state = {
  view: 'home',
  sets: []
};

function showView(name) {
  state.view = name;
  var views = document.querySelectorAll('[data-view]');
  for (var i = 0; i < views.length; i++) {
    views[i].hidden = views[i].getAttribute('data-view') !== name;
  }
}

function renderHome() {
  var list = document.getElementById('set-list');
  var empty = document.getElementById('empty-msg');
  list.textContent = '';
  var sets = sortNewestFirst(state.sets);
  empty.hidden = sets.length > 0;

  sets.forEach(function (set) {
    var li = document.createElement('li');
    li.className = 'set-row';

    var info = document.createElement('div');
    info.className = 'set-info';
    var name = document.createElement('span');
    name.className = 'set-name';
    name.textContent = set.name;
    var count = document.createElement('span');
    count.className = 'set-count';
    count.textContent = cardCountLabel(set.cards.length);
    info.appendChild(name);
    info.appendChild(count);

    var actions = document.createElement('div');
    actions.className = 'set-actions';
    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'danger';
    del.textContent = 'Delete';
    del.addEventListener('click', function () { onDeleteSet(set); });
    actions.appendChild(del);

    li.appendChild(info);
    li.appendChild(actions);
    list.appendChild(li);
  });
}

function makeCardRow(card) {
  var row = document.createElement('div');
  row.className = 'card-row';

  var front = document.createElement('textarea');
  front.className = 'card-front';
  front.placeholder = 'Front';
  front.setAttribute('aria-label', 'Front');
  front.rows = 2;
  front.value = (card && card.front) || '';

  var back = document.createElement('textarea');
  back.className = 'card-back';
  back.placeholder = 'Back';
  back.setAttribute('aria-label', 'Back');
  back.rows = 2;
  back.value = (card && card.back) || '';

  var remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'remove-card';
  remove.textContent = 'Remove';
  remove.addEventListener('click', function () {
    row.parentNode.removeChild(row);
  });

  row.appendChild(front);
  row.appendChild(back);
  row.appendChild(remove);
  return row;
}

function renderCreate() {
  document.getElementById('set-name').value = '';
  var rows = document.getElementById('card-rows');
  rows.textContent = '';
  for (var i = 0; i < 3; i++) rows.appendChild(makeCardRow());
  clearFormErrors();
}

function readDraft() {
  var rows = document.querySelectorAll('#card-rows .card-row');
  var cards = [];
  for (var i = 0; i < rows.length; i++) {
    cards.push({
      front: rows[i].querySelector('.card-front').value,
      back: rows[i].querySelector('.card-back').value
    });
  }
  return { name: document.getElementById('set-name').value, cards: cards };
}

function clearFormErrors() {
  var box = document.getElementById('form-errors');
  box.textContent = '';
  box.hidden = true;
  document.getElementById('set-name').classList.remove('invalid');
  var rows = document.querySelectorAll('#card-rows .card-row');
  for (var i = 0; i < rows.length; i++) rows[i].classList.remove('invalid');
}

function showFormErrors(errors) {
  clearFormErrors();
  var box = document.getElementById('form-errors');
  var ul = document.createElement('ul');
  var rows = document.querySelectorAll('#card-rows .card-row');
  errors.forEach(function (err) {
    var li = document.createElement('li');
    li.textContent = err.message;
    ul.appendChild(li);
    if (err.field === 'name') document.getElementById('set-name').classList.add('invalid');
    if (err.field === 'card' && rows[err.row]) rows[err.row].classList.add('invalid');
  });
  box.appendChild(ul);
  box.hidden = false;
}

/* ===================== 4. Events and init ===================== */

function goHome() {
  state.sets = loadSets();
  renderHome();
  showView('home');
}

function onNewSet() {
  renderCreate();
  showView('create');
  document.getElementById('set-name').focus();
}

function onAddCard() {
  var row = makeCardRow();
  document.getElementById('card-rows').appendChild(row);
  row.querySelector('.card-front').focus();
}

function onSaveSet(event) {
  event.preventDefault();
  var result = createSet(readDraft());
  if (!result.ok) {
    showFormErrors(result.errors);
    return;
  }
  var sets = addSet(loadSets(), result.value);
  if (!saveSets(sets)) {
    showFormErrors([{ field: 'storage', message: 'Could not save: browser storage is unavailable.' }]);
    return;
  }
  goHome();
}

function onDeleteSet(set) {
  if (!confirm("Delete '" + set.name + "'? This can't be undone.")) return;
  saveSets(deleteSet(loadSets(), set.id));
  goHome();
}

function init() {
  document.getElementById('new-set-btn').addEventListener('click', onNewSet);
  document.getElementById('add-card-btn').addEventListener('click', onAddCard);
  document.getElementById('create-form').addEventListener('submit', onSaveSet);
  document.getElementById('cancel-create-btn').addEventListener('click', goHome);
  goHome();
}

if (typeof document !== 'undefined' && document.getElementById('app')) {
  init();
}
