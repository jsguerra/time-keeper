// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { EntityForms } from './EntityForms';
import type { AppData } from '../../../shared/models';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(cleanup);
const data: AppData = { users: [{ id: 1, name: 'Alex', ratePence: 4500 }], projects: [{ id: 1, name: 'Design', client: '', ratePence: 7500, color: '#759568' }], entries: [] };

describe('management forms', () => {
  it('converts GBP to integer pence on person creation', async () => {
    const mutate = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();
    render(<EntityForms dialog={{ type: 'user' }} data={data} busy={false} error="" mutate={mutate} onClose={onClose} />);
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Jamie' } });
    fireEvent.change(screen.getByLabelText('Hourly rate (GBP)'), { target: { value: '45.99' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mutate).toHaveBeenCalledWith('/users', 'POST', { name: 'Jamie', ratePence: 4599 });
  });
  it('keeps a project rate blank as null, not zero', async () => {
    const mutate = vi.fn().mockResolvedValue(true);
    render(<EntityForms dialog={{ type: 'project' }} data={data} busy={false} error="" mutate={mutate} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'New project' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(mutate).toHaveBeenCalledWith('/projects', 'POST', { name: 'New project', client: '', ratePence: null, color: '#3b82f6' }));
  });
  it('shows API errors without closing an unsuccessful form', async () => {
    const mutate = vi.fn().mockResolvedValue(false);
    const onClose = vi.fn();
    render(<EntityForms dialog={{ type: 'user', user: data.users[0] }} data={data} busy={false} error="Database unavailable" mutate={mutate} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(mutate).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Database unavailable');
    expect(screen.getByLabelText('Hourly rate (GBP)')).toHaveAccessibleDescription('Used when a project does not have its own rate. Zero is allowed.');
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription('A local profile, no sign-in required.');
  });
  it('prevents manual entries ending before they start', async () => {
    const mutate = vi.fn();
    render(<EntityForms dialog={{ type: 'entry' }} data={data} busy={false} error="" mutate={mutate} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Project'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Person'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '2026-10-20T12:00' } });
    fireEvent.change(screen.getByLabelText('End'), { target: { value: '2026-10-20T11:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(screen.getByRole('alert')).toHaveTextContent('End time must be after start time');
    expect(screen.getByLabelText('Start')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('End')).toHaveAccessibleDescription('End time must be after start time and cannot be in the future.');
    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByText('\u00a375.00/hr')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('End'), { target: { value: '2026-10-20T13:00' } });
    expect(screen.getByLabelText('End')).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
