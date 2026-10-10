import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ROOM, SEASONS, WEATHER, normalizeRoom, roomURL, roomFromURL, roomDescription } from '../src/room-state.mjs';
test('personal room links preserve Unicode, weather, lighting and open roof', () => {
  const state = { name: '一隅清欢🐈', season: 'winter', weather: 'snow', light: 'night', cutaway: true };
  const link = roomURL(state, 'https://www.ylater.com/?old=1#work');
  assert.deepEqual(roomFromURL(link), state);assert.equal(new URL(link).searchParams.has('old'), false);assert.equal(new URL(link).hash, '#studio');
});
test('all four seasons and four weather modes remain independently selectable', () => {
  for (const season of Object.keys(SEASONS)) for (const weather of Object.keys(WEATHER)) {
    const state = normalizeRoom({ season, weather });assert.equal(state.season, season);assert.equal(state.weather, weather);
    assert.match(roomDescription(state), new RegExp(SEASONS[season].name));
  }
});
test('untrusted settings cannot access inherited keys; names are bounded without splitting emoji', () => {
  assert.deepEqual(normalizeRoom({ season: 'constructor', weather: '__proto__', light: 'invalid', cutaway: 'true' }), DEFAULT_ROOM);
  assert.equal(normalizeRoom({ name: '\n\u0000 ' }).name, DEFAULT_ROOM.name);
  assert.equal(Array.from(normalizeRoom({ name: '🐈'.repeat(20) }).name).length, 8);
  assert.equal(roomFromURL('https://www.ylater.com/#studio'), null);
});
