/* FlashNotes — tests.js
 * Tiny harness (test, assert, assertEqual) plus each phase's tests. See ADR 0004.
 * Real data under flashnotes.sets is backed up before the tests and restored afterwards.
 */

/* ===================== Harness ===================== */

var tests = [];

function test(name, fn) {
  tests.push({ name: name, fn: fn });
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

function assertEqual(actual, expected, msg) {
  var a = JSON.stringify(actual);
  var e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error((msg ? msg + '\n' : '') + 'Expected: ' + e + '\nActual:   ' + a);
  }
}

function runTests() {
  var backup = localStorage.getItem(STORAGE_KEY);
  var passed = 0;
  var failed = 0;
  var list = document.getElementById('results');

  tests.forEach(function (t) {
    localStorage.removeItem(STORAGE_KEY);
    var li = document.createElement('li');
    try {
      t.fn();
      passed += 1;
      li.className = 'pass';
      li.textContent = 'PASS  ' + t.name;
    } catch (err) {
      failed += 1;
      li.className = 'fail';
      li.textContent = 'FAIL  ' + t.name;
      var detail = document.createElement('div');
      detail.className = 'err';
      detail.textContent = err && err.message ? err.message : String(err);
      li.appendChild(detail);
    }
    list.appendChild(li);
  });

  if (backup === null) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, backup);

  var summary = document.getElementById('summary');
  summary.textContent = passed + ' passed, ' + failed + ' failed (' + tests.length + ' total)';
  summary.className = failed ? 'fail' : 'pass';
}

/* ===================== Phase 1: storage ===================== */

test('loadSets returns [] when storage is empty', function () {
  assertEqual(loadSets(), []);
});

test('loadSets returns [] when storage holds invalid JSON', function () {
  localStorage.setItem(STORAGE_KEY, '{not json');
  assertEqual(loadSets(), []);
});

test('loadSets returns [] when storage holds JSON that is not an array', function () {
  localStorage.setItem(STORAGE_KEY, '{"a":1}');
  assertEqual(loadSets(), []);
});

test('saveSets then loadSets returns the same data', function () {
  var sets = [{
    id: 's_1', name: 'Spanish', createdAt: 123,
    cards: [{ id: 'c_1', front: 'hablar', back: 'to speak' }]
  }];
  assert(saveSets(sets) === true, 'saveSets should return true');
  assertEqual(loadSets(), sets);
});

/* ===================== Phase 1: validation ===================== */

function errorFields(result) {
  return result.errors.map(function (e) { return e.field; });
}

test('validateSet rejects an empty name', function () {
  var r = validateSet({ name: '', cards: [{ front: 'a', back: 'b' }] });
  assert(!r.ok, 'should be rejected');
  assertEqual(errorFields(r), ['name']);
});

test('validateSet rejects a whitespace-only name', function () {
  var r = validateSet({ name: '   \t ', cards: [{ front: 'a', back: 'b' }] });
  assert(!r.ok, 'should be rejected');
  assertEqual(errorFields(r), ['name']);
});

test('validateSet rejects a set with zero cards', function () {
  var r = validateSet({ name: 'X', cards: [] });
  assert(!r.ok, 'should be rejected');
  assertEqual(errorFields(r), ['cards']);
});

test('validateSet rejects a set whose rows are all blank', function () {
  var r = validateSet({ name: 'X', cards: [{ front: '', back: '' }, { front: '  ', back: ' ' }] });
  assert(!r.ok, 'should be rejected');
  assertEqual(errorFields(r), ['cards']);
});

test('validateSet rejects a card with only one side filled in, and names the row', function () {
  var r = validateSet({
    name: 'X',
    cards: [{ front: 'a', back: 'b' }, { front: 'only front', back: '' }, { front: '', back: 'only back' }]
  });
  assert(!r.ok, 'should be rejected');
  assertEqual(r.errors.map(function (e) { return [e.field, e.row]; }), [['card', 1], ['card', 2]]);
});

test('validateSet ignores rows where both sides are blank', function () {
  var r = validateSet({
    name: 'X',
    cards: [{ front: '', back: '' }, { front: 'a', back: 'b' }, { front: ' ', back: '' }]
  });
  assert(r.ok, 'should be accepted');
  assertEqual(r.value.cards, [{ front: 'a', back: 'b' }]);
});

test('validateSet trims whitespace from name and card text', function () {
  var r = validateSet({ name: '  Spanish  ', cards: [{ front: '  hablar ', back: '\nto speak\t' }] });
  assert(r.ok, 'should be accepted');
  assertEqual(r.value, { name: 'Spanish', cards: [{ front: 'hablar', back: 'to speak' }] });
});

test('validateSet does not change its input', function () {
  var draft = { name: ' X ', cards: [{ front: ' a ', back: ' b ' }] };
  var copy = JSON.stringify(draft);
  validateSet(draft);
  assertEqual(JSON.stringify(draft), copy);
});

/* ===================== Phase 1: create and delete ===================== */

test('createSet gives the set an id and createdAt, and each card an id', function () {
  var r = createSet({ name: 'X', cards: [{ front: 'a', back: 'b' }, { front: 'c', back: 'd' }] }, 1000);
  assert(r.ok, 'should be accepted');
  var set = r.value;
  assert(typeof set.id === 'string' && set.id.indexOf('s_') === 0, 'set id should start with s_');
  assertEqual(set.createdAt, 1000);
  assertEqual(set.name, 'X');
  assertEqual(set.cards.length, 2);
  set.cards.forEach(function (c) {
    assert(typeof c.id === 'string' && c.id.indexOf('c_') === 0, 'card id should start with c_');
  });
});

test('createSet uses the current time when none is given', function () {
  var before = Date.now();
  var r = createSet({ name: 'X', cards: [{ front: 'a', back: 'b' }] });
  var after = Date.now();
  assert(r.value.createdAt >= before && r.value.createdAt <= after, 'createdAt should be now');
});

test('createSet returns errors for an invalid draft', function () {
  var r = createSet({ name: '', cards: [] });
  assert(!r.ok, 'should be rejected');
  assert(r.errors.length > 0, 'should have errors');
});

test('ids are unique even when created in the same millisecond', function () {
  var seen = {};
  for (var i = 0; i < 1000; i++) {
    var id = newId('c_');
    assert(!seen[id], 'duplicate id: ' + id);
    seen[id] = true;
  }
});

test('created sets and cards all get unique ids', function () {
  var cards = [];
  for (var i = 0; i < 50; i++) cards.push({ front: 'f' + i, back: 'b' + i });
  var a = createSet({ name: 'A', cards: cards }).value;
  var b = createSet({ name: 'B', cards: cards }).value;
  var ids = [a.id, b.id].concat(a.cards.map(function (c) { return c.id; }), b.cards.map(function (c) { return c.id; }));
  var seen = {};
  ids.forEach(function (id) {
    assert(!seen[id], 'duplicate id: ' + id);
    seen[id] = true;
  });
});

test('deleteSet removes only that set and does not change the input', function () {
  var sets = [{ id: 's_a', name: 'A', createdAt: 1, cards: [] },
              { id: 's_b', name: 'B', createdAt: 2, cards: [] },
              { id: 's_c', name: 'C', createdAt: 3, cards: [] }];
  var result = deleteSet(sets, 's_b');
  assertEqual(result.map(function (s) { return s.id; }), ['s_a', 's_c']);
  assertEqual(sets.length, 3, 'input should be unchanged');
});

test('create, save, delete round-trip through storage', function () {
  var a = createSet({ name: 'A', cards: [{ front: 'a', back: 'b' }] }).value;
  var b = createSet({ name: 'B', cards: [{ front: 'c', back: 'd' }] }).value;
  saveSets(addSet(addSet(loadSets(), a), b));
  assertEqual(loadSets().length, 2);
  saveSets(deleteSet(loadSets(), a.id));
  var left = loadSets();
  assertEqual(left.map(function (s) { return s.id; }), [b.id]);
});

test('sortNewestFirst orders by createdAt descending without changing input', function () {
  var sets = [{ id: 'a', createdAt: 1 }, { id: 'b', createdAt: 3 }, { id: 'c', createdAt: 2 }];
  assertEqual(sortNewestFirst(sets).map(function (s) { return s.id; }), ['b', 'c', 'a']);
  assertEqual(sets[0].id, 'a', 'input should be unchanged');
});

test('sortNewestFirst puts the later-added set first when createdAt ties', function () {
  var sets = [{ id: 'old', createdAt: 5 }, { id: 'a', createdAt: 9 }, { id: 'b', createdAt: 9 }];
  assertEqual(sortNewestFirst(sets).map(function (s) { return s.id; }), ['b', 'a', 'old']);
});

test('cardCountLabel pluralises correctly', function () {
  assertEqual(cardCountLabel(1), '1 card');
  assertEqual(cardCountLabel(3), '3 cards');
  assertEqual(cardCountLabel(0), '0 cards');
});

/* ===================== Phase 2: study mode ===================== */

function sampleSet(n) {
  var cards = [];
  for (var i = 0; i < n; i++) cards.push({ id: 'c_' + i, front: 'F' + i, back: 'B' + i });
  return { id: 's_x', name: 'Sample', createdAt: 1, cards: cards };
}

test('findSet returns the matching set, or null', function () {
  var sets = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
  assertEqual(findSet(sets, 'b').name, 'B');
  assertEqual(findSet(sets, 'zzz'), null);
});

test('study starts at index 0 showing the front', function () {
  var s = startStudy(sampleSet(3));
  assertEqual(s.index, 0);
  assertEqual(s.flipped, false);
  var v = studyView(s);
  assertEqual(v.text, 'F0');
  assertEqual(v.side, 'Front');
  assertEqual(v.position, 'Card 1 of 3');
});

test('flipping toggles between front and back', function () {
  var s = startStudy(sampleSet(3));
  s = studyFlip(s);
  assertEqual(studyView(s).side, 'Back');
  assertEqual(studyView(s).text, 'B0');
  s = studyFlip(s);
  assertEqual(studyView(s).side, 'Front');
  assertEqual(studyView(s).text, 'F0');
});

test('Next and Prev move between cards', function () {
  var s = startStudy(sampleSet(3));
  s = studyNext(s);
  assertEqual(s.index, 1);
  assertEqual(studyView(s).text, 'F1');
  s = studyNext(s);
  assertEqual(studyView(s).position, 'Card 3 of 3');
  s = studyPrev(s);
  assertEqual(s.index, 1);
});

test('Prev does not move past the first card', function () {
  var s = studyPrev(startStudy(sampleSet(3)));
  assertEqual(s.index, 0);
  assertEqual(studyView(s).canPrev, false);
});

test('Next does not move past the last card', function () {
  var s = startStudy(sampleSet(2));
  s = studyNext(studyNext(studyNext(s)));
  assertEqual(s.index, 1);
  assertEqual(studyView(s).canNext, false);
  assertEqual(studyView(s).canPrev, true);
});

test('moving to another card resets the view to the front', function () {
  var s = studyFlip(startStudy(sampleSet(3)));
  s = studyNext(s);
  assertEqual(s.flipped, false);
  s = studyFlip(s);
  s = studyPrev(s);
  assertEqual(s.flipped, false);
  assertEqual(studyView(s).text, 'F0');
});

test('a single-card set has Prev and Next both disabled', function () {
  var v = studyView(startStudy(sampleSet(1)));
  assertEqual([v.canPrev, v.canNext, v.position], [false, false, 'Card 1 of 1']);
});

test('study functions do not change their input session or set', function () {
  var set = sampleSet(3);
  var setCopy = JSON.stringify(set);
  var s = startStudy(set);
  var sCopy = JSON.stringify(s);
  studyFlip(s); studyNext(s); studyPrev(s); studyView(s);
  assertEqual(JSON.stringify(s), sCopy);
  assertEqual(JSON.stringify(set), setCopy);
});

/* ===================== Phase 3: test mode ===================== */

// Deterministic "random" source for tests: cycles through the given values.
function fakeRand(values) {
  var i = 0;
  return function () { var v = values[i % values.length]; i += 1; return v; };
}

function ids(cards) {
  return cards.map(function (c) { return c.id; });
}

// Grades every card in order: grades[i] true = Got it, false = Missed it.
function runThrough(session, grades) {
  grades.forEach(function (g) { session = gradeCard(revealAnswer(session), g); });
  return session;
}

test('shuffle returns the same cards, same count, without changing the original', function () {
  var cards = sampleSet(10).cards;
  var copy = JSON.stringify(cards);
  var out = shuffle(cards);
  assertEqual(out.length, 10);
  assertEqual(ids(out).slice().sort(), ids(cards).slice().sort());
  assertEqual(JSON.stringify(cards), copy, 'original unchanged');
  assert(out !== cards, 'should return a new array');
});

test('shuffle is a Fisher–Yates shuffle (known order with fixed random values)', function () {
  // rand() = 0 always swaps i with 0: [a,b,c,d] -> i=3:[d,b,c,a] i=2:[c,b,d,a] i=1:[b,c,d,a]
  assertEqual(shuffle(['a', 'b', 'c', 'd'], fakeRand([0])), ['b', 'c', 'd', 'a']);
  // rand() just under 1 swaps i with itself: order unchanged.
  assertEqual(shuffle(['a', 'b', 'c', 'd'], fakeRand([0.999])), ['a', 'b', 'c', 'd']);
});

test('shuffle produces different orders across runs', function () {
  var cards = sampleSet(8).cards;
  var seen = {};
  for (var i = 0; i < 20; i++) seen[ids(shuffle(cards)).join(',')] = true;
  assert(Object.keys(seen).length > 1, 'expected more than one order in 20 shuffles');
});

test('shuffle handles empty and single-item arrays', function () {
  assertEqual(shuffle([]), []);
  assertEqual(shuffle(['x']), ['x']);
});

test('side "front": prompt is the front, answer is the back', function () {
  var card = { id: 'c', front: 'hablar', back: 'to speak' };
  assertEqual(cardSides(card, 'front'), { prompt: 'hablar', answer: 'to speak' });
  var v = testView(startTest([card], 'front'));
  assertEqual([v.prompt, v.answer, v.promptLabel, v.answerLabel], ['hablar', 'to speak', 'Front', 'Back']);
});

test('side "back": prompt is the back, answer is the front', function () {
  var card = { id: 'c', front: 'hablar', back: 'to speak' };
  assertEqual(cardSides(card, 'back'), { prompt: 'to speak', answer: 'hablar' });
  var v = testView(startTest([card], 'back'));
  assertEqual([v.prompt, v.answer, v.promptLabel, v.answerLabel], ['to speak', 'hablar', 'Back', 'Front']);
});

test('startTest shuffles the cards and starts at card 1, answer hidden', function () {
  var cards = sampleSet(4).cards;
  var s = startTest(cards, 'front', fakeRand([0]));
  assertEqual(ids(s.cards), ['c_1', 'c_2', 'c_3', 'c_0']);
  assertEqual([s.index, s.revealed, s.results.length, s.side], [0, false, 0, 'front']);
  assertEqual(testView(s).position, 'Card 1 of 4');
  assertEqual(ids(cards), ['c_0', 'c_1', 'c_2', 'c_3'], 'original cards unchanged');
});

test('revealAnswer shows the answer without moving', function () {
  var s = revealAnswer(startTest(sampleSet(3).cards, 'front'));
  assertEqual([s.revealed, s.index], [true, 0]);
});

test('a card cannot be graded before the answer is revealed', function () {
  var s = startTest(sampleSet(3).cards, 'front');
  var after = gradeCard(s, true);
  assertEqual([after.index, after.results.length], [0, 0]);
});

test('grading moves to the next card and hides the answer', function () {
  var s = gradeCard(revealAnswer(startTest(sampleSet(3).cards, 'front')), true);
  assertEqual([s.index, s.revealed, s.results.length], [1, false, 1]);
  assertEqual(testView(s).position, 'Card 2 of 3');
});

test('Got it / Missed it give the correct score and missed list', function () {
  var s = startTest(sampleSet(5).cards, 'front');
  var order = ids(s.cards);
  s = runThrough(s, [true, false, true, false, true]);
  var score = testScore(s);
  assertEqual(score, { correct: 3, total: 5, percent: 60 });
  assertEqual(formatScore(score), '3 / 5 (60%)');
  assertEqual(ids(missedCards(s)), [order[1], order[3]]);
});

test('score formatting rounds the percentage', function () {
  var s = runThrough(startTest(sampleSet(3).cards, 'front'), [true, true, false]);
  assertEqual(formatScore(testScore(s)), '2 / 3 (67%)');
  s = runThrough(startTest(sampleSet(3).cards, 'front'), [true, true, true]);
  assertEqual(formatScore(testScore(s)), '3 / 3 (100%)');
  assertEqual(missedCards(s), []);
});

test('the session ends after the last card, and no card can be graded twice', function () {
  var s = startTest(sampleSet(3).cards, 'front');
  s = runThrough(s, [true, true, true]);
  assert(isTestDone(s), 'should be done after 3 grades');
  var again = gradeCard(revealAnswer(s), false);
  assertEqual(again.results.length, 3, 'no extra result after the end');
  assertEqual(testScore(again), { correct: 3, total: 3, percent: 100 });
  var graded = ids(s.results.map(function (r) { return r.card; }));
  assertEqual(graded.slice().sort(), ['c_0', 'c_1', 'c_2'], 'each card graded exactly once');
});

test('retry contains only the missed cards, keeps the side, and is reshuffled', function () {
  var s = startTest(sampleSet(6).cards, 'back');
  s = runThrough(s, [false, true, false, true, false, true]);
  var missed = ids(missedCards(s));
  var retry = retryMissed(s, fakeRand([0]));
  assertEqual(retry.side, 'back');
  assertEqual(ids(retry.cards).slice().sort(), missed.slice().sort());
  assertEqual([retry.index, retry.revealed, retry.results.length], [0, false, 0]);
  // with rand = 0, [m0, m1, m2] shuffles to [m1, m2, m0]
  assertEqual(ids(retry.cards), [missed[1], missed[2], missed[0]]);
});

test('retrying until nothing is missed ends with an empty missed list', function () {
  var s = runThrough(startTest(sampleSet(4).cards, 'front'), [false, false, true, false]);
  s = runThrough(retryMissed(s), [true, false, true]);
  assertEqual(missedCards(s).length, 1);
  s = runThrough(retryMissed(s), [true]);
  assertEqual(missedCards(s), []);
  assertEqual(formatScore(testScore(s)), '1 / 1 (100%)');
});

test('test functions do not change their input session', function () {
  var s = startTest(sampleSet(3).cards, 'front');
  var copy = JSON.stringify(s);
  revealAnswer(s); testView(s); testScore(s); missedCards(s);
  var r = revealAnswer(s);
  var rCopy = JSON.stringify(r);
  gradeCard(r, false); retryMissed(r);
  assertEqual(JSON.stringify(s), copy);
  assertEqual(JSON.stringify(r), rCopy);
});

runTests();
