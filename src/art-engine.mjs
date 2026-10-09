export const STYLES = ['orbit', 'field', 'stack'];
export const PALETTES = {
  lime: { background: '#c4f465', ink: '#24291e', secondary: '#f7f9ed', accent: '#fb6d43' },
  orange: { background: '#ff7955', ink: '#35281f', secondary: '#fff0dd', accent: '#ddd9fb' },
  blue: { background: '#b9ccff', ink: '#2147d5', secondary: '#f1f5ff', accent: '#eeff8b' },
  mono: { background: '#f2f2eb', ink: '#242720', secondary: '#bbbfb5', accent: '#777d70' }
};
export const DEFAULT_RECIPE = Object.freeze({ idea: '把复杂，玩明白', style: 'orbit', palette: 'lime', energy: 60, seed: 314159 });
export function hashText(text) {
  let hash = 2166136261;
  for (const char of text) { hash ^= char.codePointAt(0); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}
export function randomFromSeed(seed) {
  return () => {
    seed += 0x6D2B79F5;
    let value = seed;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
export function normalizeRecipe(input = {}) {
  const cleanIdea = Array.from(String(input.idea ?? '').normalize('NFC').replace(/[\u0000-\u001f\u007f]/g, '').trim()).slice(0, 36).join('');
  const energy = Number(input.energy);
  const seed = Number(input.seed);
  return {
    idea: cleanIdea || DEFAULT_RECIPE.idea,
    style: STYLES.includes(input.style) ? input.style : DEFAULT_RECIPE.style,
    palette: Object.hasOwn(PALETTES, input.palette) ? input.palette : DEFAULT_RECIPE.palette,
    energy: Number.isFinite(energy) ? Math.max(10, Math.min(100, Math.round(energy))) : DEFAULT_RECIPE.energy,
    seed: Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff ? seed : DEFAULT_RECIPE.seed
  };
}
export function recipeFromURL(value) {
  const url = new URL(value, 'https://www.ylater.com');
  if (!url.searchParams.has('idea')) return null;
  return normalizeRecipe({ idea: url.searchParams.get('idea'), style: url.searchParams.get('style'), palette: url.searchParams.get('palette'), energy: url.searchParams.get('energy') ?? undefined, seed: url.searchParams.get('seed') ?? undefined });
}
export function recipeURL(recipe, base) {
  const url = new URL(base);
  url.search = '';
  const clean = normalizeRecipe(recipe);
  Object.entries(clean).forEach(([key, value]) => url.searchParams.set(key, value));
  url.hash = 'studio';
  return url.href;
}
export function recipeKey(recipe) { return hashText(JSON.stringify(normalizeRecipe(recipe))).toString(16).padStart(8, '0'); }
const FONT = '"Avenir Next", "PingFang SC", "Microsoft YaHei", sans-serif';
function posterLines(ctx, text, maxWidth, fontSize) {
  ctx.font = `750 ${fontSize}px ${FONT}`;
  const lines = [];
  let line = '';
  for (const char of text) {
    if (ctx.measureText(line + char).width > maxWidth && line) { lines.push(line); line = char; }
    else line += char;
  }
  if (line) lines.push(line);
  return lines;
}
export function drawPoster(canvas, input, pointer = null) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');
  const recipe = normalizeRecipe(input);
  const random = randomFromSeed(hashText(recipe.idea) ^ recipe.seed);
  const colors = PALETTES[recipe.palette];
  const energy = recipe.energy / 100;
  ctx.save();
  ctx.setTransform(canvas.width / 1000, 0, 0, canvas.height / 1200, 0, 0);
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, 1000, 1200);
  ctx.fillStyle = colors.ink;
  ctx.font = `500 19px ${FONT}`;
  ctx.fillText('MURPHY / AN ODD LITTLE IDEA', 58, 64);
  ctx.textAlign = 'right';
  ctx.fillText(recipeKey(recipe).toUpperCase(), 942, 64);
  ctx.textAlign = 'left';
  ctx.save();
  ctx.beginPath();ctx.rect(0, 95, 1000, 735);ctx.clip();
  const push = pointer ? { x: (pointer.x - .5) * 85, y: (pointer.y - .5) * 65 } : { x: 0, y: 0 };
  if (recipe.style === 'orbit') {
    const angle = (random() - .5) * .8;
    const count = Math.round(14 + energy * 28);
    ctx.translate(500 + push.x, 450 + push.y);ctx.rotate(angle);
    for (let i = 0; i < count; i++) {
      const phase = i / count;
      ctx.beginPath();
      ctx.ellipse(Math.sin(phase * Math.PI * 2) * 90 * energy, Math.cos(phase * Math.PI * 2) * 75 * energy, 100 + phase * 280, 45 + phase * 190, phase * Math.PI * (1 + energy), 0, Math.PI * 2);
      ctx.strokeStyle = i % 8 === 0 ? colors.secondary : colors.ink;
      ctx.lineWidth = 3 + phase * 4;ctx.stroke();
    }
    ctx.fillStyle = colors.accent;ctx.beginPath();ctx.arc(190, -180, 37 + energy * 26, 0, Math.PI * 2);ctx.fill();
  } else if (recipe.style === 'field') {
    const phase = random() * 10;
    for (let i = 0; i < 42; i++) {
      ctx.beginPath();
      for (let x = -30; x <= 1030; x += 8) {
        const distance = pointer ? Math.max(0, 1 - Math.abs(x / 1000 - pointer.x) * 3) : 0;
        const y = 145 + i * 14 + Math.sin(x / (140 - energy * 70) + i * .13 + phase) * (35 + energy * 95) + Math.cos(x / 240 + phase) * 65 + distance * push.y;
        if (x === -30) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.lineWidth = i % 7 === 0 ? 7 : 2.5;
      ctx.strokeStyle = i % 7 === 0 ? colors.secondary : colors.ink;ctx.stroke();
    }
    ctx.fillStyle = colors.accent;ctx.beginPath();ctx.arc(730 + push.x, 270 + push.y, 45, 0, Math.PI * 2);ctx.fill();
  } else {
    const count = Math.round(10 + energy * 11);
    for (let i = 0; i < count; i++) {
      ctx.save();
      ctx.translate(500 + Math.sin(i * .55) * 95 * energy + push.x * i / count, 200 + i * 22 + push.y * i / count);
      ctx.rotate(Math.sin(i * .25 + random() * .15) * .5 * energy);
      ctx.fillStyle = i % 4 === 0 ? colors.secondary : colors.ink;
      ctx.fillRect(-260 + i * 3, -32, 520 - i * 6, 60);
      ctx.restore();
    }
    ctx.fillStyle = colors.accent;ctx.beginPath();ctx.arc(760, 220, 42, 0, Math.PI * 2);ctx.fill();
  }
  ctx.restore();
  // The poster has a dedicated text zone; its longest supported input fits in three lines.
  const length = Array.from(recipe.idea).length;
  const fontSize = length > 24 ? 51 : length > 12 ? 65 : 81;
  const lines = posterLines(ctx, recipe.idea, 876, fontSize);
  ctx.fillStyle = colors.ink;ctx.textBaseline = 'top';
  lines.forEach((line, i) => ctx.fillText(line, 58, 850 + i * (fontSize * 1.25)));
  ctx.textBaseline = 'alphabetic';ctx.font = `500 17px ${FONT}`;
  ctx.fillText('www.ylater.com', 58, 1148);
  ctx.textAlign = 'right';ctx.fillText('认真造东西，顺手玩一下。', 942, 1148);
  ctx.restore();
}
