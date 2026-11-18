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

test('cardCountLabel pluralises correctly', function () {
  assertEqual(cardCountLabel(1), '1 card');
  assertEqual(cardCountLabel(3), '3 cards');
  assertEqual(cardCountLabel(0), '0 cards');
});

runTests();
