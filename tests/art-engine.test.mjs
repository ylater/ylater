import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRecipe, recipeFromURL, recipeURL, recipeKey, randomFromSeed, DEFAULT_RECIPE } from '../src/art-engine.mjs';
test('shared recipes preserve Unicode, punctuation, seed and all controls', () => {
  const recipe = { idea: '今天不按套路来 & #? 橘🐈', style: 'stack', palette: 'orange', energy: 99, seed: 0xffffffff };
  const url = recipeURL(recipe, 'https://www.ylater.com/?old=value#work');
  assert.deepEqual(recipeFromURL(url), recipe);
  assert.equal(new URL(url).hash, '#studio');assert.equal(new URL(url).searchParams.has('old'), false);
});
test('untrusted URL parameters are constrained to supported render settings', () => {
  const value = recipeFromURL('https://www.ylater.com/?idea=test&style=constructor&palette=__proto__&energy=Infinity&seed=-1');
  assert.deepEqual(value, { ...DEFAULT_RECIPE, idea: 'test' });
  assert.equal(normalizeRecipe({ energy: 999 }).energy, 100);
  assert.equal(normalizeRecipe({ energy: -10 }).energy, 10);
  assert.equal(normalizeRecipe({ seed: 1.5 }).seed, DEFAULT_RECIPE.seed);
});
test('empty and control-only inputs recover gracefully; emoji are not split', () => {
  assert.equal(normalizeRecipe({ idea: '\n\u0000 ' }).idea, DEFAULT_RECIPE.idea);
  assert.equal(Array.from(normalizeRecipe({ idea: '🐈'.repeat(40) }).idea).length, 36);
  assert.equal(recipeFromURL('https://www.ylater.com/#studio'), null);
});
test('a shared seed produces the same geometry, and remix changes the recipe identity', () => {
  const a = randomFromSeed(234);const b = randomFromSeed(234);const c = randomFromSeed(235);
  const values = Array.from({ length: 40 }, () => a());
  assert.deepEqual(values, Array.from({ length: 40 }, () => b()));
  assert.notDeepEqual(values, Array.from({ length: 40 }, () => c()));
  assert.ok(values.every(value => value >= 0 && value < 1));
  assert.notEqual(recipeKey(DEFAULT_RECIPE), recipeKey({ ...DEFAULT_RECIPE, seed: 1 }));
});
