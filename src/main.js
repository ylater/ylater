const dialog = document.getElementById('about-dialog');
let lastTrigger = null;
document.querySelectorAll('[data-open="about"]').forEach(button => button.addEventListener('click', () => {
  lastTrigger = button;
  dialog.showModal();
  document.body.classList.add('dialog-open');
}));
document.getElementById('about-close').addEventListener('click', () => dialog.close());
// Keep the dialog's short keyboard loop inside the panel, including at the browser chrome boundary.
dialog.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const controls = Array.from(dialog.querySelectorAll('button:not(:disabled), a[href]'));
  const first = controls[0];
  const last = controls.at(-1);
  if (!dialog.contains(document.activeElement) || (!event.shiftKey && document.activeElement === last)) {
    event.preventDefault();first.focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();last.focus();
  }
});

dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
dialog.addEventListener('close', () => {
  document.body.classList.remove('dialog-open');
  lastTrigger?.focus({ preventScroll: true });
});
const mascot = document.getElementById('mascot');
const message = document.getElementById('mascot-message');
const messages = ['别看我发呆，灵感在转。', '这件事，值得绕个弯。', '复杂的交给系统，纸箱留给我。', '认真核验过了：今天适合好奇。'];
let pokes = 0;
let reactionTimer;
function react(text) {
  clearTimeout(reactionTimer);
  mascot.classList.remove('is-poked');
  void mascot.offsetWidth;
  mascot.classList.add('is-poked');
  message.textContent = text;
  reactionTimer = setTimeout(() => mascot.classList.remove('is-poked'), 900);
}
mascot.addEventListener('click', () => react(messages[pokes++ % messages.length]));
document.addEventListener('murphy:pet-react', event => {
  if (event.detail?.kind === 'happy') react('接通啦。事情顺起来，就是舒服。');
});
document.addEventListener('murphy:pet-say', event => {
  if (event.detail?.message) message.textContent = event.detail.message;
});
document.getElementById('year').textContent = new Date().getFullYear();
