import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Without Vitest's `globals: true`, React Testing Library's own auto-cleanup
// detection (which looks for a global afterEach) never fires, so renders from one
// test leak into the next. Registered explicitly here instead of turning on
// `globals` project-wide, since every test file already imports describe/it/expect
// from 'vitest' directly (Next's own documented convention).
afterEach(() => {
  cleanup();
});

// jsdom doesn't implement scrollIntoView; Radix UI's Select calls it internally
// when opening its listbox. Standard no-op polyfill for testing Radix in jsdom —
// doesn't affect any assertion, just satisfies the missing browser API.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom also lacks ResizeObserver, which Radix's Checkbox and Switch use to measure
// themselves. Same kind of no-op polyfill — no assertion depends on element sizes.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom lacks matchMedia, which the sidebar's useIsMobile and next-themes' system
// detection call. No-op polyfill reporting "no match" (desktop width, light scheme).
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
