import { useEffect, useRef, useState } from 'react';
import { AppLayout, type Page } from './components/templates/AppLayout';
import { Button } from './components/atoms/Button';
import { Icon } from './components/atoms/Icon';
import { Timer } from './components/organisms/Timer';
import { EntityForms, type DialogState } from './components/organisms/EntityForms';
import { Filters, type FilterState } from './components/organisms/Filters';
import { EntryTable } from './components/organisms/EntryTable';
import { Dashboard } from './pages/Dashboard';
import { Directory } from './pages/Directory';
import { useTimekeeper } from './hooks/useTimekeeper';
import { dateBounds, filterEntries, type Period } from './lib/format';
import styles from './App.module.css';

function pageFromHash(): Page {
  const hash = window.location.hash.slice(1);
  return hash === 'entries' || hash === 'projects' || hash === 'users' ? hash : 'dashboard';
}
const headings: Record<Page, { title: string; subtitle: string }> = {
  dashboard: { title: 'A little clarity. A lot of possibility.', subtitle: "Your time, your projects, and the bigger picture. All in one place." },
  entries: { title: 'Every hour has a story.', subtitle: 'A running record of the work that moves things forward.' },
  projects: { title: 'Good work, well organised.', subtitle: 'Keep your projects, rates, and progress in one place.' },
  users: { title: 'The people making it happen.', subtitle: 'Your team, their time, and the value they bring.' },
};
export function App() {
  const [page, setPage] = useState<Page>(pageFromHash);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [now, setNow] = useState(Date.now());
  const [filters, setFilters] = useState<FilterState>({ period: 'week', ...dateBounds('week'), userId: '', projectId: '' });
  const { data, loading, hasLoaded, busy, error, status, mutate, refresh } = useTimekeeper();
  const previousPage = useRef(page);
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash !== '#main') setPage(pageFromHash());
    };
    window.addEventListener('hashchange', onHash);
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { window.removeEventListener('hashchange', onHash); window.clearInterval(tick); };
  }, []);
  useEffect(() => {
    const labels: Record<Page, string> = { dashboard: 'Overview', entries: 'Time entries', projects: 'Projects', users: 'People' };
    document.title = `${labels[page]} | Timekeeper`;
    if (previousPage.current !== page) document.getElementById('page-heading')?.focus();
    previousPage.current = page;
  }, [page]);
  function navigate(next: Page) {
    window.location.hash = next;
    setPage(next);
  }
  function onPeriod(period: Period) {
    setFilters(current => ({ ...current, period, ...(period === 'custom' ? {} : dateBounds(period)) }));
  }
  const effectiveFilters = filters.period === 'custom' ? filters : { ...filters, ...dateBounds(filters.period, new Date(now)) };
  const filtered = filterEntries(data.entries, effectiveFilters);
  const canLog = data.users.length > 0 && data.projects.length > 0;
  const isReporting = page === 'dashboard' || page === 'entries';
  const openAdd = () => setDialog(page === 'users' ? { type: 'user' } : page === 'projects' ? { type: 'project' } : { type: 'entry' });
  return <AppLayout page={page} onNavigate={navigate}>
    <div className={styles.app__heading}>
      <div><p className={styles.app__eyebrow}>{page === 'dashboard' ? 'YOUR WORKSPACE, AT A GLANCE' : page === 'entries' ? 'MAKE EVERY HOUR COUNT' : page === 'projects' ? 'A PLACE FOR GOOD WORK' : 'BETTER, TOGETHER'}</p><h1 id="page-heading" tabIndex={-1}>{headings[page].title}</h1><p className={styles.app__subtitle}>{headings[page].subtitle}</p></div>
      <Button icon="plus" disabled={loading || !hasLoaded || busy || (isReporting && !canLog)} onClick={openAdd}>{page === 'users' ? 'Add person' : page === 'projects' ? 'New project' : 'Add time entry'}</Button>
    </div>
    <p role="status" className={styles.app__status}>{status}</p>
    {error && !dialog && <div className={styles.app__error} role="alert"><p>{error}</p><Button variant="secondary" onClick={() => void refresh()} disabled={loading || busy}>Reload data</Button></div>}
    {loading ? <div className={styles.app__loading} role="status">Opening your local workspace...</div> : !hasLoaded ? <p className={styles.app__loading}>Your workspace could not be loaded. Check that the local API is running, then reload data above.</p> : <>
      <Timer data={data} mutate={mutate} busy={busy} now={now} onAddPerson={() => setDialog({ type: 'user' })} onAddProject={() => setDialog({ type: 'project' })} />
      {isReporting && <Filters filters={effectiveFilters} data={data} onChange={patch => setFilters(current => ({ ...current, ...patch }))} onPeriod={onPeriod} />}
      {page === 'dashboard' && <Dashboard data={data} entries={filtered} fromDate={effectiveFilters.from} toDate={effectiveFilters.to} onDelete={id => setDialog({ type: 'delete', id })} onViewAll={() => navigate('entries')} />}
      {page === 'entries' && <><EntryTable entries={filtered.filter(entry => entry.endedAt !== null)} data={data} onDelete={id => setDialog({ type: 'delete', id })} /><p className={styles.app__note}><Icon name="check" size={14} />Completed entries only. Your running timer is displayed above. Dates are grouped by start date.</p></>}
      {(page === 'projects' || page === 'users') && <Directory kind={page} data={data} onEditProject={project => setDialog({ type: 'project', project })} onEditUser={user => setDialog({ type: 'user', user })} onAdd={openAdd} />}
    </>}
    {dialog && <EntityForms key={JSON.stringify(dialog)} dialog={dialog} data={data} mutate={mutate} busy={busy} error={error} onClose={() => setDialog(null)} />}
  </AppLayout>;
}
