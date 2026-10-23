import type { AppData, Project, User } from '../../shared/models';
import { hours, money, totals } from '../lib/format';
import { Button } from '../components/atoms/Button';
import { Icon } from '../components/atoms/Icon';
import styles from './Directory.module.css';

export function Directory({ kind, data, onEditUser, onEditProject, onAdd }: { kind: 'projects' | 'users'; data: AppData; onEditUser: (user: User) => void; onEditProject: (project: Project) => void; onAdd: () => void }) {
  const entities = kind === 'projects' ? data.projects : data.users;
  return <>
    <div className={styles.directory__intro}><span>{entities.length} {kind === 'projects' ? 'projects' : 'people'} in your workspace</span><span>Lifetime totals &middot; completed entries only</span></div>
    {entities.length ? <div className={styles.directory__grid}>{kind === 'projects' ? data.projects.map(project => {
      const total = totals(data.entries.filter(entry => entry.projectId === project.id));
      return <article className={styles.directory__card} key={project.id}>
        <div className={styles.directory__top}><span className={styles.directory__icon} aria-hidden="true" style={{ background: `${project.color}20` }}><Icon name="folder" size={24} /></span><Button variant="ghost" icon="edit" aria-label={`Edit ${project.name}`} onClick={() => onEditProject(project)} /></div>
        <h2>{project.name}</h2><p>{project.client || 'Independent project'}</p>
        <div className={styles.directory__rate}>{project.ratePence === null ? "Uses person's hourly rate" : `${money(project.ratePence)} / hour`}</div>
        <div className={styles.directory__totals}><div><span>TIME TRACKED</span><strong>{hours(total.seconds)}</strong></div><div><span>PROJECT VALUE</span><strong>{money(total.pence)}</strong></div></div>
      </article>;
    }) : data.users.map(user => {
      const total = totals(data.entries.filter(entry => entry.userId === user.id));
      return <article className={styles.directory__card} key={user.id}>
        <div className={styles.directory__top}><span className={styles.directory__avatar} aria-hidden="true">{user.name.split(' ').slice(0, 2).map(part => part[0]).join('')}</span><Button variant="ghost" icon="edit" aria-label={`Edit ${user.name}`} onClick={() => onEditUser(user)} /></div>
        <h2>{user.name}</h2><p>Local workspace profile</p><div className={styles.directory__rate}>{money(user.ratePence)} / hour</div>
        <div className={styles.directory__totals}><div><span>TIME TRACKED</span><strong>{hours(total.seconds)}</strong></div><div><span>TOTAL VALUE</span><strong>{money(total.pence)}</strong></div></div>
      </article>;
    })}</div> : <section className={styles.directory__empty}><Icon name={kind === 'projects' ? 'folder' : 'users'} size={40} /><h2>{kind === 'projects' ? 'Good work starts with a project.' : 'Make room for your people.'}</h2><p>{kind === 'projects' ? 'Organise your work and give every hour a purpose.' : 'Add the people doing the work and set their hourly rates.'}</p><Button icon="plus" onClick={onAdd}>{kind === 'projects' ? 'Create a project' : 'Add a person'}</Button></section>}
    <p className={styles.directory__note}>Changes to hourly rates apply to new entries only. Existing entries keep their original rate.</p>
  </>;
}
