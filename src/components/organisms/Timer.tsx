import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { AppData } from '../../../shared/models';
import { durationSeconds } from '../../../shared/models';
import type { Mutate } from '../../hooks/useTimekeeper';
import { clock, money } from '../../lib/format';
import { Button } from '../atoms/Button';
import { Field, fieldControl } from '../atoms/Field';
import { Icon } from '../atoms/Icon';
import { AssignmentFields } from './EntityForms';
import styles from './Timer.module.css';

export function Timer({ data, mutate, busy, now, onAddPerson, onAddProject }: { data: AppData; mutate: Mutate; busy: boolean; now: number; onAddPerson: () => void; onAddProject: () => void }) {
  const [userId, setUserId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const running = data.entries.find(entry => entry.endedAt === null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const wasRunning = useRef(!!running);
  useEffect(() => {
    if (wasRunning.current !== !!running && !busy) {
      actionRef.current?.focus();
      wasRunning.current = !!running;
    }
  }, [running, busy]);
  const project = data.projects.find(project => project.id === Number(projectId));
  const user = data.users.find(user => user.id === Number(userId));
  const rate = project?.ratePence ?? user?.ratePence;
  async function start(event: FormEvent) {
    event.preventDefault();
    if (await mutate('/timer', 'POST', { userId: Number(userId), projectId: Number(projectId), description })) setDescription('');
  }
  if (running) {
    const runningProject = data.projects.find(project => project.id === running.projectId)!;
    const runningUser = data.users.find(user => user.id === running.userId)!;
    return <section className={`${styles.timer} ${styles['timer--running']}`} aria-label="Running timer">
      <div className={styles.timer__runningInfo}><span className={styles.timer__indicator} /><div><p className={styles.timer__eyebrow}>TIMER IS RUNNING</p><strong>{runningProject.name}</strong><p>{runningUser.name} &middot; {money(running.ratePence)}/hr {running.description && ` \u00b7 ${running.description}`}</p></div></div>
      <div className={styles.timer__controls}><span role="timer" aria-live="off" className={styles.timer__clock} aria-label="Elapsed time">{clock(durationSeconds(running, now))}</span><Button ref={actionRef} icon="stop" disabled={busy} onClick={() => void mutate(`/timer/${running.id}/stop`, 'POST')}>Stop timer</Button></div>
      <p className={styles.timer__footnote}>Your timer is saved locally and keeps running if you close this window. Stop it to include it in reports.</p>
    </section>;
  }
  if (!data.users.length || !data.projects.length) return <section className={styles.timer}>
    <div className={styles.timer__welcome}><span className={styles.timer__welcomeIcon}><Icon name="clock" size={25} /></span><div><h2>A little setup. A lot of clarity.</h2><p>Add your people and projects, then start making every hour count.</p></div></div>
    <div className={styles.timer__setup}>
      <Button variant={data.users.length ? 'secondary' : 'primary'} icon={data.users.length ? 'check' : 'plus'} onClick={onAddPerson}>{data.users.length ? 'Add another person' : 'Add your first person'}</Button>
      <Button variant="secondary" icon={data.projects.length ? 'check' : 'plus'} onClick={onAddProject}>{data.projects.length ? 'Add another project' : 'Create your first project'}</Button>
    </div>
  </section>;
  return <section className={styles.timer} aria-label="Track time">
    <div className={styles.timer__heading}><h2><Icon name="clock" size={18} /> Ready when you are.</h2><span>One thing at a time. Make it count.</span></div>
    <p id="timer-help" className={styles.timer__footnote}>Project and person are required. Description is optional.</p>
    <form onSubmit={start} className={styles.timer__form} aria-describedby="timer-help">
      <Field label="Description (optional)">{id => <input id={id} className={fieldControl} value={description} maxLength={500} onChange={event => setDescription(event.target.value)} placeholder="What are you working on?" />}</Field>
      <AssignmentFields data={data} userId={userId} projectId={projectId} setUserId={setUserId} setProjectId={setProjectId} />
      <Button ref={actionRef} icon="play" type="submit" disabled={busy}>{busy ? 'Starting...' : 'Start timer'}</Button>
    </form>
    {rate !== undefined && <p className={styles.timer__footnote}>This session will use {money(rate)}/hr{project?.ratePence != null ? ' (project rate)' : ' (person rate)'}.</p>}
  </section>;
}
