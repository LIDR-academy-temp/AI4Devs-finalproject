import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { FormDialog, type FormDialogProps } from './form-dialog';
import { ApiError } from '../lib/api-client';

function renderDialog(props: Partial<FormDialogProps> = {}) {
  const onOpenChange = vi.fn();
  const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
  render(
    <FormDialog open onOpenChange={onOpenChange} title="New thing" submitLabel="Create thing" onSubmit={onSubmit} {...props}>
      <label htmlFor="thing-name">Name</label>
      <input id="thing-name" />
    </FormDialog>,
  );
  return { onOpenChange, onSubmit };
}

describe('FormDialog', () => {
  it('renders the title and fields in a dialog, Cancel before the submit action', () => {
    renderDialog({ description: 'Where it goes' });
    const dialog = screen.getByRole('dialog', { name: 'New thing' });

    expect(within(dialog).getByLabelText('Name')).toBeTruthy();
    expect(within(dialog).getByText('Where it goes')).toBeTruthy();
    const buttons = within(dialog)
      .getAllByRole('button')
      .map((b) => b.textContent)
      .filter((label) => label === 'Cancel' || label === 'Create thing');
    expect(buttons).toEqual(['Cancel', 'Create thing']);
  });

  it('Cancel closes without submitting', () => {
    const { onOpenChange, onSubmit } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('Escape closes it', () => {
    const { onOpenChange } = renderDialog();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('the submit action submits the form', () => {
    const { onSubmit } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Create thing' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('the submit action is disabled while saving', () => {
    renderDialog({ pending: true });

    expect(screen.getByRole('button', { name: 'Create thing' })).toHaveProperty('disabled', true);
  });

  it("shows a failed save's reason inside the dialog", () => {
    renderDialog({ error: new ApiError(409, 'that name is taken', '/x') });

    expect(within(screen.getByRole('dialog')).getByText('that name is taken')).toBeTruthy();
  });
});
