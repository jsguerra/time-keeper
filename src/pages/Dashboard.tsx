import type { AppData, TimeEntry } from '../../shared/models';
import { activityDays, hours, localDate, money, totals } from '../lib/format';
import { StatCard } from '../components/molecules/StatCard';
import { Icon } from '../components/atoms/Icon';
import { EntryTable } from '../components/organisms/EntryTable';
import styles from './Dashboard.module.css';

export function Dashboard({ data, entries, fromDate, toDate, onDelete, onViewAll }: { data: AppData; entries: TimeEntry[]; fromDate: string; toDate: string; onDelete: (id: number) => void; onViewAll: () => void }) {
  const completed = entries.filter(entry => entry.endedAt !== null);
  const total = totals(completed);
  const projectTotals = data.projects.map(project => ({ ...project, ...totals(completed.filter(entry => entry.projectId === project.id)) })).filter(project => project.seconds > 0).sort((a, b) => b.seconds - a.seconds);
  const userTotals = data.users.map(user => ({ ...user, ...totals(completed.filter(entry => entry.userId === user.id)) })).filter(user => user.seconds > 0).sort((a, b) => b.seconds - a.seconds);
  const days = activityDays(completed, fromDate, toDate);
  const max = Math.max(3600, ...days.map(day => day.seconds));
  return <>
    <div className={styles.dashboard__stats}>
      <StatCard label="Total time tracked" value={hours(total.seconds)} note={`${completed.length} completed ${completed.length === 1 ? 'entry' : 'entries'} in this period`} icon="clock" />
      <StatCard label="Total project value" value={money(total.pence)} note="Calculated from saved hourly rates" icon="pound" accent />
      <StatCard label="Projects worked on" value={String(projectTotals.length).padStart(2, '0')} note={`Across ${data.projects.length} projects in your workspace`} icon="folder" />
      <StatCard label="People contributing" value={String(userTotals.length).padStart(2, '0')} note={`${data.users.length} ${data.users.length === 1 ? 'person' : 'people'} in your workspace`} icon="users" />
    </div>
    <div className={styles.dashboard__charts}>
      <section className={styles.dashboard__panel}>
        <div className={styles.dashboard__panelHeading}><div><h2>Time, well spent</h2><p>Daily activity &middot; up to 7 days in this period</p></div><span className={styles.dashboard__legend}><i />Tracked time</span></div>
        <div className={styles.dashboard__chartScroll} role="region" aria-label="Daily activity chart, scroll horizontally to view all days" tabIndex={0}><div className={styles.dashboard__chart} aria-hidden="true">
          <div className={styles.dashboard__axis}><span>{hours(max)}</span><span>{hours(max / 2)}</span><span>0h</span></div>
          <div className={styles.dashboard__bars}>{days.map(({ date, seconds }) => <div className={styles.dashboard__day} key={localDate(date)}>
            <div className={styles.dashboard__barArea}><div className={styles.dashboard__bar} style={{ height: `${seconds / max * 100}%` }}><span>{hours(seconds)}</span></div></div>
            <span className={styles.dashboard__dayLabel}>{date.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
            <span className={styles.dashboard__dayDate}>{date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
          </div>)}</div>
        </div></div>
        <details className={styles.dashboard__data}><summary>View daily activity data</summary>
          <table><caption>Completed hours by start date</caption><thead><tr><th scope="col">Date</th><th scope="col">Hours</th></tr></thead>
            <tbody>{days.map(({ date, seconds }) => <tr key={localDate(date)}><th scope="row">{date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</th><td>{hours(seconds)}</td></tr>)}</tbody>
          </table>
        </details>
        {!completed.length && <p className={styles.dashboard__chartHint}>Your first completed entry is the start of the story.</p>}
      </section>
      <section className={styles.dashboard__panel}>
        <div className={styles.dashboard__panelHeading}><div><h2>By project</h2><p>Where your time is going</p></div><Icon name="folder" size={18} /></div>
        {projectTotals.length ? <div className={styles.dashboard__breakdown}>{projectTotals.map(project => <div key={project.id} className={styles.dashboard__project}>
          <div className={styles.dashboard__projectTop}><span><i style={{ background: project.color }} />{project.name}</span><strong>{hours(project.seconds)}</strong></div>
          <div className={styles.dashboard__track} aria-hidden="true"><span style={{ width: `${project.seconds / total.seconds * 100}%`, background: project.color }} /></div>
          <div className={styles.dashboard__projectBottom}><span>{Math.round(project.seconds / total.seconds * 100)}% of tracked time</span><span>{money(project.pence)}</span></div>
        </div>)}</div> : <div className={styles.dashboard__empty}><Icon name="folder" size={28} /><p>No project time just yet.</p><span>Your project breakdown will grow here.</span></div>}
      </section>
    </div>
    <EntryTable entries={completed.slice(0, 5)} data={data} onDelete={onDelete} onViewAll={onViewAll} />
    <section className={styles.dashboard__team}>
      <div><h2>People, behind the progress</h2><p>Time and value by person in the selected period.</p></div>
      {userTotals.length ? <div className={styles.dashboard__people}>{userTotals.map(user => <article key={user.id} className={styles.dashboard__person}>
        <span className={styles.dashboard__avatar} aria-hidden="true">{user.name.split(' ').slice(0, 2).map(part => part[0]).join('')}</span><div><strong>{user.name}</strong><p>{hours(user.seconds)} tracked</p></div><span>{money(user.pence)}</span>
      </article>)}</div> : <p className={styles.dashboard__teamEmpty}>A shared effort starts with the first hour.</p>}
    </section>
    <div className={styles.dashboard__note}><Icon name="check" size={15} /><p>Time is grouped by its start date. Costs use each entry's saved rate, rounded to the nearest penny. Running timers are excluded until stopped.</p></div>
  </>;
}
