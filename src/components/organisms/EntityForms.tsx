import { useId, useState, type FormEvent } from 'react';
import type { AppData, Project, User } from '../../../shared/models';
import type { Mutate } from '../../hooks/useTimekeeper';
import { localDateTime, money } from '../../lib/format';
import { Button } from '../atoms/Button';
import { Field, fieldControl } from '../atoms/Field';
import { Modal } from '../molecules/Modal';
import styles from './Forms.module.css';

export type DialogState = { type: 'user'; user?: User } | { type: 'project'; project?: Project } | { type: 'entry' } | { type: 'delete'; id: number };
type Props = { dialog: DialogState; data: AppData; mutate: Mutate; busy: boolean; error: string; onClose: () => void };
const toPence = (value: string) => Math.round(Number(value) * 100);

export function EntityForms(props: Props) {
  if (props.dialog.type === 'user') return <UserForm {...props} user={props.dialog.user} />;
  if (props.dialog.type === 'project') return <ProjectForm {...props} project={props.dialog.project} />;
  if (props.dialog.type === 'entry') return <EntryForm {...props} />;
  const id = props.dialog.id;
  return <Modal title="Delete this time entry?" subtitle="This will permanently remove the entry and its cost from your reports." busy={props.busy} onClose={props.onClose}>
    <FormError error={props.error} />
    <div className={styles.form__actions}><Button variant="secondary" disabled={props.busy} onClick={props.onClose}>Cancel</Button><Button variant="danger" disabled={props.busy} onClick={async () => { if (await props.mutate(`/entries/${id}`, 'DELETE')) props.onClose(); }}>{props.busy ? 'Deleting...' : 'Delete entry'}</Button></div>
  </Modal>;
}
function FormError({ error }: { error: string }) {
  return error ? <p role="alert" className={styles.form__error}>{error}</p> : null;
}
function Actions({ busy, editing, onClose }: { busy: boolean; editing: boolean; onClose: () => void }) {
  return <div className={styles.form__actions}><Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving...' : editing ? 'Save changes' : 'Create'}</Button></div>;
}
function UserForm({ user, mutate, busy, error, onClose }: Props & { user?: User }) {
  const [name, setName] = useState(user?.name ?? '');
  const [rate, setRate] = useState(user ? String(user.ratePence / 100) : '');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await mutate(user ? `/users/${user.id}` : '/users', user ? 'PUT' : 'POST', { name, ratePence: toPence(rate) })) onClose();
  }
  return <Modal title={user ? 'Edit person' : 'Add a person'} subtitle="A local profile, no sign-in required." busy={busy} onClose={onClose}>
    <form className={styles.form} onSubmit={submit}>
      <p className={styles.form__hint}>Full name and hourly rate are required.</p>
      <Field label="Full name">{id => <input id={id} autoComplete="name" className={fieldControl} required maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Alex Morgan" />}</Field>
      <Field label="Hourly rate (GBP)" hint="Used when a project does not have its own rate. Zero is allowed.">{(id, hintId) => <input id={id} aria-describedby={hintId} className={fieldControl} type="number" min="0" max="1000000" step="0.01" required value={rate} onChange={event => setRate(event.target.value)} placeholder="50.00" />}</Field>
      <FormError error={error} /><Actions busy={busy} editing={!!user} onClose={onClose} />
    </form>
  </Modal>;
}
function ProjectForm({ project, mutate, busy, error, onClose }: Props & { project?: Project }) {
  const [name, setName] = useState(project?.name ?? '');
  const [client, setClient] = useState(project?.client ?? '');
  const [rate, setRate] = useState(project?.ratePence == null ? '' : String(project.ratePence / 100));
  const [color, setColor] = useState(project?.color ?? '#3b82f6');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await mutate(project ? `/projects/${project.id}` : '/projects', project ? 'PUT' : 'POST', { name, client, color, ratePence: rate === '' ? null : toPence(rate) })) onClose();
  }
  return <Modal title={project ? 'Edit project' : 'Create a project'} subtitle="Give your time a place to belong." busy={busy} onClose={onClose}>
    <form className={styles.form} onSubmit={submit}>
      <p className={styles.form__hint}>Project name is required. Choose a colour or keep the default.</p>
      <Field label="Project name">{id => <input id={id} className={fieldControl} required maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Website redesign" />}</Field>
      <Field label="Client (optional)">{id => <input id={id} className={fieldControl} maxLength={100} value={client} onChange={event => setClient(event.target.value)} placeholder="e.g. Acme Studio" />}</Field>
      <div className={styles.form__row}>
        <Field label="Hourly rate (GBP, optional)" hint="Leave blank to use each person's rate. A project rate overrides it.">{(id, hintId) => <input id={id} aria-describedby={hintId} className={fieldControl} type="number" min="0" max="1000000" step="0.01" value={rate} onChange={event => setRate(event.target.value)} placeholder="Person's rate" />}</Field>
        <Field label="Project colour">{id => <input id={id} className={fieldControl} type="color" value={color} onChange={event => setColor(event.target.value)} />}</Field>
      </div>
      <FormError error={error} /><Actions busy={busy} editing={!!project} onClose={onClose} />
    </form>
  </Modal>;
}
export function AssignmentFields({ data, userId, projectId, setUserId, setProjectId }: { data: AppData; userId: string; projectId: string; setUserId: (value: string) => void; setProjectId: (value: string) => void }) {
  return <>
    <Field label="Project">{id => <select id={id} className={fieldControl} required value={projectId} onChange={event => setProjectId(event.target.value)}><option value="">Select a project</option>{data.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select>}</Field>
    <Field label="Person">{id => <select id={id} className={fieldControl} required value={userId} onChange={event => setUserId(event.target.value)}><option value="">Select a person</option>{data.users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select>}</Field>
  </>;
}
function EntryForm({ data, mutate, busy, error, onClose }: Props) {
  const [userId, setUserId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [start, setStart] = useState(localDateTime(new Date(Date.now() - 3600000)));
  const [end, setEnd] = useState(localDateTime());
  const [validation, setValidation] = useState('');
  const validationId = useId();
  const project = data.projects.find(project => project.id === Number(projectId));
  const user = data.users.find(user => user.id === Number(userId));
  const rate = project?.ratePence ?? user?.ratePence;
  async function submit(event: FormEvent) {
    event.preventDefault();
    const startedAt = new Date(start);
    const endedAt = new Date(end);
    if (!Number.isFinite(startedAt.getTime()) || !Number.isFinite(endedAt.getTime()) || endedAt <= startedAt || endedAt.getTime() > Date.now()) {
      setValidation('End time must be after start time and cannot be in the future.');
      return;
    }
    setValidation('');
    if (await mutate('/entries', 'POST', { userId: Number(userId), projectId: Number(projectId), description, startedAt: startedAt.toISOString(), endedAt: endedAt.toISOString() })) onClose();
  }
  return <Modal title="Add time entry" subtitle="Log work you've already completed. Dates use your local timezone." busy={busy} onClose={onClose}>
    <form className={styles.form} onSubmit={submit}>
      <p className={styles.form__hint}>Project, person, start and end are required. End must be after start and not in the future.</p>
      <AssignmentFields data={data} userId={userId} projectId={projectId} setUserId={setUserId} setProjectId={setProjectId} />
      <Field label="Description (optional)">{id => <input id={id} className={fieldControl} maxLength={500} value={description} onChange={event => setDescription(event.target.value)} placeholder="What did you work on?" />}</Field>
      <div className={styles.form__row}>
        <Field label="Start">{id => <input id={id} className={fieldControl} type="datetime-local" required aria-invalid={validation ? true : undefined} aria-describedby={validation ? validationId : undefined} value={start} onChange={event => { setStart(event.target.value); setValidation(''); }} />}</Field>
        <Field label="End">{id => <input id={id} className={fieldControl} type="datetime-local" required aria-invalid={validation ? true : undefined} aria-describedby={validation ? validationId : undefined} value={end} onChange={event => { setEnd(event.target.value); setValidation(''); }} />}</Field>
      </div>
      {rate !== undefined && <p className={styles.form__hint}>Rate for this entry: <strong>{money(rate)}/hr</strong>. Saved rates never change retrospectively.</p>}
      {validation && <p id={validationId} role="alert" className={styles.form__error}>{validation}</p>}
      <FormError error={error} /><Actions busy={busy} editing={false} onClose={onClose} />
    </form>
  </Modal>;
}
