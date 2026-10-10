const dialog = document.getElementById('about-dialog');
let lastTrigger = null;
document.querySelectorAll('[data-open="about"]').forEach(button => button.addEventListener('click', () => {
  lastTrigger = button;
  dialog.showModal();
  document.body.classList.add('dialog-open');
  document.dispatchEvent(new CustomEvent('murphy:dialog', { detail: { open: true } }));
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
  document.dispatchEvent(new CustomEvent('murphy:dialog', { detail: { open: false } }));
  lastTrigger?.focus({ preventScroll: true });
});
document.getElementById('year').textContent = new Date().getFullYear();
