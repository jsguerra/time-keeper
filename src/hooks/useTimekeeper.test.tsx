// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getData, request } from '../lib/api';
import { useTimekeeper } from './useTimekeeper';

vi.mock('../lib/api', () => ({ getData: vi.fn(), request: vi.fn() }));
const empty = { users: [], projects: [], entries: [] };
beforeEach(() => { vi.resetAllMocks(); });
afterEach(cleanup);

it('does not treat a failed initial fetch as an empty loaded workspace', async () => {
  vi.mocked(getData).mockRejectedValue(new Error('Database unavailable'));
  const { result } = renderHook(useTimekeeper);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.hasLoaded).toBe(false);
  expect(result.current.error).toBe('Database unavailable');
});

it('reports a saved mutation with a failed refresh without encouraging a duplicate save', async () => {
  vi.mocked(getData).mockResolvedValueOnce(empty).mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce(empty);
  vi.mocked(request).mockResolvedValue(undefined);
  const { result } = renderHook(useTimekeeper);
  await waitFor(() => expect(result.current.hasLoaded).toBe(true));
  let saved = false;
  await act(async () => { saved = await result.current.mutate('/users', 'POST', { name: 'Alex', ratePence: 1000 }); });
  expect(saved).toBe(true);
  expect(result.current.hasLoaded).toBe(false);
  expect(result.current.error).toContain('Changes were saved');
  expect(request).toHaveBeenCalledTimes(1);
  await act(async () => { await result.current.refresh(); });
  expect(result.current.hasLoaded).toBe(true);
  expect(result.current.error).toBe('');
});

it('keeps a rejected mutation unsuccessful and surfaces its error', async () => {
  vi.mocked(getData).mockResolvedValue(empty);
  vi.mocked(request).mockRejectedValue(new Error('Invalid hourly rate'));
  const { result } = renderHook(useTimekeeper);
  await waitFor(() => expect(result.current.hasLoaded).toBe(true));
  await act(async () => { expect(await result.current.mutate('/users', 'POST', {})).toBe(false); });
  expect(result.current.error).toBe('Invalid hourly rate');
  expect(result.current.busy).toBe(false);
});

it.each([
  ['/timer', 'POST', 'Timer started.'],
  ['/timer/1/stop', 'POST', 'Timer stopped. Time entry saved.'],
  ['/entries/1', 'DELETE', 'Time entry deleted.'],
  ['/users', 'POST', 'Changes saved.'],
])('provides a status announcement for %s', async (path, method, message) => {
  vi.mocked(getData).mockResolvedValue(empty);
  vi.mocked(request).mockResolvedValue(undefined);
  const { result } = renderHook(useTimekeeper);
  await waitFor(() => expect(result.current.hasLoaded).toBe(true));
  await act(async () => { await result.current.mutate(path, method); });
  expect(result.current.status).toBe(message);
});
