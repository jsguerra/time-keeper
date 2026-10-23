import { describe, expect, it } from 'vitest';
import type { TimeEntry } from '../../shared/models';
import { costPence, durationSeconds } from '../../shared/models';
import { activityDays, clock, dateBounds, filterEntries, hours, localDate, money, totals } from './format';

const entry: TimeEntry = { id: 1, userId: 1, projectId: 1, description: '', startedAt: new Date(2026, 9, 20, 10).toISOString(), endedAt: new Date(2026, 9, 20, 11, 30).toISOString(), ratePence: 7500 };
describe('time, money and reporting', () => {
  it('formats GBP, fractional hours and long durations', () => {
    expect(money(11250)).toBe('\u00a3112.50');
    expect(hours(5400)).toBe('1.5h');
    expect(clock(360001)).toBe('100:00:01');
  });
  it('rounds each entry to the nearest penny rather than using floating currency totals', () => {
    expect(costPence(1, 5000)).toBe(1);
    const short = { ...entry, endedAt: new Date(Date.parse(entry.startedAt) + 1000).toISOString(), ratePence: 5000 };
    expect(totals([short, short, short])).toEqual({ seconds: 3, pence: 3 });
  });
  it('excludes running timers from final totals', () => {
    expect(totals([entry, { ...entry, endedAt: null }])).toEqual({ seconds: 5400, pence: 11250 });
    expect(durationSeconds({ ...entry, endedAt: null }, Date.parse(entry.startedAt) - 1000)).toBe(0);
  });
  it('includes the full end date and combines date, project and user filters', () => {
    const entries = [entry, { ...entry, id: 2, userId: 2 }, { ...entry, id: 3, projectId: 2 }];
    expect(filterEntries(entries, { from: '2026-10-20', to: '2026-10-20', userId: '1', projectId: '1' })).toEqual([entry]);
    expect(filterEntries(entries, { from: '2026-10-21', to: '', userId: '', projectId: '' })).toEqual([]);
    expect(filterEntries(entries, { from: '', to: '', userId: '', projectId: '' })).toHaveLength(3);
  });
  it('uses local start date for overnight entries', () => {
    const overnight = { ...entry, startedAt: new Date(2026, 9, 20, 23, 30).toISOString(), endedAt: new Date(2026, 9, 21, 1).toISOString() };
    expect(filterEntries([overnight], { from: '2026-10-20', to: '2026-10-20', userId: '', projectId: '' })).toHaveLength(1);
    expect(localDate(new Date(2026, 0, 2))).toBe('2026-01-02');
  });
  it('starts weeks on Monday, including Sunday and month boundaries', () => {
    expect(dateBounds('week', new Date(2026, 10, 1))).toEqual({ from: '2026-10-26', to: '2026-11-01' });
    expect(dateBounds('month', new Date(2026, 9, 23))).toEqual({ from: '2026-10-01', to: '2026-10-23' });
    expect(dateBounds('all')).toEqual({ from: '', to: '' });
  });
  it('restricts activity bars to the selected dates with at most seven days', () => {
    expect(activityDays([entry], '2026-10-20', '2026-10-20').map(day => day.seconds)).toEqual([5400]);
    expect(activityDays([entry], '2026-10-01', '2026-10-23')).toHaveLength(7);
    expect(activityDays([entry], '2026-10-24', '2026-10-23')).toHaveLength(0);
  });
});
