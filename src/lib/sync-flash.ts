/** Toggle a one-time sync-updated class to flash a card after a realtime update. */
export function flashCard(el: HTMLElement | null) {
  if (!el) return;
  el.classList.remove("sync-updated");
  // Force reflow so the class re-applies cleanly
  void el.offsetWidth;
  el.classList.add("sync-updated");
  window.setTimeout(() => el.classList.remove("sync-updated"), 1000);
}
