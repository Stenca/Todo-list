export function getElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Element "${selector}" not found`);
  }
  return element;
}
