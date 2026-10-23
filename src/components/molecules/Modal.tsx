import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from '../atoms/Button';
import styles from './Modal.module.css';

export function Modal({ title, subtitle, onClose, busy, children }: { title: string; subtitle?: string; onClose: () => void; busy: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const opener = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected && !opener.matches(':disabled')) opener.focus();
      else document.getElementById('page-heading')?.focus();
    };
  }, []);
  return <dialog ref={ref} className={styles.modal} tabIndex={-1} aria-labelledby={titleId} aria-describedby={subtitle ? descriptionId : undefined} aria-busy={busy} onKeyDown={event => {
    if (event.key !== 'Tab') return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')]
      .filter(element => element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls.at(-1);
    if (!first) {
      event.preventDefault();
      event.currentTarget.focus();
    } else if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className={styles.modal__heading}><div><h2 id={titleId}>{title}</h2>{subtitle && <p id={descriptionId}>{subtitle}</p>}</div><Button variant="ghost" icon="close" aria-label="Close dialog" disabled={busy} onClick={onClose} /></div>
    {children}
  </dialog>;
}
