export const SEASONS = {
  spring: { label: '春', name: '春和', caption: '新绿上枝，春光入窗。', leaf: ['#88a36c', '#b4c58b', '#63845f'], sky: ['#e1e6d6', '#9db8ac'] },
  summer: { label: '夏', name: '夏荫', caption: '竹影渐浓，留一席清凉。', leaf: ['#4d805b', '#799c6b', '#365f4b'], sky: ['#d5e6df', '#89abb5'] },
  autumn: { label: '秋', name: '秋闲', caption: '草木染金，茶烟慢慢。', leaf: ['#b68b52', '#d2b074', '#6e8155'], sky: ['#e5dfcd', '#abb5ac'] },
  winter: { label: '冬', name: '冬藏', caption: '天光清冷，一室灯暖。', leaf: ['#788a80', '#a0afa3', '#536e64'], sky: ['#dce5e7', '#9daeb9'] }
};
export const WEATHER = { clear: '晴', rain: '雨', snow: '雪', fog: '雾' };
export const LIGHTS = { day: '朝阳', dusk: '薄暮', night: '夜色' };
export const DEFAULT_ROOM = Object.freeze({ name: '松风雅间', season: 'autumn', weather: 'clear', light: 'dusk', cutaway: false });
const own = (object, key, fallback) => typeof key === 'string' && Object.hasOwn(object, key) ? key : fallback;
export function normalizeRoom(input = {}) {
  const name = Array.from(String(input.name ?? '').normalize('NFC').replace(/[\u0000-\u001f\u007f]/g, '').trim()).slice(0, 8).join('');
  return { name: name || DEFAULT_ROOM.name, season: own(SEASONS, input.season, DEFAULT_ROOM.season), weather: own(WEATHER, input.weather, DEFAULT_ROOM.weather), light: own(LIGHTS, input.light, DEFAULT_ROOM.light), cutaway: input.cutaway === true };
}
export function roomDescription(input) {
  const state = normalizeRoom(input);
  return `${state.name} · ${SEASONS[state.season].name} / ${WEATHER[state.weather]} / ${LIGHTS[state.light]}${state.cutaway ? ' / 雅间近观' : ''}`;
}
export function roomURL(input, base) {
  const state = normalizeRoom(input);const url = new URL(base);
  url.search = '';
  Object.entries({ room: state.name, season: state.season, weather: state.weather, light: state.light, roof: state.cutaway ? 'open' : 'closed' }).forEach(([key, value]) => url.searchParams.set(key, value));
  url.hash = 'studio';return url.href;
}
export function roomFromURL(value) {
  const url = new URL(value, 'https://www.ylater.com');
  if (!url.searchParams.has('room')) return null;
  return normalizeRoom({ name: url.searchParams.get('room'), season: url.searchParams.get('season'), weather: url.searchParams.get('weather'), light: url.searchParams.get('light'), cutaway: url.searchParams.get('roof') === 'open' });
}
