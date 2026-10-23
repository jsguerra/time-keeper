import { useCallback, useEffect, useState } from 'react';
import type { AppData } from '../../shared/models';
import { getData, request } from '../lib/api';

export type Mutate = (path: string, method: string, body?: unknown) => Promise<boolean>;
export function useTimekeeper() {
  const [data, setData] = useState<AppData>({ users: [], projects: [], entries: [] });
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const refresh = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      setData(await getData());
      setHasLoaded(true);
    }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to load local data.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const mutate: Mutate = async (path, method, body) => {
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await request(path, method, body);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to save changes.');
      setBusy(false);
      return false;
    }
    try {
      setData(await getData());
      setHasLoaded(true);
      setStatus(path === '/timer' ? 'Timer started.' : path.endsWith('/stop') ? 'Timer stopped. Time entry saved.' : method === 'DELETE' ? 'Time entry deleted.' : 'Changes saved.');
    } catch (error) {
      setHasLoaded(false);
      setError(`Changes were saved, but the workspace could not be refreshed. Reload data before continuing. ${error instanceof Error ? error.message : 'Unable to read local data.'}`);
    } finally { setBusy(false); }
    return true;
  };
  return { data, loading, hasLoaded, busy, error, status, mutate, refresh };
}
