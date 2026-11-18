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

// Returns a new array sorted newest first. Sets with the same createdAt keep
// reverse storage order (addSet appends, so later in the array = newer).
function sortNewestFirst(sets) {
  return sets
    .map(function (s, i) { return { set: s, i: i }; })
    .sort(function (a, b) { return (b.set.createdAt - a.set.createdAt) || (b.i - a.i); })
    .map(function (x) { return x.set; });
}

function cardCountLabel(n) {
  return n + (n === 1 ? ' card' : ' cards');
}

// Returns the set with this id, or null.
function findSet(sets, id) {
  for (var i = 0; i < sets.length; i++) {
    if (sets[i].id === id) return sets[i];
  }
  return null;
}

/* --- Study session: { name, cards, index, flipped } (memory only) --- */

function startStudy(set) {
  return { name: set.name, cards: set.cards.slice(), index: 0, flipped: false };
}

function studyFlip(session) {
  return { name: session.name, cards: session.cards, index: session.index, flipped: !session.flipped };
}

// Moves to index + step if that stays in bounds; moving always shows the front.
function studyMove(session, step) {
  var next = session.index + step;
  if (next < 0 || next >= session.cards.length) return studyCopy(session);
  return { name: session.name, cards: session.cards, index: next, flipped: false };
}

function studyNext(session) { return studyMove(session, 1); }
function studyPrev(session) { return studyMove(session, -1); }

function studyCopy(session) {
  return { name: session.name, cards: session.cards, index: session.index, flipped: session.flipped };
}

/* --- Test session: { side, cards, index, revealed, results } (memory only, ADR 0003) --- */

// Fisher–Yates shuffle. Returns a new array; the input is not changed.
function shuffle(arr, rand) {
  rand = rand || Math.random;
  var out = arr.slice();
  for (var i = out.length - 1; i > 0; i--) {
    var j = Math.floor(rand() * (i + 1));
    var tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

// side 'front': show the front, answer with the back. side 'back': the reverse.
function cardSides(card, side) {
  return side === 'back'
    ? { prompt: card.back, answer: card.front }
    : { prompt: card.front, answer: card.back };
}

function startTest(cards, side, rand) {
  return {
    side: side === 'back' ? 'back' : 'front',
    cards: shuffle(cards, rand),
    index: 0,
    revealed: false,
    results: []
  };
}

function isTestDone(session) {
  return session.index >= session.cards.length;
}

function testCopy(session, changes) {
  var out = {
    side: session.side,
    cards: session.cards,
    index: session.index,
    revealed: session.revealed,
    results: session.results
  };
  for (var k in changes) out[k] = changes[k];
  return out;
}

function revealAnswer(session) {
  if (isTestDone(session)) return testCopy(session, {});
  return testCopy(session, { revealed: true });
}

// Records a grade for the current card and moves on. Ignored until the answer is
// revealed, and after the last card, so a card can never be graded twice.
function gradeCard(session, gotIt) {
  if (isTestDone(session) || !session.revealed) return testCopy(session, {});
  var card = session.cards[session.index];
  return testCopy(session, {
    index: session.index + 1,
    revealed: false,
    results: session.results.concat([{ card: card, gotIt: !!gotIt }])
  });
}

// What the Test view should show for this session.
function testView(session) {
  var card = session.cards[session.index];
  var sides = card ? cardSides(card, session.side) : { prompt: '', answer: '' };
  return {
    prompt: sides.prompt,
    answer: sides.answer,
    promptLabel: session.side === 'back' ? 'Back' : 'Front',
    answerLabel: session.side === 'back' ? 'Front' : 'Back',
    position: 'Card ' + Math.min(session.index + 1, session.cards.length) + ' of ' + session.cards.length,
    revealed: session.revealed
  };
}

function testScore(session) {
  var total = session.results.length;
  var correct = session.results.filter(function (r) { return r.gotIt; }).length;
  return { correct: correct, total: total, percent: total ? Math.round((correct / total) * 100) : 0 };
}

function formatScore(score) {
  return score.correct + ' / ' + score.total + ' (' + score.percent + '%)';
}

function missedCards(session) {
  return session.results
    .filter(function (r) { return !r.gotIt; })
    .map(function (r) { return r.card; });
}

// A new test with only the missed cards, same side, reshuffled.
function retryMissed(session, rand) {
  return startTest(missedCards(session), session.side, rand);
}

// What the Study view should show for this session.
function studyView(session) {
  var total = session.cards.length;
  var card = session.cards[session.index];
  return {
    text: card ? (session.flipped ? card.back : card.front) : '',
    side: session.flipped ? 'Back' : 'Front',
    position: 'Card ' + (total ? session.index + 1 : 0) + ' of ' + total,
    canPrev: session.index > 0,
    canNext: session.index < total - 1
  };
}

/* ===================== 3. UI state and rendering ===================== */

var state = {
  view: 'home',
  sets: [],
  study: null,
  testSet: null, // { id, name, cards } of the set being tested
  test: null     // current test session
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
    var study = document.createElement('button');
    study.type = 'button';
    study.className = 'primary';
    study.textContent = 'Study';
    study.addEventListener('click', function () { onStudySet(set.id); });
    actions.appendChild(study);
    var testBtn = document.createElement('button');
    testBtn.type = 'button';
    testBtn.textContent = 'Test';
    testBtn.addEventListener('click', function () { onTestSet(set.id); });
    actions.appendChild(testBtn);
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

function renderStudy(animate) {
  var view = studyView(state.study);
  document.getElementById('study-title').textContent = state.study.name;
  document.getElementById('study-side').textContent = view.side;
  document.getElementById('study-text').textContent = view.text;
  document.getElementById('study-position').textContent = view.position;
  document.getElementById('study-prev-btn').disabled = !view.canPrev;
  document.getElementById('study-next-btn').disabled = !view.canNext;

  var card = document.getElementById('study-card');
  card.setAttribute('aria-label', view.side + ' of card. Activate to flip.');
  card.scrollTop = 0;
  card.classList.remove('flip');
  if (animate) {
    void card.offsetWidth; // restart the animation
    card.classList.add('flip');
  }
}

function renderTestSetup() {
  document.getElementById('setup-title').textContent = state.testSet.name;
  document.getElementById('side-front').checked = true;
}

function renderTest() {
  var view = testView(state.test);
  document.getElementById('test-title').textContent = state.testSet.name;
  document.getElementById('test-position').textContent = view.position;
  document.getElementById('test-prompt-label').textContent = view.promptLabel;
  document.getElementById('test-prompt').textContent = view.prompt;
  document.getElementById('test-answer-label').textContent = view.answerLabel;
  document.getElementById('test-answer').textContent = view.answer;
  document.getElementById('test-answer-box').hidden = !view.revealed;
  document.getElementById('reveal-btn').hidden = view.revealed;
  document.getElementById('grade-buttons').hidden = !view.revealed;
}

function renderResults() {
  var score = testScore(state.test);
  var missed = missedCards(state.test);
  document.getElementById('results-title').textContent = state.testSet.name;
  document.getElementById('results-score').textContent = formatScore(score);

  var list = document.getElementById('missed-list');
  list.textContent = '';
  missed.forEach(function (card) {
    var li = document.createElement('li');
    li.className = 'missed-card';
    var front = document.createElement('div');
    var fl = document.createElement('span');
    fl.className = 'side-tag';
    fl.textContent = 'Front';
    var ft = document.createElement('span');
    ft.className = 'missed-text';
    ft.textContent = card.front;
    front.appendChild(fl);
    front.appendChild(ft);
    var back = document.createElement('div');
    var bl = document.createElement('span');
    bl.className = 'side-tag';
    bl.textContent = 'Back';
    var bt = document.createElement('span');
    bt.className = 'missed-text';
    bt.textContent = card.back;
    back.appendChild(bl);
    back.appendChild(bt);
    li.appendChild(front);
    li.appendChild(back);
    list.appendChild(li);
  });
  document.getElementById('missed-section').hidden = missed.length === 0;
  document.getElementById('all-correct-msg').hidden = missed.length > 0;

  var retry = document.getElementById('retry-missed-btn');
  retry.textContent = 'Retry missed (' + missed.length + ')';
  retry.hidden = missed.length === 0;
}

/* ===================== 4. Events and init ===================== */

function onTestSet(id) {
  var set = findSet(loadSets(), id);
  if (!set) { goHome(); return; }
  state.testSet = { id: set.id, name: set.name, cards: set.cards.slice() };
  state.test = null;
  renderTestSetup();
  showView('test-setup');
}

function beginTest(session) {
  state.test = session;
  renderTest();
  showView('test');
  document.getElementById('reveal-btn').focus();
}

function onStartTest() {
  var side = document.getElementById('side-back').checked ? 'back' : 'front';
  beginTest(startTest(state.testSet.cards, side));
}

function onReveal() {
  state.test = revealAnswer(state.test);
  renderTest();
  // Don't move focus to a grade button: grading happens only by clicking
  // Got it / Missed it or pressing 1 / 2, never by a stray Enter.
  if (document.activeElement) document.activeElement.blur();
}

function onGrade(gotIt) {
  if (!state.test.revealed) return;
  state.test = gradeCard(state.test, gotIt);
  if (isTestDone(state.test)) {
    renderResults();
    showView('results');
    return;
  }
  renderTest();
  document.getElementById('reveal-btn').focus();
}

function onQuitTest() {
  if (!confirm('Quit this test? Your progress will be lost.')) return;
  state.test = null;
  goHome();
}

function onRetryMissed() {
  beginTest(retryMissed(state.test));
}

function onTestAgain() {
  beginTest(startTest(state.testSet.cards, state.test.side));
}

function onStudySet(id) {
  var set = findSet(loadSets(), id);
  if (!set) { goHome(); return; }
  state.study = startStudy(set);
  renderStudy(false);
  showView('study');
  document.getElementById('study-card').focus();
}

function onStudyFlip() {
  state.study = studyFlip(state.study);
  renderStudy(true);
}

function onStudyNext() {
  state.study = studyNext(state.study);
  renderStudy(false);
}

function onStudyPrev() {
  state.study = studyPrev(state.study);
  renderStudy(false);
}

function isSpace(event) {
  return event.key === ' ' || event.key === 'Spacebar';
}

function onKeyDown(event) {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (state.view === 'study') onStudyKey(event);
  else if (state.view === 'test') onTestKey(event);
}

function onTestKey(event) {
  if (isSpace(event)) {
    event.preventDefault(); // no page scroll
    // A focused button would also be "clicked" by Space on keyup; release it first.
    if (document.activeElement) document.activeElement.blur();
    if (!event.repeat && !state.test.revealed) onReveal();
  } else if (event.key === '1' || event.key === '2') {
    if (event.repeat || !state.test.revealed) return;
    event.preventDefault();
    onGrade(event.key === '1');
  }
}

function onStudyKey(event) {
  var card = document.getElementById('study-card');
  if (isSpace(event)) {
    event.preventDefault(); // no page scroll
    // A focused button would also be "clicked" by Space on keyup; release it first.
    if (document.activeElement && document.activeElement !== card) document.activeElement.blur();
    if (!event.repeat) onStudyFlip();
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    onStudyNext();
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    onStudyPrev();
  }
}

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
  document.getElementById('study-back-btn').addEventListener('click', goHome);
  document.getElementById('study-card').addEventListener('click', onStudyFlip);
  document.getElementById('study-prev-btn').addEventListener('click', onStudyPrev);
  document.getElementById('study-next-btn').addEventListener('click', onStudyNext);
  document.getElementById('start-test-btn').addEventListener('click', onStartTest);
  document.getElementById('cancel-setup-btn').addEventListener('click', goHome);
  document.getElementById('reveal-btn').addEventListener('click', onReveal);
  document.getElementById('got-it-btn').addEventListener('click', function () { onGrade(true); });
  document.getElementById('missed-it-btn').addEventListener('click', function () { onGrade(false); });
  document.getElementById('quit-test-btn').addEventListener('click', onQuitTest);
  document.getElementById('retry-missed-btn').addEventListener('click', onRetryMissed);
  document.getElementById('test-again-btn').addEventListener('click', onTestAgain);
  document.getElementById('results-home-btn').addEventListener('click', goHome);
  document.addEventListener('keydown', onKeyDown);
  goHome();
}

if (typeof document !== 'undefined' && document.getElementById('app')) {
  init();
}
