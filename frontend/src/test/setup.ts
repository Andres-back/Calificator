import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: () => ({
    matches: false,
    media: '',
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return false; },
  }),
});

class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  configurable: true,
  value: TestResizeObserver,
});

window.scrollTo = () => undefined;
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value() {},
});

Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
  configurable: true,
  value() {},
});

Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
  configurable: true,
  value() {},
});

Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
  configurable: true,
  value() { return true; },
});
Object.defineProperty(document, 'elementFromPoint', {
  configurable: true,
  value: () => null,
});