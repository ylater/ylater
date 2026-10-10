import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeadlineCycle } from '../src/headline-cycle.mjs';
function fixture() {
  const callbacks = new Map();const events = [];let id = 0;
  const cycle = createHeadlineCycle((word, note, manual) => events.push({ word, manual }), { schedule: callback => { callbacks.set(++id, callback);return id; }, cancel: key => callbacks.delete(key) });
  return { cycle, events, callbacks, tick() { const [key, callback] = callbacks.entries().next().value;callbacks.delete(key);callback(); } };
}
test('automatic cycle follows the original four words and manual changes are distinguished', () => {
  const f = fixture();f.cycle.start();f.tick();f.tick();f.cycle.next();f.tick();
  assert.deepEqual(f.events.map(e => e.word), ['好用', '好玩', '清楚', '简单']);
  assert.deepEqual(f.events.map(e => e.manual), [false, false, true, false]);
  assert.equal(f.callbacks.size, 1);
});
test('visibility, focus and user pauses compose without prematurely resuming', () => {
  const f = fixture();f.cycle.start();f.cycle.pause('hidden', true);f.cycle.pause('focus', true);
  assert.equal(f.callbacks.size, 0);f.cycle.pause('hidden', false);assert.equal(f.callbacks.size, 0);
  f.cycle.pause('focus', false);assert.equal(f.callbacks.size, 1);f.cycle.pause('user', true);f.cycle.next();assert.equal(f.callbacks.size, 0);
  assert.equal(f.events.at(-1).word, '好用');
});
test('reset and disposal leave no stray timers', () => {
  const f = fixture();f.cycle.start();f.cycle.next();f.cycle.reset();assert.equal(f.events.at(-1).word, '简单');assert.equal(f.callbacks.size, 1);
  f.cycle.dispose();f.cycle.next();f.cycle.start();assert.equal(f.callbacks.size, 0);
});
