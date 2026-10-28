import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UserMenu } from './user-menu';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

const signOut = vi.fn().mockResolvedValue(undefined);
const push = vi.fn();
const setTheme = vi.fn();

vi.mock('@clerk/nextjs', () => ({
  useClerk: () => ({ signOut }),
  useUser: () => ({ user: { fullName: 'Ada Lovelace', primaryEmailAddress: { emailAddress: 'ada@example.com' } } }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'system', setTheme }),
}));

function renderMenu() {
  render(
    <TooltipProvider>
      <SidebarProvider>
        <UserMenu />
      </SidebarProvider>
    </TooltipProvider>,
  );
}

/** Radix's DropdownMenu opens on pointerdown, not click. */
function openMenu() {
  const trigger = screen.getByRole('button', { name: 'User menu' });
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' });
}

describe('UserMenu', () => {
  beforeEach(() => {
    signOut.mockClear();
    push.mockClear();
    setTheme.mockClear();
  });

  it('shows the signed-in user with their initials', () => {
    renderMenu();

    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByText('AL')).toBeTruthy();
  });

  it('choosing Dark switches the theme', async () => {
    renderMenu();
    openMenu();

    fireEvent.click(await screen.findByRole('menuitemradio', { name: /dark/i }));

    expect(setTheme).toHaveBeenCalledWith('dark');
  });

  it('Sign out ends the session and goes to /sign-in', async () => {
    renderMenu();
    openMenu();

    fireEvent.click(await screen.findByRole('menuitem', { name: /sign out/i }));

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(push).toHaveBeenCalledWith('/sign-in');
  });
});
