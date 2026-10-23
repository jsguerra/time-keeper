import { Field, fieldControl } from '../atoms/Field';
import { Icon } from '../atoms/Icon';
import type { AppData } from '../../../shared/models';
import type { Period } from '../../lib/format';
import styles from './Filters.module.css';

export interface FilterState {
  period: Period;
  from: string;
  to: string;
  userId: string;
  projectId: string;
}
export function Filters({ filters, data, onChange, onPeriod }: { filters: FilterState; data: AppData; onChange: (patch: Partial<FilterState>) => void; onPeriod: (period: Period) => void }) {
  const errorId = useId();
  const invalidDates = !!(filters.from && filters.to && filters.from > filters.to);
  return <section className={styles.filters} aria-label="Report filters">
    <div className={styles.filters__period}><Icon name="calendar" size={16} /><label className={styles.filters__srOnly} htmlFor="period">Report period</label><select id="period" value={filters.period} onChange={event => onPeriod(event.target.value as Period)}>
      <option value="week">This week</option><option value="month">This month</option><option value="all">All time</option><option value="custom">Custom dates</option>
    </select></div>
    <div className={styles.filters__divider} />
    <label className={styles.filters__srOnly} htmlFor="filter-project">Filter by project</label>
    <select id="filter-project" className={styles.filters__select} value={filters.projectId} onChange={event => onChange({ projectId: event.target.value })}><option value="">All projects</option>{data.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
    <label className={styles.filters__srOnly} htmlFor="filter-person">Filter by person</label>
    <select id="filter-person" className={styles.filters__select} value={filters.userId} onChange={event => onChange({ userId: event.target.value })}><option value="">Everyone</option>{data.users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
    <span className={styles.filters__timezone}>Your local timezone &middot; GBP</span>
    {filters.period === 'custom' && <div className={styles.filters__dates}>
      <Field label="From date">{id => <input id={id} className={fieldControl} type="date" aria-invalid={invalidDates || undefined} aria-describedby={invalidDates ? errorId : undefined} value={filters.from} onChange={event => onChange({ from: event.target.value })} />}</Field>
      <Field label="To date">{id => <input id={id} className={fieldControl} type="date" aria-invalid={invalidDates || undefined} aria-describedby={invalidDates ? errorId : undefined} value={filters.to} onChange={event => onChange({ to: event.target.value })} />}</Field>
      {invalidDates && <p id={errorId} role="alert">From date must not be after to date.</p>}
    </div>}
  </section>;
}
import { useId } from 'react';
