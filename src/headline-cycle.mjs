export const HEADLINE_WORDS = ['简单', '好用', '好玩', '清楚'];
export const HEADLINE_NOTES = ['把复杂留给系统，把简单留给人。', '能用，还要用着顺手。', '认真之外，也留一点有趣。', '说清楚，想明白，再动手。'];
export function createHeadlineCycle(onChange, { delay = 8000, schedule = setTimeout, cancel = clearTimeout } = {}) {
  let index = 0;let timer = null;let disposed = false;
  const pauses = new Set();
  function stop() { if (timer !== null) cancel(timer);timer = null; }
  function restart() {
    stop();
    if (!disposed && !pauses.size) timer = schedule(() => { timer = null;advance(false); }, delay);
  }
  function advance(manual = true) {
    if (disposed) return;
    index = (index + 1) % HEADLINE_WORDS.length;
    onChange(HEADLINE_WORDS[index], HEADLINE_NOTES[index], manual);
    restart();
  }
  return {
    start: restart, next: () => advance(true),
    pause(reason, paused) { if (paused) pauses.add(reason);else pauses.delete(reason);restart(); },
    reset() { index = 0;onChange(HEADLINE_WORDS[index], HEADLINE_NOTES[index], false);restart(); },
    dispose() { disposed = true;stop(); }
  };
}
