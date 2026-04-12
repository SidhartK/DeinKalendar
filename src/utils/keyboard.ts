/**
 * True when focus is in a control where the user types text, so game-wide
 * shortcuts should not handle the key.
 */
export function eventTargetIsTypingField(target: EventTarget | null): boolean {
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) return true;
  if (target instanceof HTMLElement && target.isContentEditable) return true;
  return false;
}
