import { DEFAULT_RECIPE, normalizeRecipe, recipeFromURL, recipeURL, recipeKey, drawPoster } from './art-engine.mjs';
import { listRecipes, saveRecipe, deleteRecipe } from './art-storage.mjs';
const $ = id => document.getElementById(id);
const canvas = $('art-canvas');
const status = $('studio-status');
const shared = recipeFromURL(location.href);
let recipe = shared ?? { ...DEFAULT_RECIPE };
let pointer = null;
let frame = 0;
let galleryRequest = 0;
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const names = { orbit: '绕个弯', field: '起点风', stack: '叠起来' };
function notify(message) { status.textContent = message; }
function render() {
  frame = 0;
  drawPoster(canvas, recipe, pointer);
  canvas.setAttribute('aria-label', `艺术海报：${recipe.idea}，${names[recipe.style]}，不安分程度 ${recipe.energy}%`);
  $('art-name').textContent = `IDEA / ${recipeKey(recipe).toUpperCase()}`;
}
function scheduleRender() { if (!frame) frame = requestAnimationFrame(render); }
function updateControls() {
  $('idea').value = recipe.idea;
  $('energy').value = recipe.energy;
  $('energy-value').value = `${recipe.energy}%`;
  document.querySelectorAll('[data-style]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.style === recipe.style)));
  document.querySelectorAll('[data-palette]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.palette === recipe.palette)));
}
function updateRecipe(input, message) {
  recipe = normalizeRecipe({ ...recipe, ...input });
  pointer = null;
  $('share-fallback').hidden = true;
  // Avoid leaving a stale share recipe in the URL after edits.
  if (location.search) history.replaceState(null, '', `${location.pathname}${location.hash}`);
  scheduleRender();
  if (message) notify(message);
}
function randomSeed() { return crypto.getRandomValues(new Uint32Array(1))[0]; }
$('idea-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!$('idea').value.trim()) { notify('先留下一点想法，再把它变成图。');$('idea').focus();return; }
  updateRecipe({ idea: $('idea').value, seed: randomSeed() }, '念头接住了。试试换种性格，或划过画面。');
  updateControls();
});
document.querySelectorAll('[data-idea]').forEach(button => button.addEventListener('click', () => {
  updateRecipe({ idea: button.dataset.idea, seed: randomSeed() }, '换一个念头，也换一种纹路。');updateControls();
}));
document.querySelectorAll('[data-style]').forEach(button => button.addEventListener('click', () => {
  updateRecipe({ style: button.dataset.style }, `现在是「${names[button.dataset.style]}」。`);updateControls();
}));
document.querySelectorAll('[data-palette]').forEach(button => button.addEventListener('click', () => {
  updateRecipe({ palette: button.dataset.palette }, '颜色换好了，念头还是你的。');updateControls();
}));
$('energy').addEventListener('input', () => {
  updateRecipe({ energy: $('energy').value });$('energy-value').value = `${recipe.energy}%`;
});
$('remix').addEventListener('click', () => updateRecipe({ seed: randomSeed() }, '又搅出了一种可能。遇到喜欢的，就留下。'));
canvas.addEventListener('pointermove', event => {
  if (motion.matches || event.pointerType === 'touch') return;
  const bounds = canvas.getBoundingClientRect();
  pointer = { x: (event.clientX - bounds.left) / bounds.width, y: (event.clientY - bounds.top) / bounds.height };
  scheduleRender();
});
canvas.addEventListener('pointerleave', () => { pointer = null;scheduleRender(); });
motion.addEventListener('change', () => { pointer = null;scheduleRender(); });
$('download').addEventListener('click', async () => {
  const button = $('download');button.disabled = true;
  try {
    const output = document.createElement('canvas');output.width = 1500;output.height = 1800;
    drawPoster(output, recipe);
    const blob = await new Promise(resolve => output.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('生成下载文件失败，请重试。');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');link.href = url;link.download = `Murphy-idea-${recipeKey(recipe)}.png`;
    document.body.append(link);link.click();link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    notify('怪图已准备好下载，1500 × 1800 PNG。');
  } catch (error) { notify(error.message || '下载没有成功，请再试一次。'); }
  finally { button.disabled = false; }
});
$('share-art').addEventListener('click', async () => {
  const url = recipeURL(recipe, location.href);
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(url);
    notify('配方链接已复制。朋友打开，会看到同一个念头与构图。');
  } catch {
    $('share-fallback').hidden = false;$('share-fallback').open = true;
    $('share-url').value = url;$('share-url').focus();$('share-url').select();
    notify('无法自动复制，请复制下面的配方链接。');
  }
});
async function loadGallery() {
  const request = ++galleryRequest;
  try {
    const rows = await listRecipes();
    if (request !== galleryRequest) return;
    const gallery = $('saved-gallery');gallery.replaceChildren();
    $('saved-count').textContent = rows.length;
    if (!rows.length) {
      const empty = document.createElement('p');empty.className = 'saved-empty';empty.textContent = '遇到喜欢的就留下来。下次来，还在这台设备里。';gallery.append(empty);return;
    }
    for (const row of rows) {
      const item = document.createElement('div');item.className = 'saved-item';
      const restore = document.createElement('button');restore.type = 'button';restore.className = 'saved-restore';restore.setAttribute('aria-label', `恢复海报：${row.recipe.idea}`);
      const thumbnail = document.createElement('canvas');thumbnail.width = 250;thumbnail.height = 300;thumbnail.setAttribute('aria-hidden', 'true');drawPoster(thumbnail, row.recipe);
      const label = document.createElement('span');label.textContent = row.recipe.idea;restore.append(thumbnail, label);
      restore.addEventListener('click', () => {
        updateRecipe(row.recipe, '这个念头回来了，可以继续调整。');updateControls();
        $('idea').focus({ preventScroll: true });canvas.scrollIntoView({ behavior: motion.matches ? 'instant' : 'smooth', block: 'center' });
      });
      const remove = document.createElement('button');remove.type = 'button';remove.className = 'saved-delete';remove.textContent = '×';remove.setAttribute('aria-label', `删除本机收藏：${row.recipe.idea}`);
      remove.addEventListener('click', async () => {
        remove.disabled = true;
        try { await deleteRecipe(row.id);await loadGallery();notify('这个念头已从本机收藏移除。');$('refresh-saved').focus({ preventScroll: true }); }
        catch (error) { notify(error.message);remove.disabled = false; }
      });
      item.append(restore, remove);gallery.append(item);
    }
  } catch (error) {
    if (request !== galleryRequest) return;
    const text = document.createElement('p');text.className = 'saved-empty';text.textContent = error.message;
    $('saved-gallery').replaceChildren(text);
  }
}
$('save-art').addEventListener('click', async () => {
  const button = $('save-art');button.disabled = true;
  try { await saveRecipe(recipe);await loadGallery();notify('留住了，保存在这台设备的浏览器里。清除网站数据会移除收藏。'); }
  catch (error) { notify(error.message); }
  finally { button.disabled = false; }
});
$('refresh-saved').addEventListener('click', loadGallery);
updateControls();
try { render(); } catch { notify('这台浏览器暂时无法绘制画布，请换一个支持 Canvas 的浏览器。'); }
loadGallery();
if (shared) notify('朋友的配方已还原。你也可以接着搅出自己的版本。');
// Render again when fonts finish loading, keeping the exported and on-screen composition aligned.
if (document.fonts) document.fonts.ready.then(scheduleRender);
