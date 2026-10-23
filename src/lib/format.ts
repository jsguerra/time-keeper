import { costPence, durationSeconds, type TimeEntry } from '../../shared/models';

const currency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
export const money = (pence: number) => currency.format(pence / 100);
export const hours = (seconds: number) => `${(seconds / 3600).toFixed(1)}h`;
export function clock(seconds: number) {
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(value => String(value).padStart(2, '0')).join(':');
}
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function localDateTime(date = new Date()): string {
  return `${localDate(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
export function totals(entries: TimeEntry[]) {
  return entries.reduce((total, entry) => {
    if (entry.endedAt) {
      const seconds = durationSeconds(entry);
      total.seconds += seconds;
      total.pence += costPence(seconds, entry.ratePence);
    }
    return total;
  }, { seconds: 0, pence: 0 });
}
export type Period = 'week' | 'month' | 'all' | 'custom';
export function dateBounds(period: Period, now = new Date()): { from: string; to: string } {
  const start = new Date(now);
  if (period === 'week') start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  if (period === 'month') start.setDate(1);
  return { from: period === 'all' ? '' : localDate(start), to: period === 'all' ? '' : localDate(now) };
}
export function filterEntries(entries: TimeEntry[], filters: { from: string; to: string; userId: string; projectId: string }) {
  return entries.filter(entry => {
    const date = localDate(new Date(entry.startedAt));
    return (!filters.from || date >= filters.from) && (!filters.to || date <= filters.to)
      && (!filters.userId || entry.userId === Number(filters.userId))
      && (!filters.projectId || entry.projectId === Number(filters.projectId));
  });
}

export function activityDays(entries: TimeEntry[], from: string, to: string, now = new Date()) {
  const end = to ? new Date(`${to}T12:00:00`) : now;
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(end);
    date.setDate(date.getDate() - 6 + index);
    return { date, seconds: totals(entries.filter(entry => localDate(new Date(entry.startedAt)) === localDate(date))).seconds };
  }).filter(day => !from || localDate(day.date) >= from);
}
