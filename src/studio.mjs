import { DEFAULT_ROOM, SEASONS, WEATHER, LIGHTS, normalizeRoom, roomDescription, roomURL, roomFromURL } from './room-state.mjs';
const $ = id => document.getElementById(id);
const STORE = 'murphy-song-room-v1';
let state = { ...DEFAULT_ROOM };
let storageError = false;
const shared = roomFromURL(location.href);
try { const saved = localStorage.getItem(STORE);if (saved) state = normalizeRoom(JSON.parse(saved)); }
catch { storageError = true; }
if (shared) state = shared;
let scene = null;
let starting = false;
let started = false;
let observer;
function notify(message) { $('studio-status').textContent = message; }
function updateControls(syncName = true) {
  if (syncName) $('room-name').value = state.name;$('room-cutaway').checked = state.cutaway;
  for (const key of ['season', 'weather', 'light']) document.querySelectorAll(`button[data-${key}]`).forEach(button => button.setAttribute('aria-pressed', String(button.dataset[key] === state[key])));
  $('room-description').textContent = roomDescription(state);
  $('room-season-note').textContent = SEASONS[state.season].caption;
}
function updateState(changes, message) {
  state = normalizeRoom({ ...state, ...changes });
  if (location.search) history.replaceState(null, '', `${location.pathname}${location.hash}`);
  $('share-fallback').hidden = true;updateControls(Object.hasOwn(changes, 'name'));
  scene?.setState(state);
  if (message) notify(scene ? message : '设置已更新。三维场景载入后会显示，当前为静态预览。');
}
function failure(error) {
  scene?.dispose();scene = null;started = false;
  $('room-fallback').hidden = false;$('room-loading').hidden = false;
  $('room-loading').textContent = '暂时显示静态预览。三维雅间需要浏览器支持 WebGL。';
  $('room-retry').hidden = false;$('room-capture').disabled = true;
  document.querySelectorAll('.room-view-actions button').forEach(button => { button.disabled = true; });
  notify(error.message || '雅间未能载入，可以重新尝试。');
}
async function startScene() {
  if (starting || started) return;
  starting = true;observer?.disconnect();$('room-retry').hidden = true;
  $('room-loading').hidden = false;$('room-loading').textContent = '正在为你开门…';
  try {
    const { mountSongRoom } = await import('./song-scene.mjs');
    scene = mountSongRoom($('room-mount'), state, failure);started = true;
    $('room-fallback').hidden = true;$('room-loading').hidden = true;$('room-capture').disabled = false;
    document.querySelectorAll('.room-view-actions button').forEach(button => { button.disabled = false; });
    observer?.disconnect();
  } catch (error) { failure(error); }
  finally { starting = false; }
}
$('room-retry').addEventListener('click', startScene);
observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) startScene(); }, { rootMargin: '240px' });
observer.observe($('room-viewport'));
$('room-name-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!$('room-name').value.trim()) { notify('先给雅间留一个名字。');$('room-name').focus();return; }
  updateState({ name: $('room-name').value }, '题名已挂上匾额。这个角落，现在有了你的名字。');
});
for (const key of ['season', 'weather', 'light']) document.querySelectorAll(`button[data-${key}]`).forEach(button => button.addEventListener('click', () => {
  const value = button.dataset[key];
  const labels = key === 'season' ? SEASONS[value].name : key === 'weather' ? WEATHER[value] : LIGHTS[value];
  updateState({ [key]: value }, `换成${labels}了。转一转，看看这一刻的雅间。`);
}));
$('room-cutaway').addEventListener('change', () => updateState({ cutaway: $('room-cutaway').checked }, $('room-cutaway').checked ? '屋顶轻轻掀开，茶案和文房就在里面。' : '屋顶合上，回到街角看四季。'));
$('room-reset-view').addEventListener('click', () => { scene?.resetView();notify('视角归位，继续看风景。'); });
$('room-zoom-in').addEventListener('click', () => scene?.zoom(.9));
$('room-zoom-out').addEventListener('click', () => scene?.zoom(1.1));
function applyDraftName() {
  const raw = $('room-name').value;
  if (!raw.trim()) { notify('先给雅间留一个名字。');$('room-name').focus();return false; }
  const name = normalizeRoom({ name: raw }).name;
  if (name !== state.name) updateState({ name });
  return true;
}
$('room-save').addEventListener('click', () => {
  if (!applyDraftName()) return;
  try { localStorage.setItem(STORE, JSON.stringify(state));storageError = false;notify('记住了。下次用这台设备来，还是这间雅室。'); }
  catch { notify('浏览器暂时无法保存。可以分享链接，或把画面下载留存。'); }
});
$('room-share').addEventListener('click', async () => {
  if (!applyDraftName()) return;
  const url = roomURL(state, location.href);
  try {
    if (!navigator.clipboard?.writeText) throw new Error();
    await navigator.clipboard.writeText(url);notify('雅间链接已复制。题名、四季、天气和灯光都一起带上了。');
  } catch {
    $('share-fallback').hidden = false;$('share-fallback').open = true;$('share-url').value = url;$('share-url').focus();$('share-url').select();
    notify('无法自动复制，请复制下面的雅间链接。');
  }
});
$('room-capture').addEventListener('click', async () => {
  if (!scene || !applyDraftName()) return;
  const button = $('room-capture');button.disabled = true;
  try {
    const blob = await scene.capture();const url = URL.createObjectURL(blob);
    const link = document.createElement('a');link.href = url;link.download = `Murphy-song-room-${state.season}-${state.weather}.png`;
    document.body.append(link);link.click();link.remove();setTimeout(() => URL.revokeObjectURL(url), 30000);
    notify('这一帧已准备好下载。把喜欢的季节留住。');
  } catch (error) { notify(error.message || '保存画面失败，请重试。'); }
  finally { button.disabled = !scene; }
});
updateControls();
if (shared) notify('朋友的雅间已还原。你也可以换一场天气。');
else if (storageError) notify('本机设置暂时无法读取，已为你打开默认雅间。');
