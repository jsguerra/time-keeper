import type { AppData, TimeEntry } from '../../../shared/models';
import { costPence, durationSeconds } from '../../../shared/models';
import { clock, money } from '../../lib/format';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import styles from './EntryTable.module.css';

export function EntryTable({ entries, data, onDelete, onViewAll }: { entries: TimeEntry[]; data: AppData; onDelete: (id: number) => void; onViewAll?: () => void }) {
  return <section className={styles.entries}>
    <div className={styles.entries__heading}><div><h2>{onViewAll ? 'Recent entries' : 'Time entries'} <span>{entries.length}</span></h2><p>{onViewAll ? 'The little things that add up.' : 'A clear record of your completed work.'}</p></div>{onViewAll && <Button variant="ghost" icon="chevron" onClick={onViewAll}>View all entries</Button>}</div>
    {!entries.length ? <div className={styles.entries__empty}><Icon name="clock" size={30} /><h3>A fresh page for your time</h3><p>Completed time entries will appear here. Start a timer or add time manually.</p></div> :
      <div className={styles.entries__scroll} role="region" aria-label="Time entries table, scroll horizontally for all columns" tabIndex={0}><table className={styles.entries__table}>
        <caption className={styles.entries__srOnly}>{onViewAll ? 'Recent completed time entries' : 'Completed time entries'}</caption>
        <thead><tr><th scope="col">PROJECT / DESCRIPTION</th><th scope="col">PERSON</th><th scope="col">DATE</th><th scope="col">DURATION</th><th scope="col">RATE</th><th scope="col">COST</th><th scope="col"><span className={styles.entries__srOnly}>Actions</span></th></tr></thead>
        <tbody>{entries.map(entry => {
          const project = data.projects.find(project => project.id === entry.projectId)!;
          const user = data.users.find(user => user.id === entry.userId)!;
          const seconds = durationSeconds(entry);
          return <tr key={entry.id}>
            <td><div className={styles.entries__project}><span style={{ backgroundColor: project.color }} /><div><strong>{project.name}</strong><p>{entry.description || 'No description'}</p></div></div></td>
            <td><span className={styles.entries__person}><span className={styles.entries__avatar} aria-hidden="true">{user.name.split(' ').slice(0, 2).map(part => part[0]).join('')}</span>{user.name}</span></td>
            <td>{new Date(entry.startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
            <td className={styles.entries__duration}>{clock(seconds)}</td><td>{money(entry.ratePence)}/hr</td><td className={styles.entries__cost}>{money(costPence(seconds, entry.ratePence))}</td>
            <td><Button variant="ghost" icon="trash" aria-label={`Delete ${project.name} entry from ${new Date(entry.startedAt).toLocaleString('en-GB')} by ${user.name}`} onClick={() => onDelete(entry.id)} /></td>
          </tr>;
        })}</tbody>
      </table></div>}
  </section>;
}
