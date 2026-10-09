import { normalizeRecipe, recipeKey } from './art-engine.mjs';
const DATABASE = 'murphy-ideas';
const STORE = 'recipes';
export const MAX_SAVED = 24;
let connection;
async function openDatabase() {
  if (!globalThis.indexedDB) throw new Error('这台浏览器不支持本机收藏，仍可下载怪图。');
  if (!connection) connection = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); connection = null; };
      resolve(db);
    };
    request.onerror = () => { connection = null; reject(new Error('本机收藏暂时不可用，可以先下载怪图。')); };
    request.onblocked = () => { connection = null; reject(new Error('收藏库被旧页面占用，请关闭其他本站标签页后重试。')); };
  });
  return connection;
}
async function transaction(mode, action) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    let result;
    action(tx.objectStore(STORE), value => { result = value; });
    tx.oncomplete = () => resolve(result);
    tx.onerror = tx.onabort = () => reject(new Error('收藏没有保存成功，可能是浏览器存储受限。请下载怪图留存。'));
  });
}
export async function listRecipes() {
  const rows = await transaction('readonly', (store, done) => {
    const request = store.getAll();
    request.onsuccess = () => done(request.result);
  });
  return rows.map(row => ({ id: row.id, savedAt: row.savedAt, recipe: normalizeRecipe(row.recipe) })).sort((a, b) => b.savedAt - a.savedAt);
}
export async function saveRecipe(recipe) {
  const clean = normalizeRecipe(recipe);
  const row = { id: recipeKey(clean), recipe: clean, savedAt: Date.now() };
  await transaction('readwrite', (store, done) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const others = request.result.filter(item => item.id !== row.id).sort((a, b) => b.savedAt - a.savedAt);
      if (others.length >= MAX_SAVED) {
        // Keep existing work intact; a full shelf requires an explicit delete.
        done(false);
        return;
      }
      store.put(row);done(true);
    };
  }).then(saved => { if (!saved) throw new Error(`已经留住 ${MAX_SAVED} 个念头。删去一个，给新的留点位置。`); });
  return row;
}
export async function deleteRecipe(id) {
  await transaction('readwrite', store => store.delete(id));
}
