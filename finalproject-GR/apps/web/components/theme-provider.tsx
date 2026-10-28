'use client';

import type { ComponentProps } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * Light / Dark / System theme (web-ui-foundation). next-themes injects the pre-paint
 * script that applies the stored choice before first render (no wrong-theme flash)
 * and toggles the `.dark` class globals.css's `@custom-variant dark` keys off.
 */
export function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange {...props} />;
}
