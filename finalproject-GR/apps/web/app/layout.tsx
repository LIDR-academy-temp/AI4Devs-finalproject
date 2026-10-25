import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import { Geist, Geist_Mono } from 'next/font/google';
import { cn } from '@/lib/utils';
import { QueryProvider } from '@/components/query-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'QA Automation Platform',
  description: 'Railgun QA Platform',
};

/**
 * Clerk's hosted sign-in/up use our theme tokens directly, so they follow the accent
 * and switch with `.dark` without a separate Clerk theme package.
 */
const clerkAppearance = {
  variables: {
    colorPrimary: 'var(--primary)',
    colorPrimaryForeground: 'var(--primary-foreground)',
    colorBackground: 'var(--card)',
    colorForeground: 'var(--card-foreground)',
    colorMutedForeground: 'var(--muted-foreground)',
    colorInput: 'var(--background)',
    colorInputForeground: 'var(--foreground)',
    colorBorder: 'var(--border)',
    colorDanger: 'var(--destructive)',
    fontFamily: 'var(--font-sans)',
    borderRadius: 'var(--radius)',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      {/* next-themes sets the theme class on <html> before hydration. */}
      <html lang="en" className={cn('font-sans', geist.variable, geistMono.variable)} suppressHydrationWarning>
        <body>
          <ThemeProvider>
            <TooltipProvider>
              <QueryProvider>{children}</QueryProvider>
            </TooltipProvider>
            <Toaster richColors position="bottom-right" />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
